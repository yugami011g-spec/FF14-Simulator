import type { JobStateEntry, SimSnapshot, StatusEffect } from "../../../types/state";

export function counterValue(snapshot: SimSnapshot, key: string): number {
  const entry = snapshot.jobState[key];
  return entry && entry.kind === "counter" ? entry.value : 0;
}

export function counterExpiry(snapshot: SimSnapshot, key: string): number {
  const entry = snapshot.jobState[key];
  return entry && entry.kind === "counter" ? (entry.expiresAt ?? 0) : 0;
}

export function flagActive(snapshot: SimSnapshot, key: string): boolean {
  const entry = snapshot.jobState[key];
  return entry ? entry.kind === "flag" && entry.active : false;
}

export function isBuffActive(effect: StatusEffect | undefined, elapsedTime: number): boolean {
  return Boolean(effect && effect.expiresAt > elapsedTime);
}

// レムール中は enshroudUntil(タイマー)とlemureスタックの両方が必要(旧 isEnshrouded と同じ条件)。
export function isEnshrouded(snapshot: SimSnapshot, elapsedTime: number): boolean {
  return counterValue(snapshot, "enshroudUntil") > elapsedTime && counterValue(snapshot, "lemure") > 0;
}

export function withoutKeys<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  if (keys.every((key) => !(key in record))) {
    return record;
  }
  const next = { ...record };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

export const INITIAL_REAPER_JOB_STATE: Record<string, JobStateEntry> = {
  soulReaver: { kind: "counter", value: 0, expiresAt: 0 },
  executioner: { kind: "counter", value: 0, expiresAt: 0 },
  lemure: { kind: "counter", value: 0 },
  void: { kind: "counter", value: 0 },
  enshroudUntil: { kind: "counter", value: 0 },
  sacrificiumReady: { kind: "flag", active: false },
  reapingCombo: { kind: "mode", value: null },
  immortalSacrifice: { kind: "counter", value: 0 },
};
