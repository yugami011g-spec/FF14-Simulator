import type { HistoryEntry } from "../types/history";
import type { ReplayEntry } from "../types/history";

export function generateEntryId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `entry-${Math.random().toString(36).slice(2)}`;
}

// replay() が返した history(実際に反映された使用時刻を持つ)の1エントリを、
// 次の replay() への入力(ReplayEntry)へ変換します(旧 toReplayEntry)。
function toReplayEntry(entry: HistoryEntry, preserveTiming: boolean): ReplayEntry {
  if (entry.kind === "wait") {
    return { id: entry.id, kind: "wait", duration: entry.duration, usedAt: entry.usedAt, preserveTiming };
  }
  return { id: entry.id, kind: "skill", skillId: entry.skillId, usedAt: entry.usedAt, preserveTiming };
}

// history の最後の1件を取り除きます。最後尾の削除は以降のタイミングに影響しないため、
// 残りは元のusedAtをそのまま保持(preserveTiming:true)して構いません。
export function buildEntriesAfterUndo(history: HistoryEntry[]): ReplayEntry[] {
  return history.slice(0, -1).map((entry) => toReplayEntry(entry, true));
}

// 指定idのエントリを削除します。削除位置より前は元の使用時刻を維持し、以降は詰め直します。
export function buildEntriesAfterDelete(history: HistoryEntry[], id: string): ReplayEntry[] {
  const index = history.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return history.map((entry) => toReplayEntry(entry, true));
  }
  return history
    .map((entry, entryIndex) => toReplayEntry(entry, entryIndex < index))
    .filter((_, entryIndex) => entryIndex !== index);
}

interface Insertion {
  id: string;
  skillId: string;
}

// others(時系列配列)へ insertion(新規スキル)を targetTime の位置に挿入した ReplayEntry[] を組み立てます。
// cutoffTime より前の元の使用時刻はそのまま保持し、それ以降(新規分を含む)は詰め直します。
function splicePreservingOrder(
  others: HistoryEntry[],
  insertion: Insertion,
  targetTime: number,
  cutoffTime: number,
): ReplayEntry[] {
  const insertBeforeIndex = others.findIndex((entry) => entry.usedAt > targetTime);
  const withPreserve = others.map((entry) => toReplayEntry(entry, entry.usedAt < cutoffTime));
  const insertionEntry: ReplayEntry = {
    id: insertion.id,
    kind: "skill",
    skillId: insertion.skillId,
    usedAt: targetTime,
    preserveTiming: false,
  };
  if (insertBeforeIndex === -1) {
    withPreserve.push(insertionEntry);
  } else {
    withPreserve.splice(insertBeforeIndex, 0, insertionEntry);
  }
  return withPreserve;
}

// 新規スキルを targetTime の位置へ挿入します(末尾追加ではなく、途中への挿入)。
export function buildEntriesAfterInsertSkill(history: HistoryEntry[], skillId: string, targetTime: number): ReplayEntry[] {
  return splicePreservingOrder(history, { id: generateEntryId(), skillId }, targetTime, targetTime);
}

// 末尾へスキルを追加します(通常のボタン押下と同じ、常にライブの現在時刻から自然に進む挿入)。
export function appendSkillEntry(entries: ReplayEntry[], skillId: string): ReplayEntry[] {
  return [...entries, { id: generateEntryId(), kind: "skill", skillId, usedAt: 0, preserveTiming: false }];
}

// 末尾へ待機を追加します。
export function appendWaitEntry(entries: ReplayEntry[], duration: number): ReplayEntry[] {
  return [...entries, { id: generateEntryId(), kind: "wait", duration, usedAt: 0, preserveTiming: false }];
}
