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

// コンフィテオル→ブレード・オブ・フェイス〜ヴァラーの進行は、独自のjobStateカウンタではなく
// コア側の comboStep/requiredComboStep(通常の1-2-3コンボと同じ仕組み)をそのまま使う
// (comboStep 21-24を専用レーンとして割り当て)。
// レクイエスカットは4スタック性の消費型リソース(インペラトルで4付与、コンフィテオル〜
// ブレード・オブ・ヴァラーの4コンボとホーリースピリット/ホーリーサークルが1消費)のため、
// リーパーのソウルリーヴァー等と同じくjobStateのcounterで管理する。
export const INITIAL_KNIGHT_JOB_STATE: Record<string, JobStateEntry> = {
  requiescat: { kind: "counter", value: 0, expiresAt: 0 },
};
