import type { SkillType } from "./skill";
import type { SimSnapshot } from "./state";

// replay() への入力。entries が唯一の真実(React state が保持する)。
// id は挿入時に発行し、以後 replay() を何度呼んでも不変(移動/削除の対象特定に使う)。
export type ReplayEntry =
  | { id: string; kind: "skill"; skillId: string; usedAt: number; preserveTiming: boolean }
  | { id: string; kind: "wait"; duration: number; usedAt: number; preserveTiming: boolean };

interface HistoryEntryBase {
  id: string;
  usedAt: number;
  snapshot: SimSnapshot;
}

export interface SkillUseEntry extends HistoryEntryBase {
  kind: "skill";
  skillId: string;
  skillName: string;
  castStartAt: number;
  type: SkillType;
  potency: number;
  comboSuccess: boolean;
  charges: number | null;
  clipping: number;
}

export interface WaitEntry extends HistoryEntryBase {
  kind: "wait";
  duration: number;
  endAt: number;
}

// replay() の出力。直接書き換えない(派生値)。
export type HistoryEntry = SkillUseEntry | WaitEntry;
