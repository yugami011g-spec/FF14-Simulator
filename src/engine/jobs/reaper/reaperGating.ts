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

// normalizeTimedState済みのsnapshotを前提に判定する内部実装。isResourceUnavailableと
// isRecommendedの両方から呼ばれるため、normalizeTimedStateの二重実行を避けるために切り出して
// いる(呼び出し側が既に正規化済みのsnapshotを持っている場合はこちらを直接使う)。
function isResourceUnavailableNormalized(skill: Skill<ReaperJobEffects>, snapshot: SimSnapshot, elapsedTime: number): string {
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

export function isResourceUnavailable(skill: Skill<ReaperJobEffects>, snapshotRaw: SimSnapshot, elapsedTime: number): string {
  return isResourceUnavailableNormalized(skill, normalizeTimedState(snapshotRaw, elapsedTime), elapsedTime);
}

// スキルの「実行可否」とは別に、実機の推奨アクション強調表示(光るリング)を再現する判定です。
// 詳細は .company/engineering/docs/reaper-action-highlight-spec.md の実機観察メモを参照。
// resourceReasonを渡すと、呼び出し側(SkillButton等)が既に計算済みの実行不可理由を再利用でき、
// isResourceUnavailableの再実行を省ける(省略時は内部で計算する。既存の呼び出し・テストと
// 互換)。
export function isRecommended(
  skill: Skill<ReaperJobEffects>,
  snapshotRaw: SimSnapshot,
  elapsedTime: number,
  resourceReason?: string,
): boolean {
  const snapshot = normalizeTimedState(snapshotRaw, elapsedTime);
  const unavailable = resourceReason !== undefined ? resourceReason : isResourceUnavailableNormalized(skill, snapshot, elapsedTime);
  if (unavailable) {
    return false;
  }

  // ジビトゥ／ギャロウズ／エクス系: 妖異の鎌・処刑人スタックで発動条件を満たした直後は両方、
  // 対応する威力アップバフ(ジビトゥ/ギャロウズ効果アップ)が付いたら以降はそちらのみ強調
  // (ヴォイド/クロスリーパーと同じ「発動条件を満たす→バフで片方に絞られる」パターン)。
  if (skill.buffEnhancedBy) {
    const eitherEnhanceBuffActive =
      isBuffActive(snapshot.buffs.enhancedGibbet, elapsedTime) || isBuffActive(snapshot.buffs.enhancedGallows, elapsedTime);
    if (!eitherEnhanceBuffActive) {
      return true;
    }
    return isBuffActive(snapshot.buffs[skill.buffEnhancedBy], elapsedTime);
  }

  // ハルパー: 「ハルパー効果アップ」(詠唱時間短縮バフ)が付いている間は強調。
  if (skill.castTimeEnhancedBy) {
    const ids = Array.isArray(skill.castTimeEnhancedBy) ? skill.castTimeEnhancedBy : [skill.castTimeEnhancedBy];
    return ids.some((id) => isBuffActive(snapshot.buffs[id], elapsedTime));
  }

  // ヴォイド／クロスリーパー: レムール突入直後(モード未確定)は両方、以降は対応モードのみ強調。
  if (skill.enhancedBy === "void" || skill.enhancedBy === "cross") {
    const mode = snapshot.jobState.reapingCombo?.kind === "mode" ? snapshot.jobState.reapingCombo.value : null;
    return mode === null || mode === skill.enhancedBy;
  }

  // コムニオ: レムールスタックがちょうど1(このレムール周回の最後)の時だけ強調。
  if (skill.id === "communio") {
    return counterValue(snapshot, "lemure") === 1;
  }

  // それ以外: ゲージコストや実行条件(requirements)を持つアクションは、実行可能になった
  // 時点で強調する(プレンティフルハーベスト等の発動条件付きアクション全般を含む)。
  return Boolean(skill.requirements) || Boolean(skill.gaugeCost);
}
