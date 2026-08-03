import type { Skill } from "../../../types/skill";
import type { SimSnapshot } from "../../../types/state";
import type { ReaperJobEffects } from "../../../data/reaper/types";
import { counterValue, counterExpiry, flagActive, isBuffActive, isEnshrouded } from "./reaperState";

// 時限式のスタック/状態(妖異の鎌・処刑人・レムール一式)が期限切れなら0/falseへ戻します。
// ゲート判定・スロット条件判定の前に毎回呼び出してください(旧 normalizeTimedJobState)。
export function normalizeTimedState(snapshot: SimSnapshot, elapsedTime: number): SimSnapshot {
  let jobState = snapshot.jobState;

  const soulReaverExpiresAt = counterExpiry(snapshot, "soulReaver");
  if (soulReaverExpiresAt && soulReaverExpiresAt <= elapsedTime) {
    jobState = { ...jobState, soulReaver: { kind: "counter", value: 0, expiresAt: 0 } };
  }

  const executionerExpiresAt = counterExpiry(snapshot, "executioner");
  if (executionerExpiresAt && executionerExpiresAt <= elapsedTime) {
    jobState = { ...jobState, executioner: { kind: "counter", value: 0, expiresAt: 0 } };
  }

  const enshroudUntil = counterValue(snapshot, "enshroudUntil");
  if (enshroudUntil && enshroudUntil <= elapsedTime) {
    jobState = {
      ...jobState,
      enshroudUntil: { kind: "counter", value: 0 },
      lemure: { kind: "counter", value: 0 },
      void: { kind: "counter", value: 0 },
      sacrificiumReady: { kind: "flag", active: false },
    };
  }

  return jobState === snapshot.jobState ? snapshot : { ...snapshot, jobState };
}

export function matchesSlotCondition(condition: string, snapshot: SimSnapshot, elapsedTime: number): boolean {
  switch (condition) {
    case "enshrouded":
      return isEnshrouded(snapshot, elapsedTime);
    case "executioner":
      return counterValue(snapshot, "executioner") > 0;
    case "perfectioReady":
      return isBuffActive(snapshot.buffs.perfectioReady, elapsedTime);
    case "soulSow":
      return isBuffActive(snapshot.buffs.soulSow, elapsedTime);
    case "enhancedGibbet":
      return isBuffActive(snapshot.buffs.enhancedGibbet, elapsedTime);
    case "enhancedGallows":
      return isBuffActive(snapshot.buffs.enhancedGallows, elapsedTime);
    default:
      return false;
  }
}

export function isResourceUnavailable(
  skill: Skill<ReaperJobEffects>,
  snapshotRaw: SimSnapshot,
  elapsedTime: number,
): string {
  const snapshot = normalizeTimedState(snapshotRaw, elapsedTime);
  const gauges = snapshot.gauges;

  const soulCost = skill.gaugeCost?.soul || 0;
  if (soulCost > (gauges.soul ?? 0)) {
    return `ソウルゲージ不足（必要${soulCost}）`;
  }

  const hasEnshroudReady = skill.id === "enshroud" && isBuffActive(snapshot.buffs.enshroudReady, elapsedTime);
  const shroudCost = skill.gaugeCost?.shroud || 0;
  if (!hasEnshroudReady && shroudCost > (gauges.shroud ?? 0)) {
    return `シュラウドゲージ不足（必要${shroudCost}）`;
  }

  const requirements = skill.requirements || {};
  const enshrouded = isEnshrouded(snapshot, elapsedTime);
  if (skill.unavailableDuringEnshroud && enshrouded) {
    return "レムール中は実行不可";
  }
  if (requirements.flags?.enshrouded && !enshrouded) {
    return "レムール状態が必要";
  }
  if (requirements.flags?.notEnshrouded && enshrouded) {
    return "すでにレムール状態です";
  }

  const soulReaverStacks = counterValue(snapshot, "soulReaver");
  if ((requirements.stacks?.soulReaver || 0) > soulReaverStacks) {
    return "妖異の鎌が必要";
  }
  const executionerStacks = counterValue(snapshot, "executioner");
  if ((requirements.stacks?.executioner || 0) > executionerStacks) {
    return "処刑人が必要";
  }
  const lemureStacks = counterValue(snapshot, "lemure");
  if ((requirements.stacks?.lemure || 0) > lemureStacks) {
    return `レムールスタック不足（必要${requirements.stacks?.lemure}）`;
  }
  const voidStacks = counterValue(snapshot, "void");
  if ((requirements.stacks?.void || 0) > voidStacks) {
    return `ヴォイドスタック不足（必要${requirements.stacks?.void}）`;
  }
  const immortalSacrificeStacks = counterValue(snapshot, "immortalSacrifice");
  if ((requirements.stacks?.immortalSacrifice || 0) > immortalSacrificeStacks) {
    return `死の供物不足（必要${requirements.stacks?.immortalSacrifice}）`;
  }

  if (requirements.buff) {
    const buff = snapshot.buffs[requirements.buff];
    if (!isBuffActive(buff, elapsedTime)) {
      return `${skill.name}の実行条件を満たしていません`;
    }
  }
  if (requirements.buffAbsent) {
    const buff = snapshot.buffs[requirements.buffAbsent];
    if (isBuffActive(buff, elapsedTime)) {
      return `${buff.name}の効果中は実行不可`;
    }
  }
  if (requirements.flags?.sacrificium && !flagActive(snapshot, "sacrificiumReady")) {
    return "サクリフィキウム実行不可";
  }

  return "";
}
