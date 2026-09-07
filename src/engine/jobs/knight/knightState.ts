import type { JobStateEntry, SimSnapshot, StatusEffect } from "../../../types/state";

export function counterValue(snapshot: SimSnapshot, key: string): number {
  const entry = snapshot.jobState[key];
  return entry && entry.kind === "counter" ? entry.value : 0;
}

export function counterExpiry(snapshot: SimSnapshot, key: string): number {
  const entry = snapshot.jobState[key];
  return entry && entry.kind === "counter" ? (entry.expiresAt ?? 0) : 0;
}

export function isBuffActive(effect: StatusEffect | undefined, elapsedTime: number): boolean {
  return Boolean(effect && effect.expiresAt > elapsedTime);
}

// オウスゲージは「オートアタック命中のたびに一定量ずつ蓄積される」という時間経過型の
// リソースで、離散的なスキル使用でしか状態が変わらないreplay()のスナップショットモデルとは
// 相性が悪い。そこで、直近の消費(発動)時点の値と時刻だけを「アンカー」としてjobStateに
// 持たせ、任意の経過時間における現在値はそのアンカーからの経過時間÷オートアタック間隔で
// 都度計算する(gating判定・ゲージパネル表示のどちらもcomputeOathGaugeを呼ぶ)。
// 開幕(戦闘開始前を含む)は常に100からのスタートとする(ユーザー確認済み)。
export interface OathAnchor {
  value: number;
  time: number;
}

export function getOathAnchor(snapshot: SimSnapshot): OathAnchor {
  const entry = snapshot.jobState.oathAnchor;
  return entry?.kind === "counter" ? { value: entry.value, time: entry.expiresAt ?? 0 } : { value: 100, time: 0 };
}

export function computeOathGauge(anchor: OathAnchor, elapsedTime: number, autoAttackInterval: number): number {
  if (elapsedTime <= anchor.time || !(autoAttackInterval > 0)) {
    return Math.min(100, anchor.value);
  }
  const ticks = Math.floor((elapsedTime - anchor.time) / autoAttackInterval);
  return Math.min(100, anchor.value + ticks * 5);
}

// コンフィテオル→ブレード・オブ・フェイス〜ヴァラーの進行は、独自のjobStateカウンタではなく
// コア側の comboStep/requiredComboStep(通常の1-2-3コンボと同じ仕組み)をそのまま使う
// (comboStep 21-24を専用レーンとして割り当て)。
// レクイエスカットは4スタック性の消費型リソース(インペラトルで4付与、コンフィテオル〜
// ブレード・オブ・ヴァラーの4コンボとホーリースピリット/ホーリーサークルが1消費)のため、
// リーパーのソウルリーヴァー等と同じくjobStateのcounterで管理する。
export const INITIAL_KNIGHT_JOB_STATE: Record<string, JobStateEntry> = {
  requiescat: { kind: "counter", value: 0, expiresAt: 0 },
  oathAnchor: { kind: "counter", value: 100, expiresAt: 0 },
};
