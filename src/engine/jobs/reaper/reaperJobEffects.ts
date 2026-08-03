import type { Skill } from "../../../types/skill";
import type { JobStateEntry, SimSnapshot } from "../../../types/state";
import type { ReaperJobEffects } from "../../../data/reaper/types";
import { roundTime } from "../../time";
import { createTimedBuff } from "../../effects";
import { isBuffActive, withoutKeys } from "./reaperState";

function clampGauge(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function asCounter(entry: JobStateEntry | undefined): { value: number; expiresAt?: number } {
  return entry && entry.kind === "counter" ? entry : { value: 0 };
}

// ゲージ消費/獲得、妖異の鎌・処刑人・レムール・ヴォイドのスタック管理、シュラウド突入/離脱、
// コンボモード、クールダウン短縮、死の供物蓄積までを一括で適用します(旧 applyGaugeChanges + applyJobEffects)。
// 呼び出し順の注意: 元実装は「ゲージ変化→宣言的effects適用→jobEffects」の順だったが、
// 現行のリーパーデータでは宣言的effectsとゲージ/jobEffectsが同一スキル内で干渉しないため、
// ここでゲージ計算とjobEffects処理をまとめて1関数にしても結果は同一になる。
export function applyJobEffects(
  skill: Skill<ReaperJobEffects>,
  snapshotIn: SimSnapshot,
  elapsedTime: number,
  comboSuccess: boolean,
  leadInDuration: number,
): SimSnapshot {
  let gauges = snapshotIn.gauges;
  let buffs = snapshotIn.buffs;
  let cooldowns = snapshotIn.cooldowns;

  if (skill.gaugeCost) {
    gauges = { ...gauges, soul: clampGauge((gauges.soul ?? 0) - (skill.gaugeCost.soul || 0)) };
    const hasEnshroudReady = skill.id === "enshroud" && isBuffActive(buffs.enshroudReady, elapsedTime);
    const shroudCost = hasEnshroudReady ? 0 : skill.gaugeCost.shroud || 0;
    gauges = { ...gauges, shroud: clampGauge((gauges.shroud ?? 0) - shroudCost) };
  }
  if (skill.gaugeGain && (!skill.gaugeGainOnCombo || comboSuccess)) {
    gauges = {
      ...gauges,
      soul: clampGauge((gauges.soul ?? 0) + (skill.gaugeGain.soul || 0)),
      shroud: clampGauge((gauges.shroud ?? 0) + (skill.gaugeGain.shroud || 0)),
    };
  }

  const effects = skill.jobEffects || {};
  let soulReaver = asCounter(snapshotIn.jobState.soulReaver);
  let executioner = asCounter(snapshotIn.jobState.executioner);

  if (skill.gcd && !effects.soulReaverCost && soulReaver.value > 0) {
    soulReaver = { value: 0, expiresAt: 0 };
  }
  if (skill.gcd && !effects.executionerCost && executioner.value > 0) {
    executioner = { value: 0, expiresAt: 0 };
  }
  if (effects.soulReaverSet !== undefined) {
    soulReaver = { value: effects.soulReaverSet, expiresAt: effects.soulReaverSet ? roundTime(elapsedTime + 30) : 0 };
  }
  if (effects.executionerSet !== undefined) {
    executioner = { value: effects.executionerSet, expiresAt: effects.executionerSet ? roundTime(elapsedTime + 30) : 0 };
  }
  soulReaver = { ...soulReaver, value: Math.max(0, soulReaver.value - (effects.soulReaverCost || 0)) };
  executioner = { ...executioner, value: Math.max(0, executioner.value - (effects.executionerCost || 0)) };
  if (soulReaver.value === 0) soulReaver = { ...soulReaver, expiresAt: 0 };
  if (executioner.value === 0) executioner = { ...executioner, expiresAt: 0 };

  let lemure = asCounter(snapshotIn.jobState.lemure).value;
  let voidStacks = asCounter(snapshotIn.jobState.void).value;
  lemure = Math.max(0, lemure - (effects.lemureCost || 0));
  voidStacks = Math.max(0, Math.min(5, voidStacks + (effects.voidGain || 0) - (effects.voidCost || 0)));

  let enshroudUntil = asCounter(snapshotIn.jobState.enshroudUntil).value;
  let sacrificiumReady = snapshotIn.jobState.sacrificiumReady?.kind === "flag" ? snapshotIn.jobState.sacrificiumReady.active : false;
  let reapingCombo = snapshotIn.jobState.reapingCombo?.kind === "mode" ? snapshotIn.jobState.reapingCombo.value : null;

  if (effects.enterEnshroud) {
    lemure = 5;
    voidStacks = 0;
    enshroudUntil = roundTime(elapsedTime + 30);
    sacrificiumReady = true;
    reapingCombo = null;
    buffs = withoutKeys(buffs, ["enshroudReady", "perfectioReady"]);
  }
  if (effects.reapingComboSet) {
    reapingCombo = effects.reapingComboSet;
  }
  if (effects.consumeSacrificium) {
    sacrificiumReady = false;
  }
  if (effects.exitEnshroud || lemure === 0) {
    lemure = 0;
    voidStacks = 0;
    enshroudUntil = 0;
    sacrificiumReady = false;
    reapingCombo = null;
  }

  // reduceCooldown(例: ハルパーによるヘルズイングレス/イーグレスの再使用時間短縮)は、
  // 消費対象のバフ(ハルパー効果アップ)が実際に付与されていた場合だけ適用する
  // (公式ジョブガイドいわく、この短縮は「ハルパー効果アップ」を消費した強化ハルパー限定の効果のため)。
  let hadActiveConsumedBuff = true;
  if (effects.consumeBuff) {
    hadActiveConsumedBuff = isBuffActive(buffs[effects.consumeBuff], elapsedTime);
    buffs = withoutKeys(buffs, [effects.consumeBuff]);
  }
  if (effects.reduceCooldown && hadActiveConsumedBuff) {
    const currentReadyAt = cooldowns[effects.reduceCooldown.group] ?? -leadInDuration;
    cooldowns = {
      ...cooldowns,
      [effects.reduceCooldown.group]: Math.max(elapsedTime, roundTime(currentReadyAt - effects.reduceCooldown.amount)),
    };
  }
  if (effects.applyPersistentBuff) {
    buffs = {
      ...buffs,
      [effects.applyPersistentBuff.id]: {
        type: "buff",
        id: effects.applyPersistentBuff.id,
        name: effects.applyPersistentBuff.name,
        showOnTimeline: false,
        appliedAt: elapsedTime,
        expiresAt: Number.MAX_SAFE_INTEGER,
      },
    };
  }

  let immortalSacrifice = asCounter(snapshotIn.jobState.immortalSacrifice).value;
  if (effects.consumeImmortalSacrifice) {
    immortalSacrifice = 0;
  }
  if (effects.grantEnshroudReady) {
    buffs = { ...buffs, enshroudReady: createTimedBuff("enshroudReady", "レムールシュラウド実行可", 30, elapsedTime) };
  }
  if (effects.grantPerfectioPending) {
    buffs = { ...buffs, perfectioPending: createTimedBuff("perfectioPending", "ペルフェクティオ待機", 30, elapsedTime) };
  }
  if (effects.promotePerfectio && isBuffActive(buffs.perfectioPending, elapsedTime)) {
    buffs = withoutKeys(buffs, ["perfectioPending"]);
    buffs = { ...buffs, perfectioReady: createTimedBuff("perfectioReady", "ペルフェクティオ実行可", 30, elapsedTime) };
  }

  const sacrificeCircle = buffs.circleOfSacrifice;
  if (skill.type !== "ability" && skill.id !== "plentifulHarvest" && isBuffActive(sacrificeCircle, elapsedTime)) {
    immortalSacrifice = Math.min(8, immortalSacrifice + 1);
  }

  return {
    ...snapshotIn,
    gauges,
    buffs,
    cooldowns,
    jobState: {
      ...snapshotIn.jobState,
      soulReaver: { kind: "counter", value: soulReaver.value, expiresAt: soulReaver.expiresAt ?? 0 },
      executioner: { kind: "counter", value: executioner.value, expiresAt: executioner.expiresAt ?? 0 },
      lemure: { kind: "counter", value: lemure },
      void: { kind: "counter", value: voidStacks },
      enshroudUntil: { kind: "counter", value: enshroudUntil },
      sacrificiumReady: { kind: "flag", active: sacrificiumReady },
      reapingCombo: { kind: "mode", value: reapingCombo },
      immortalSacrifice: { kind: "counter", value: immortalSacrifice },
    },
  };
}

// dynamicPotency: "immortalSacrifice" (プレンティフルハーベスト) の実威力計算。
export function resolveDynamicPotency(tag: string, snapshot: SimSnapshot): number {
  if (tag !== "immortalSacrifice") {
    return 0;
  }
  const stacks = asCounter(snapshot.jobState.immortalSacrifice).value;
  return 720 + Math.max(0, stacks - 1) * 40;
}
