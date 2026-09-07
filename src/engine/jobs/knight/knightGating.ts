import type { Skill } from "../../../types/skill";
import type { SimSettings, SimSnapshot } from "../../../types/state";
import type { KnightJobEffects } from "../../../data/knight/types";
import { skills } from "../../../data/knight/skills";
import { isComboSuccess } from "../../potency";
import { computeOathGauge, counterExpiry, getOathAnchor, isBuffActive } from "./knightState";

// isRecommendedにsettingsが渡されなかった場合のフォールバック(useSimulator.tsのDEFAULT_SETTINGSと
// 同じオートアタック間隔)。SkillButton.tsxからの通常呼び出しでは常にsettingsが渡されるため、
// これは主にsettingsを渡さないテスト/呼び出し向けの保険。
const FALLBACK_SETTINGS: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5, autoAttackInterval: 2.08 };

// レクイエスカットのスタック(jobStateのcounter)が期限切れなら0へ戻す(リーパーの
// soulReaver/executionerと同じパターン)。スタックを使い切った場合はknightJobEffects.ts側で
// 即座に0へ落とすため、このリセットは「スタックを使い切らないまま30秒経過した」場合の
// 保険として働く。
export function normalizeTimedState(snapshot: SimSnapshot, elapsedTime: number): SimSnapshot {
  const requiescatExpiresAt = counterExpiry(snapshot, "requiescat");
  if (requiescatExpiresAt && requiescatExpiresAt <= elapsedTime) {
    return { ...snapshot, jobState: { ...snapshot.jobState, requiescat: { kind: "counter", value: 0, expiresAt: 0 } } };
  }
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

export function isResourceUnavailable(
  skill: Skill<KnightJobEffects>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  settings: SimSettings,
): string {
  const oathCost = skill.gaugeCost?.oath;
  if (oathCost) {
    const current = computeOathGauge(getOathAnchor(snapshot), elapsedTime, settings.autoAttackInterval);
    if (current < oathCost) {
      return `オウスゲージ不足（必要${oathCost}）`;
    }
  }

  const flags = skill.requirements?.flags;
  if (flags) {
    // すべてのflagsキーは「同名のバフが有効であること」を表す(ゴアブレード実行可/ロイエ実行可/
    // ゲベート実行可/グラブカッマー実行可/コンフィテオル実行可/ブレード・オブ・オナー実行可)。
    for (const [key, required] of Object.entries(flags)) {
      if (required && !isBuffActive(snapshot.buffs[key], elapsedTime)) {
        return `${skill.name}の発動条件を満たしていません`;
      }
    }
  }
  return "";
}

// requirements(発動条件)・gaugeCostを持つアクションは条件を満たした時点で、コンボ継続
// アクションはコンボが繋がる時点で強調する。ハイブリッドの単純なデフォルト実装(リーパーほどの
// 個別チューニングはまだ行っていない)。
export function isRecommended(
  skill: Skill<KnightJobEffects>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  resourceReason?: string,
  settings?: SimSettings,
): boolean {
  const unavailable =
    resourceReason !== undefined
      ? resourceReason
      : isResourceUnavailable(skill, snapshot, elapsedTime, settings ?? FALLBACK_SETTINGS);
  if (unavailable) {
    return false;
  }
  // ホーリースピリット/ホーリーサークルはrequirements/comboを持たないため、上記の汎用ルールでは
  // 拾えない。神聖魔法効果アップまたはレクイエスカットが有効な間は強調する。
  if (skill.id === "holySpirit" || skill.id === "holyCircle") {
    return isBuffActive(snapshot.buffs.holyPower, elapsedTime) || isBuffActive(snapshot.buffs.requiescat, elapsedTime);
  }
  if (skill.requirements || skill.gaugeCost) {
    return true;
  }
  return isComboSuccess(skill, snapshot, elapsedTime);
}
