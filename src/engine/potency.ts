import type { Skill } from "../types/skill";
import type { JobDefinition } from "../types/job";
import type { SimSnapshot } from "../types/state";
import { isEffectActive } from "./effects";

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
// comboStepを持つ(0より大きい)スキルはすべて何らかのコンボレーンの開始または継続であり、
// requiredComboStepの有無で開始(前提条件なし)と継続(前提条件あり)を区別します。この判定は
// ジョブごとのコンボレーン数(通常コンボ/範囲コンボ/バーストコンボ等)に依存しません。
export function isComboRelevant(skill: Skill<any>): boolean {
  if (skill.type === "ability") {
    return false;
  }
  return skill.comboStep > 0;
}

// スキル使用後のコンボ段階を決めます。
export function getNextComboStep(skill: Skill<any>, snapshot: SimSnapshot, elapsedTime: number): number {
  if (!isComboRelevant(skill)) {
    return snapshot.comboStep;
  }
  // 前提条件(requiredComboStep)を持たない段階は、そのコンボレーンの開始としていつ押しても
  // 開始として扱います。
  if (skill.requiredComboStep === null || skill.requiredComboStep === undefined) {
    return skill.comboStep;
  }
  // 前提条件を持つ段階は、コンボ成功時だけ次の段階へ進みます。
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
