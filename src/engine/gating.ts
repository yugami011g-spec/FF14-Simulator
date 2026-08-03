import type { ActionSlot, Skill } from "../types/skill";
import type { SimSettings, SimSnapshot } from "../types/state";
import type { JobDefinition } from "../types/job";
import { getCooldownRemaining, getSkillReadyAt } from "./cooldowns";
import { roundTime } from "./time";

// 枠(base)に対して、現在の状態で表示・実行すべきスキルを返します(旧 getActiveSlotSkill)。
// ジョブ非依存: job.matchesSlotCondition が各条件の解決を担う。
export function getActiveSlotSkill(
  job: JobDefinition<any>,
  slot: ActionSlot,
  snapshot: SimSnapshot,
  elapsedTime: number,
): Skill<any> {
  const activeVariant = slot.variants.find((variant) => job.matchesSlotCondition(variant.condition, snapshot, elapsedTime));
  return activeVariant ? job.skills[activeVariant.skillId] : job.skills[slot.base];
}

export function requiresTarget(skill: Skill<any>): boolean {
  return !skill.noTarget;
}

// combatDuration超過だけはコア側で判定し、それ以外(ゲージ/スタック/バフ条件)はジョブへ委譲します。
export function getResourceUnavailableReason(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  settings: SimSettings,
  job: JobDefinition<any>,
): string {
  if (settings.combatDuration > 0 && elapsedTime >= settings.combatDuration) {
    return "戦闘時間終了後は使用できません";
  }
  return job.isResourceUnavailable(skill, snapshot, elapsedTime);
}

export function getUnavailableReason(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  settings: SimSettings,
  job: JobDefinition<any>,
): string {
  const actionRemaining = roundTime(snapshot.actionReadyAt - elapsedTime);
  if (actionRemaining > 0) {
    return `硬直中（あと${actionRemaining.toFixed(2)}秒）`;
  }

  if (skill.gcd) {
    const gcdRemaining = roundTime(snapshot.gcdReadyAt - elapsedTime);
    if (gcdRemaining > 0) {
      return `GCD中（あと${gcdRemaining.toFixed(2)}秒）`;
    }
  }

  const cooldownRemaining = getCooldownRemaining(skill, snapshot, elapsedTime, settings.leadInDuration);
  if (cooldownRemaining > 0) {
    return `リキャスト中（あと${cooldownRemaining.toFixed(2)}秒）`;
  }

  const resourceReason = getResourceUnavailableReason(skill, snapshot, elapsedTime, settings, job);
  if (resourceReason) {
    return resourceReason;
  }

  return "";
}

export function canUseSkill(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  settings: SimSettings,
  job: JobDefinition<any>,
): boolean {
  return getUnavailableReason(skill, snapshot, elapsedTime, settings, job) === "";
}

// ライブクリック(タイムライン末尾への通常追加)専用の判定。旧 useSkill の最初の2つのゲート
// (資源チェック→個別リキャスト/チャージがGCD/硬直による自然な待機の範囲内かのチェック)を
// 追加前の事前検証として再現する。GCD/硬直中は(旧仕様通り)自動で待つものとして拒否しないが、
// 個別リキャスト/チャージがそれより先にしか空かない場合は拒否する(replay() 内の undo/delete/move/
// insert 用の詰め直しはこれとは別に常に個別リキャストの空き時刻まで自動で待つ、より寛容な挙動を取る)。
export function getLiveAppendRejectionReason(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTimeIn: number,
  settings: SimSettings,
  job: JobDefinition<any>,
): string {
  const resourceReason = getResourceUnavailableReason(skill, snapshot, elapsedTimeIn, settings, job);
  if (resourceReason) {
    return resourceReason;
  }

  const naturalReadyAt = Math.max(
    snapshot.actionReadyAt,
    skill.gcd ? snapshot.gcdReadyAt : -settings.leadInDuration,
  );
  const readyAt = getSkillReadyAt(skill, snapshot, elapsedTimeIn, settings.leadInDuration);
  if (readyAt > naturalReadyAt) {
    const cooldownRemaining = roundTime(readyAt - elapsedTimeIn);
    return `リキャスト中（あと${cooldownRemaining.toFixed(2)}秒）`;
  }

  const elapsedTime = readyAt > elapsedTimeIn ? roundTime(readyAt) : elapsedTimeIn;
  return getUnavailableReason(skill, snapshot, elapsedTime, settings, job);
}
