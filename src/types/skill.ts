export type SkillType = "weaponskill" | "ability" | "spell";

export interface Effect {
  type: "buff" | "debuff";
  id: string;
  name: string;
  duration: number;
  maxDuration?: number;
  potencyMultiplier?: number;
  showOnTimeline?: boolean;
}

// stacks/flags は他ジョブでも再利用できるよう汎用化したキー付き要件。
// buff/buffAbsent は付与中バフの有無を問う既存スキーマをそのまま踏襲する。
export interface SkillRequirements {
  stacks?: Record<string, number>;
  flags?: Record<string, boolean>;
  buff?: string;
  buffAbsent?: string;
}

export interface Skill<TJobEffects = Record<string, unknown>> {
  id: string;
  job: string;
  name: string;
  shortName: string;
  category?: "role";
  // 同じカテゴリ(ウェポンスキル/魔法・アビリティ)内で行を分けたい場合の行番号(0始まり、
  // 未指定は0扱い)。例: 単体主体のコンボは0行目、範囲技だけをまとめて1行目、防御バフだけを
  // まとめて1行目、のように使う。SkillPanel.tsxがこの値でグリッドを分けて描画する。
  row?: number;
  type: SkillType;
  potency: number;
  comboPotency?: number | null;
  enhancedPotency?: number;
  enhancedBy?: string;
  buffEnhancedPotency?: number;
  buffEnhancedBy?: string;
  dynamicPotency?: string;
  requiredComboStep?: number | null;
  comboStep: number;
  recast?: number | null;
  cooldownGroup?: string;
  maxCharges?: number;
  chargeGroup?: string;
  gcd: boolean;
  gcdRecast?: number | null;
  animationLock?: number;
  castTime?: number;
  // 詠唱時間を無詠唱にするバフID。複数バフのいずれかで無詠唱になる場合(例: ナイトのホーリー
  // スピリット/ホーリーサークルが「神聖魔法効果アップ」「レクイエスカット」のどちらでも無詠唱に
  // なる)は配列で複数指定できる。
  castTimeEnhancedBy?: string | string[];
  // 戦闘開始(elapsedTime 0)より前は詠唱時間を無視して即着弾にする(0s以降は通常通りcastTimeが
  // 発生する)。ソウルソウのように「開幕前は無詠唱で仕込めるが、戦闘中に使うと詠唱が発生する」
  // 挙動を持つスキル用のフラグ。
  noCastTimeBeforeCombat?: boolean;
  gaugeCost?: Record<string, number>;
  gaugeGain?: Record<string, number>;
  gaugeGainOnCombo?: boolean;
  requirements?: SkillRequirements;
  noTarget?: boolean;
  unavailableDuringEnshroud?: boolean;
  effects?: Effect[];
  jobEffects?: TJobEffects;
  // 公式ジョブガイド(https://jp.finalfantasyxiv.com/jobguide/)の「効果」欄の説明文を
  // そのまま転記したもの。ツールチップ表示専用で、威力計算等のロジックには使わない。
  officialEffect?: string;
}

export interface SlotVariant {
  skillId: string;
  condition: string;
}

export interface ActionSlot {
  base: string;
  variants: SlotVariant[];
}
