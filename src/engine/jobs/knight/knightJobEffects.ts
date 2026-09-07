import type { Skill } from "../../../types/skill";
import type { SimSnapshot } from "../../../types/state";
import type { KnightJobEffects } from "../../../data/knight/types";
import { createTimedBuff } from "../../effects";
import { isBuffActive } from "./knightState";

// コンボ成立時だけ付与されるバフ(ロイヤルアソリティ/プロミネンスのコンボボーナス)。
// それ以外のバフ付与はすべてスキルの宣言的なeffects配列で完結するため、ここではこの
// 1パターンだけを扱う。
const COMBO_BONUS_BUFFS: Record<string, { name: string; duration: number }> = {
  atonementReady: { name: "ロイエ実行可", duration: 30 },
  holyPower: { name: "神聖魔法効果アップ", duration: 30 },
};

export function applyJobEffects(
  skill: Skill<KnightJobEffects>,
  snapshotIn: SimSnapshot,
  elapsedTime: number,
  comboSuccess: boolean,
): SimSnapshot {
  const effects = skill.jobEffects || {};
  let buffs = snapshotIn.buffs;

  if (effects.consumeBuffs) {
    for (const buffId of effects.consumeBuffs) {
      if (buffId in buffs) {
        const { [buffId]: _removed, ...rest } = buffs;
        buffs = rest;
      }
    }
  }

  if (effects.grantOnComboSuccess && comboSuccess) {
    for (const buffId of effects.grantOnComboSuccess) {
      const def = COMBO_BONUS_BUFFS[buffId];
      if (def) {
        buffs = { ...buffs, [buffId]: createTimedBuff(buffId, def.name, def.duration, elapsedTime) };
      }
    }
  }

  return buffs === snapshotIn.buffs ? snapshotIn : { ...snapshotIn, buffs };
}

// ホーリースピリット/ホーリーサークルの3段階威力(通常/神聖魔法効果アップ時/レクイエスカット時)。
// 両方のバフが付与されている場合は神聖魔法効果アップが優先される(公式ジョブガイド記載通り)。
export function resolveDynamicPotency(tag: string, snapshot: SimSnapshot, elapsedTime: number): number {
  const holyPowerActive = isBuffActive(snapshot.buffs.holyPower, elapsedTime);
  const requiescatActive = isBuffActive(snapshot.buffs.requiescat, elapsedTime);
  if (tag === "holySpirit") {
    if (holyPowerActive) return 500;
    if (requiescatActive) return 700;
    return 400;
  }
  if (tag === "holyCircle") {
    if (holyPowerActive) return 250;
    if (requiescatActive) return 350;
    return 100;
  }
  return 0;
}
