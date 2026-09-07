import type { Skill } from "../../../types/skill";
import type { SimSnapshot } from "../../../types/state";
import type { KnightJobEffects } from "../../../data/knight/types";
import { roundTime } from "../../time";
import { createTimedBuff } from "../../effects";
import { counterValue, isBuffActive } from "./knightState";

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

  let jobState = snapshotIn.jobState;

  // インペラトル: レクイエスカットを4スタックで新規付与する(表示名にスタック数を埋め込む)。
  if (effects.setRequiescatStacks !== undefined) {
    const stacks = effects.setRequiescatStacks;
    const expiresAt = roundTime(elapsedTime + 30);
    jobState = { ...jobState, requiescat: { kind: "counter", value: stacks, expiresAt } };
    buffs = { ...buffs, requiescat: { ...createTimedBuff("requiescat", `レクイエスカット ×${stacks}`, 30, elapsedTime) } };
  }

  // コンフィテオル〜ブレード・オブ・ヴァラーの4コンボ、ホーリースピリット/ホーリーサークルが
  // それぞれレクイエスカットのスタックを1消費する。スタックが0になったらバフ自体を除去し、
  // 残っていれば表示名のスタック数だけを更新する(期限はインペラトル付与時のまま据え置き)。
  if (effects.consumeRequiescatStack) {
    const remaining = counterValue({ ...snapshotIn, jobState }, "requiescat");
    if (remaining > 0) {
      const nextValue = remaining - 1;
      const currentEntry = jobState.requiescat;
      const expiresAt = currentEntry?.kind === "counter" ? (currentEntry.expiresAt ?? 0) : 0;
      jobState = { ...jobState, requiescat: { kind: "counter", value: nextValue, expiresAt: nextValue > 0 ? expiresAt : 0 } };
      if (nextValue > 0) {
        const currentBuff = buffs.requiescat;
        if (currentBuff) {
          buffs = { ...buffs, requiescat: { ...currentBuff, name: `レクイエスカット ×${nextValue}` } };
        }
      } else {
        const { requiescat: _removed, ...rest } = buffs;
        buffs = rest;
      }
    }
  }

  if (buffs === snapshotIn.buffs && jobState === snapshotIn.jobState) {
    return snapshotIn;
  }
  return { ...snapshotIn, buffs, jobState };
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
