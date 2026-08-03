import type { Skill } from "../types/skill";
import type { JobDefinition } from "../types/job";
import type { SimSnapshot } from "../types/state";
import { isEffectActive } from "./effects";

// コンボの1段目として扱う comboStep の値です（通常コンボ:1、範囲コンボ:11）。
const COMBO_STARTER_STEPS = new Set([1, 11]);

// 指定されたスキルが現在のコンボ状態に合っているか判定します。
export function isComboSuccess(skill: Skill<any>, snapshot: SimSnapshot, elapsedTime: number): boolean {
  if (skill.requiredComboStep === null || skill.requiredComboStep === undefined) {
    return false;
  }
  // コンボ段階が合っていても、前段階から30秒を超えていたら不成立として扱います。
  return snapshot.comboStep === skill.requiredComboStep && elapsedTime <= snapshot.comboExpiresAt;
}

// スキルがいずれかのコンボ（開始または継続）に属しているかを判定します。
// アビリティや、ジビトゥ／ギャロウズのようなコンボと無関係なウェポンスキルは属しません。
export function isComboRelevant(skill: Skill<any>): boolean {
  if (skill.type === "ability") {
    return false;
  }
  if (COMBO_STARTER_STEPS.has(skill.comboStep)) {
    return true;
  }
  return skill.requiredComboStep !== null && skill.requiredComboStep !== undefined;
}

// スキル使用後のコンボ段階を決めます。
export function getNextComboStep(skill: Skill<any>, snapshot: SimSnapshot, elapsedTime: number): number {
  if (!isComboRelevant(skill)) {
    return snapshot.comboStep;
  }
  // コンボの1段目はいつ押しても、そのコンボの開始として扱います。
  if (COMBO_STARTER_STEPS.has(skill.comboStep)) {
    return skill.comboStep;
  }
  // 2段目以降は、コンボ成功時だけ次の段階へ進みます。
  if (isComboSuccess(skill, snapshot, elapsedTime)) {
    return skill.comboStep;
  }
  // コンボ失敗時はコンボ状態をリセットします。
  return 0;
}

// enhancedBy(例: "void"/"cross")は、いずれかの mode 型 jobState エントリの現在値と一致するかで判定します
// (ジョブ非依存: どの jobState キーが「モード」を持つかを engine 側は知らなくてよい)。
export function matchesEnhancedMode(snapshot: SimSnapshot, enhancedBy: string): boolean {
  return Object.values(snapshot.jobState).some((entry) => entry.kind === "mode" && entry.value === enhancedBy);
}

// コンボ成功なら comboPotency、失敗なら potency を返します。ジョブ固有の動的威力(dynamicPotency)は
// job.resolveDynamicPotency に委譲します。
export function calculatePotency(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  job: JobDefinition<any>,
): number {
  const isEnhanced = Boolean(skill.enhancedBy && matchesEnhancedMode(snapshot, skill.enhancedBy));
  let basePotency = isEnhanced
    ? (skill.enhancedPotency ?? skill.potency)
    : isComboSuccess(skill, snapshot, elapsedTime)
      ? (skill.comboPotency ?? skill.potency)
      : skill.potency;

  if (skill.dynamicPotency && job.resolveDynamicPotency) {
    basePotency = job.resolveDynamicPotency(skill.dynamicPotency, snapshot, elapsedTime);
  }

  const enhancementBuff = skill.buffEnhancedBy ? snapshot.buffs[skill.buffEnhancedBy] : undefined;
  if (skill.buffEnhancedPotency !== undefined && isEffectActive(enhancementBuff, elapsedTime)) {
    basePotency = skill.buffEnhancedPotency;
  }

  // 効果に potencyMultiplier が設定されている、現在有効なバフ/デバフをすべて掛け合わせます
  // (例: デスデザイン1.1倍、アルケインサークル1.03倍、薬1.1倍)。
  let multiplier = 1;
  for (const buff of Object.values(snapshot.buffs)) {
    if (buff.potencyMultiplier && isEffectActive(buff, elapsedTime)) {
      multiplier *= buff.potencyMultiplier;
    }
  }
  for (const debuff of Object.values(snapshot.debuffs)) {
    if (debuff.potencyMultiplier && isEffectActive(debuff, elapsedTime)) {
      multiplier *= debuff.potencyMultiplier;
    }
  }

  return Math.round(basePotency * multiplier);
}
