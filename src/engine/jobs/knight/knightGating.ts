import type { Skill } from "../../../types/skill";
import type { SimSnapshot } from "../../../types/state";
import type { KnightJobEffects } from "../../../data/knight/types";
import { skills } from "../../../data/knight/skills";
import { isComboSuccess } from "../../potency";
import { isBuffActive } from "./knightState";

// このスコープ(与ダメージ関連アクションのみ)ではオウスゲージ/スタックを消費するアクションが
// ないため、時限式のjobState正規化は不要(何もしない)。将来ミティゲーション系アクションを
// 追加する際はここにリーパーのnormalizeTimedStateと同様の処理を追加する。
export function normalizeTimedState(snapshot: SimSnapshot, _elapsedTime: number): SimSnapshot {
  return snapshot;
}

// アトーンメントコンボ(バフゲート)とコンフィテオル以降のコンボ(コア側comboStepゲート)の
// 両方をここで解決する。
export function matchesSlotCondition(condition: string, snapshot: SimSnapshot, elapsedTime: number): boolean {
  switch (condition) {
    case "supplicationReady":
    case "sepulchreReady":
      return isBuffActive(snapshot.buffs[condition], elapsedTime);
    case "bladeOfFaith":
    case "bladeOfTruth":
    case "bladeOfValor":
      return isComboSuccess(skills[condition], snapshot, elapsedTime);
    case "bladeOfHonorReady":
      return isBuffActive(snapshot.buffs.bladeOfHonorReady, elapsedTime);
    default:
      return false;
  }
}

export function isResourceUnavailable(skill: Skill<KnightJobEffects>, snapshot: SimSnapshot, elapsedTime: number): string {
  const flags = skill.requirements?.flags;
  if (!flags) {
    return "";
  }
  // すべてのflagsキーは「同名のバフが有効であること」を表す(ゴアブレード実行可/ロイエ実行可/
  // ゲベート実行可/グラブカッマー実行可/コンフィテオル実行可/ブレード・オブ・オナー実行可)。
  for (const [key, required] of Object.entries(flags)) {
    if (required && !isBuffActive(snapshot.buffs[key], elapsedTime)) {
      return `${skill.name}の発動条件を満たしていません`;
    }
  }
  return "";
}

// requirements(発動条件)を持つアクションは条件を満たした時点で、コンボ継続アクションは
// コンボが繋がる時点で強調する。ハイブリッドの単純なデフォルト実装(リーパーほどの個別
// チューニングはまだ行っていない)。
export function isRecommended(
  skill: Skill<KnightJobEffects>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  resourceReason?: string,
): boolean {
  const unavailable = resourceReason !== undefined ? resourceReason : isResourceUnavailable(skill, snapshot, elapsedTime);
  if (unavailable) {
    return false;
  }
  if (skill.requirements) {
    return true;
  }
  return isComboSuccess(skill, snapshot, elapsedTime);
}
