// リーパー固有の jobEffects 宣言的バッグ(旧 js/skills.js の jobEffects をそのまま型付け)。
export interface ReaperJobEffects {
  soulReaverSet?: number;
  soulReaverCost?: number;
  executionerSet?: number;
  executionerCost?: number;
  lemureCost?: number;
  voidGain?: number;
  voidCost?: number;
  enterEnshroud?: boolean;
  exitEnshroud?: boolean;
  reapingComboSet?: "void" | "cross";
  consumeSacrificium?: boolean;
  consumeBuff?: string;
  reduceCooldown?: { group: string; amount: number };
  applyPersistentBuff?: { id: string; name: string };
  consumeImmortalSacrifice?: boolean;
  grantEnshroudReady?: boolean;
  grantPerfectioPending?: boolean;
  promotePerfectio?: boolean;
}
