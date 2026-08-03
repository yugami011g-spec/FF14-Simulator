import type { SimSettings, SimSnapshot, StatusEffect } from "../types/state";
import type { HistoryEntry, ReplayEntry, SkillUseEntry, WaitEntry } from "../types/history";
import type { JobDefinition } from "../types/job";
import type { Skill } from "../types/skill";
import { DEFAULT_ANIMATION_LOCK, roundTime } from "./time";
import { calculatePotency, getNextComboStep, isComboRelevant, isComboSuccess } from "./potency";
import { getAvailableCharges, getEffectiveGcdRecast, getSkillReadyAt, spendCharge } from "./cooldowns";
import { getResourceUnavailableReason, getUnavailableReason, requiresTarget } from "./gating";
import { applyEffectHistoryOps, applyEffects, attributePotencyToEffectHistory, isEffectActive } from "./effects";

export function initialSnapshot(settings: SimSettings, job: JobDefinition<any>): SimSnapshot {
  const startTime = roundTime(-settings.leadInDuration);
  const gauges: Record<string, number> = {};
  for (const gaugeDef of job.gaugeDefs) {
    gauges[gaugeDef.key] = 0;
  }
  return {
    elapsedTime: startTime,
    totalPotency: 0,
    comboStep: 0,
    comboExpiresAt: 0,
    gauges,
    jobState: job.initialJobState,
    gcdReadyAt: startTime,
    actionReadyAt: startTime,
    cooldowns: {},
    chargeReadyTimes: {},
    buffs: {},
    debuffs: {},
  };
}

interface StepResult {
  snapshot: SimSnapshot;
  elapsedTime: number;
  effectHistory: StatusEffect[];
  entry: SkillUseEntry | null;
  failed: boolean;
}

// 旧 useSkill を、React state を直接mutateしない純粋関数として再構成したものです。
// elapsedTimeIn は呼び出し側(replay の畳み込みループ)で既に「自然な到達時刻」まで
// 前進させてある想定で、ここでは個別リキャスト/チャージ/ゲート判定と着弾処理だけを行います。
function stepSkill(
  entryId: string,
  skill: Skill<any>,
  elapsedTimeIn: number,
  preserveLanding: boolean,
  snapshot: SimSnapshot,
  effectHistoryIn: StatusEffect[],
  settings: SimSettings,
  job: JobDefinition<any>,
): StepResult {
  // ゲージなど時間経過では解消しない条件は、時刻を進める前に判定します。
  const resourceReason = getResourceUnavailableReason(skill, snapshot, elapsedTimeIn, settings, job);
  if (resourceReason) {
    return { snapshot, elapsedTime: elapsedTimeIn, effectHistory: effectHistoryIn, entry: null, failed: true };
  }

  // 共通GCD／アクション硬直だけを考慮した場合の到達時刻(個別リキャストは含まない)。
  const naturalReadyAt = Math.max(
    snapshot.actionReadyAt,
    skill.gcd ? snapshot.gcdReadyAt : -settings.leadInDuration,
  );
  // 個別リキャスト／チャージも含めた、実際にこのスキルが使える時刻。
  const readyAt = getSkillReadyAt(skill, snapshot, elapsedTimeIn, settings.leadInDuration);

  if (readyAt > naturalReadyAt) {
    return { snapshot, elapsedTime: elapsedTimeIn, effectHistory: effectHistoryIn, entry: null, failed: true };
  }

  let elapsedTime = elapsedTimeIn;
  if (readyAt > elapsedTime) {
    elapsedTime = roundTime(readyAt);
  }

  const unavailableReason = getUnavailableReason(skill, snapshot, elapsedTime, settings, job);
  if (unavailableReason) {
    return { snapshot, elapsedTime, effectHistory: effectHistoryIn, entry: null, failed: true };
  }

  const castTimeEnhancement = skill.castTimeEnhancedBy ? snapshot.buffs[skill.castTimeEnhancedBy] : undefined;
  const hasCastTimeEnhancement = isEffectActive(castTimeEnhancement, elapsedTime);
  const castTime = hasCastTimeEnhancement ? 0 : skill.castTime || 0;

  let castStartAt: number;
  if (preserveLanding) {
    castStartAt = roundTime(elapsedTime - castTime);
  } else {
    // 助走区間中に対象必須のスキルを押した場合、押した時刻に関わらず0秒にちょうど着弾させます。
    const isPrePullSnap = requiresTarget(skill) && elapsedTime < 0;
    castStartAt = isPrePullSnap ? roundTime(-castTime) : elapsedTime;
    elapsedTime = isPrePullSnap ? 0 : roundTime(castStartAt + castTime);
  }

  const comboSuccess = isComboSuccess(skill, snapshot, elapsedTime);
  const potency = calculatePotency(skill, snapshot, elapsedTime, job);

  let effectHistory = attributePotencyToEffectHistory(effectHistoryIn, elapsedTime, potency);

  const nextComboStep = getNextComboStep(skill, snapshot, elapsedTime);
  const comboExpiresAt = isComboRelevant(skill)
    ? (nextComboStep === 0 ? 0 : roundTime(elapsedTime + 30))
    : snapshot.comboExpiresAt;

  let working: SimSnapshot = {
    ...snapshot,
    totalPotency: snapshot.totalPotency + potency,
    comboStep: nextComboStep,
    comboExpiresAt,
  };

  const effectsResult = applyEffects(skill, working, elapsedTime);
  working = { ...working, buffs: effectsResult.buffs, debuffs: effectsResult.debuffs };
  effectHistory = applyEffectHistoryOps(effectHistory, effectsResult.ops);

  working = job.applyJobEffects(skill, working, elapsedTime, comboSuccess, settings.leadInDuration);

  const usedAt = elapsedTime;
  const animationLock = skill.animationLock ?? DEFAULT_ANIMATION_LOCK;
  // 詠唱系(castTimeあり)のモーション硬直は詠唱中に完了しているとみなし、着弾後に追加の硬直は発生させない。
  const actionReadyAt = castTime > 0 ? usedAt : roundTime(usedAt + animationLock);
  const clipping =
    skill.type === "ability" && working.gcdReadyAt > usedAt
      ? Math.max(0, roundTime(actionReadyAt - working.gcdReadyAt))
      : 0;

  let gcdReadyAt = working.gcdReadyAt;
  if (skill.gcd) {
    gcdReadyAt = roundTime(castStartAt + getEffectiveGcdRecast(skill, settings));
  }

  let chargeReadyTimes = working.chargeReadyTimes;
  let cooldowns = working.cooldowns;
  if (skill.maxCharges) {
    chargeReadyTimes = spendCharge(skill, working, elapsedTime, castStartAt);
  } else if (skill.recast) {
    cooldowns = { ...cooldowns, [skill.cooldownGroup || skill.id]: roundTime(castStartAt + skill.recast) };
  }

  const finalSnapshot: SimSnapshot = { ...working, actionReadyAt, gcdReadyAt, chargeReadyTimes, cooldowns, elapsedTime };

  const entry: SkillUseEntry = {
    id: entryId,
    kind: "skill",
    skillId: skill.id,
    skillName: skill.name,
    usedAt,
    castStartAt,
    type: skill.type,
    potency,
    comboSuccess,
    charges: getAvailableCharges(skill, finalSnapshot, elapsedTime),
    clipping,
    snapshot: finalSnapshot,
  };

  return { snapshot: finalSnapshot, elapsedTime, effectHistory, entry, failed: false };
}

export interface ReplayOptions {
  finalElapsedTime?: number;
}

export interface ReplayResult {
  history: HistoryEntry[];
  final: SimSnapshot;
  finalElapsedTime: number;
  effectHistory: StatusEffect[];
  droppedNames: string[];
  message: string;
}

// entries(唯一の真実)から、履歴・最終状態・効果履歴を毎回ゼロから再構築します(旧 rebuildFromHistory)。
// モジュールグローバルを一切mutateしない、決定的な純粋関数です。
export function replay(
  entries: ReplayEntry[],
  settings: SimSettings,
  job: JobDefinition<any>,
  options: ReplayOptions = {},
): ReplayResult {
  let snapshot = initialSnapshot(settings, job);
  let elapsedTime = snapshot.elapsedTime;
  let effectHistory: StatusEffect[] = [];
  const history: HistoryEntry[] = [];
  const droppedNames: string[] = [];

  for (const entry of entries) {
    if (entry.kind === "wait") {
      const startAt = elapsedTime;
      elapsedTime = roundTime(startAt + entry.duration);
      const waitSnapshot: SimSnapshot = { ...snapshot, elapsedTime };
      const lastEntry = history[history.length - 1];
      if (lastEntry && lastEntry.kind === "wait" && lastEntry.endAt === startAt) {
        const merged: WaitEntry = {
          ...lastEntry,
          duration: roundTime(lastEntry.duration + entry.duration),
          endAt: elapsedTime,
          snapshot: waitSnapshot,
        };
        history[history.length - 1] = merged;
      } else {
        history.push({ id: entry.id, kind: "wait", usedAt: startAt, duration: entry.duration, endAt: elapsedTime, snapshot: waitSnapshot });
      }
      continue;
    }

    const skill = job.skills[entry.skillId];
    if (!skill) {
      droppedNames.push(entry.skillId);
      continue;
    }

    const preAdvanced = entry.preserveTiming
      ? Math.max(elapsedTime, entry.usedAt)
      : Math.max(elapsedTime, getSkillReadyAt(skill, snapshot, elapsedTime, settings.leadInDuration));

    const result = stepSkill(entry.id, skill, preAdvanced, entry.preserveTiming, snapshot, effectHistory, settings, job);
    snapshot = result.snapshot;
    elapsedTime = result.elapsedTime;
    effectHistory = result.effectHistory;
    if (result.failed || !result.entry) {
      droppedNames.push(skill.name);
      continue;
    }
    history.push(result.entry);
  }

  if (options.finalElapsedTime !== undefined) {
    elapsedTime = Math.max(elapsedTime, options.finalElapsedTime);
  }

  return {
    history,
    final: { ...snapshot, elapsedTime },
    finalElapsedTime: elapsedTime,
    effectHistory,
    droppedNames,
    message: droppedNames.length ? `編集の影響で実行できなくなり削除されました: ${droppedNames.join("、")}` : "",
  };
}

// history(replayの出力)から、指定時刻時点のスナップショットを逆引きします(旧 getSnapshotAt)。
export function findSnapshotAt(history: HistoryEntry[], time: number, initial: SimSnapshot): SimSnapshot {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].usedAt <= time) {
      return { ...history[i].snapshot, elapsedTime: time };
    }
  }
  return { ...initial, elapsedTime: time };
}
