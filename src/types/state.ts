export interface StatusEffect {
  type: "buff" | "debuff";
  id: string;
  name: string;
  potencyMultiplier?: number;
  showOnTimeline: boolean;
  appliedAt: number;
  expiresAt: number;
  // タイムライン効果帯に集計される威力/アクション数(showOnTimelineの効果のみ埋まる)。
  potency?: number;
  actionCount?: number;
}

// counter: レムール/ヴォイド/処刑人等のスタック数やタイムスタンプ用途(valueの意味はジョブ側が解釈する)
// flag: サクリフィキウム実行可否等の単純な真偽状態
// mode: レムール/クロス等、排他的な状態ラベル
export type JobStateEntry =
  | { kind: "counter"; value: number; expiresAt?: number }
  | { kind: "flag"; active: boolean; expiresAt?: number }
  | { kind: "mode"; value: string | null };

export interface SimSnapshot {
  elapsedTime: number;
  totalPotency: number;
  comboStep: number;
  comboExpiresAt: number;
  gauges: Record<string, number>;
  jobState: Record<string, JobStateEntry>;
  gcdReadyAt: number;
  actionReadyAt: number;
  cooldowns: Record<string, number>;
  chargeReadyTimes: Record<string, number[]>;
  buffs: Record<string, StatusEffect>;
  debuffs: Record<string, StatusEffect>;
}

export interface SimSettings {
  leadInDuration: number;
  combatDuration: number;
  gcdSetting: number;
}
