import type { Skill } from "../../../types/skill";
import type { SimSettings, SimSnapshot } from "../../../types/state";
import type { KnightJobEffects } from "../../../data/knight/types";
import { roundTime } from "../../time";
import { createTimedBuff } from "../../effects";
import { computeOathGauge, counterValue, getOathAnchor, isBuffActive } from "./knightState";

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
  _leadInDuration: number,
  autoAttackInterval: number,
): SimSnapshot {
  const effects = skill.jobEffects || {};
  let buffs = snapshotIn.buffs;
  let jobState = snapshotIn.jobState;

  // パッセージ・オブ・アームズ: 公式仕様上「効果時間中に(このスキル自身以外の)アクションを
  // 実行すると即座に解除される」ため、まだ効果が残っている状態で何か別のアクションが使われたら
  // 残り時間をこの時刻に切り詰める(待機エントリはapplyJobEffects自体を呼ばないため解除されず、
  // 待機時間ぶんだけ保持時間を延ばせる形になる)。
  const passageOfArms = buffs.passageOfArms;
  if (skill.id !== "passageOfArms" && passageOfArms && passageOfArms.expiresAt > elapsedTime) {
    buffs = { ...buffs, passageOfArms: { ...passageOfArms, expiresAt: elapsedTime } };
  }

  // オウスゲージ消費(ホーリーシェルトロン/インターベンション/かばう等、gaugeCost.oathを
  // 持つアクション)。現在値(アンカーからの経過時間で計算)から差し引き、消費時点を新しい
  // アンカーとして記録する(以降はこの新アンカーからまた蓄積が始まる)。isResourceUnavailableで
  // 既に不足していないことは確認済みの前提。
  const oathCost = skill.gaugeCost?.oath;
  if (oathCost) {
    const current = computeOathGauge(getOathAnchor({ ...snapshotIn, jobState }), elapsedTime, autoAttackInterval);
    jobState = { ...jobState, oathAnchor: { kind: "counter", value: Math.max(0, current - oathCost), expiresAt: elapsedTime } };
  }

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

// GaugePanel表示用。オウスゲージは経過時間+設定されたオートアタック間隔から連続的に算出する
// (詳細はknightState.tsのcomputeOathGauge参照)。
export function computeGaugeValue(gaugeKey: string, snapshot: SimSnapshot, elapsedTime: number, settings: SimSettings): number {
  if (gaugeKey === "oath") {
    return computeOathGauge(getOathAnchor(snapshot), elapsedTime, settings.autoAttackInterval);
  }
  return snapshot.gauges[gaugeKey] ?? 0;
}
