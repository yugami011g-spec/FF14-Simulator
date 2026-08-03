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
  castTimeEnhancedBy?: string;
  gaugeCost?: Record<string, number>;
  gaugeGain?: Record<string, number>;
  gaugeGainOnCombo?: boolean;
  requirements?: SkillRequirements;
  noTarget?: boolean;
  unavailableDuringEnshroud?: boolean;
  effects?: Effect[];
  jobEffects?: TJobEffects;
}

export interface SlotVariant {
  skillId: string;
  condition: string;
}

export interface ActionSlot {
  base: string;
  variants: SlotVariant[];
}
