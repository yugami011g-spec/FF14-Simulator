import type { ReplayEntry } from "../types/history";
import type { JobDefinition } from "../types/job";
import type { SimSettings } from "../types/state";

const STORAGE_VERSION = 1;

interface PersistedState {
  entries: ReplayEntry[];
  settings: SimSettings;
}

function storageKey(jobId: string): string {
  return `ff14-simulator:${jobId}`;
}

function isValidEntry(entry: unknown, job: JobDefinition<any>): entry is ReplayEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== "string" || typeof e.usedAt !== "number" || typeof e.preserveTiming !== "boolean") return false;
  if (e.kind === "skill") return typeof e.skillId === "string" && !!job.skills[e.skillId];
  if (e.kind === "wait") return typeof e.duration === "number" && e.duration > 0;
  return false;
}

// localStorageに保存された入力状態を復元する。壊れたデータや現在のジョブに存在しない
// スキルを含むエントリは黙って除外する(legacy版の読込バリデーションと同じ方針)。
export function loadPersistedState(job: JobDefinition<any>): PersistedState | null {
  try {
    const raw = localStorage.getItem(storageKey(job.id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.entries)) return null;
    const entries = parsed.entries.filter((entry: unknown) => isValidEntry(entry, job));
    const s = parsed.settings ?? {};
    const settings: SimSettings = {
      leadInDuration: Number.isFinite(s.leadInDuration) ? s.leadInDuration : 0,
      combatDuration: Number.isFinite(s.combatDuration) ? s.combatDuration : 0,
      gcdSetting: Number.isFinite(s.gcdSetting) && s.gcdSetting > 0 ? s.gcdSetting : 2.5,
    };
    return { entries, settings };
  } catch {
    return null;
  }
}

export function savePersistedState(jobId: string, entries: ReplayEntry[], settings: SimSettings): void {
  try {
    localStorage.setItem(storageKey(jobId), JSON.stringify({ version: STORAGE_VERSION, entries, settings }));
  } catch {
    // プライベートブラウジング等でlocalStorageが使えない場合は永続化を諦める。
  }
}
