import { useEffect, useMemo, useState } from "react";
import type { JobDefinition } from "../types/job";
import type { ReplayEntry } from "../types/history";
import type { SimSettings } from "../types/state";
import { replay, findSnapshotAt, initialSnapshot } from "../engine/replay";
import { getLiveAppendRejectionReason } from "../engine/gating";
import {
  appendSkillEntry,
  appendWaitEntry,
  buildEntriesAfterDelete,
  buildEntriesAfterInsertSkill,
  buildEntriesAfterMove,
  buildEntriesAfterUndo,
} from "../engine/editOps";
import { loadPersistedState, savePersistedState } from "./persistence";

const DEFAULT_SETTINGS: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 };

export function useSimulator(job: JobDefinition<any>) {
  const [entries, setEntries] = useState<ReplayEntry[]>(() => loadPersistedState(job)?.entries ?? []);
  const [settings, setSettings] = useState<SimSettings>(() => loadPersistedState(job)?.settings ?? DEFAULT_SETTINGS);
  const [displayTime, setDisplayTime] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  // 入力状態の変更を都度ブラウザへ自動保存する(離脱→再訪時に復元するため)。
  useEffect(() => {
    savePersistedState(job.id, entries, settings);
  }, [job.id, entries, settings]);

  const result = useMemo(() => replay(entries, settings, job), [entries, settings, job]);
  const initial = useMemo(() => initialSnapshot(settings, job), [settings, job]);

  const isPreviewing = displayTime !== null;
  const liveElapsedTime = result.final.elapsedTime;
  const effectiveDisplayTime = displayTime ?? liveElapsedTime;
  const displaySnapshot = isPreviewing ? findSnapshotAt(result.history, effectiveDisplayTime, initial) : result.final;

  function useSkill(skillId: string) {
    // 過去確認中でも通常入力は常にタイムライン末尾へ追加する(旧 useSkill と同じ規約)。
    setDisplayTime(null);
    const skill = job.skills[skillId];
    if (!skill) return;
    const reason = getLiveAppendRejectionReason(skill, result.final, liveElapsedTime, settings, job);
    if (reason) {
      setMessage(`${skill.name}は${reason}`);
      return;
    }
    setMessage("");
    setEntries((prev) => appendSkillEntry(prev, skillId));
  }

  function wait(duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) return;
    setDisplayTime(null);
    if (settings.combatDuration > 0 && liveElapsedTime >= settings.combatDuration) {
      setMessage("戦闘時間終了後は使用できません");
      return;
    }
    setMessage("");
    setEntries((prev) => appendWaitEntry(prev, duration));
  }

  function undo() {
    setMessage("");
    setEntries((prev) => (result.history.length === 0 ? prev : buildEntriesAfterUndo(result.history)));
  }

  function deleteAt(id: string) {
    setMessage("");
    setEntries(buildEntriesAfterDelete(result.history, id));
  }

  function moveEntry(id: string, targetTime: number) {
    setMessage("");
    setEntries(buildEntriesAfterMove(result.history, id, targetTime));
  }

  function insertSkillAt(skillId: string, targetTime: number) {
    if (!job.skills[skillId]) return;
    setMessage("");
    setEntries(buildEntriesAfterInsertSkill(result.history, skillId, targetTime));
  }

  function reset() {
    setEntries([]);
    setDisplayTime(null);
    setMessage("");
  }

  // CSV読込など、外部から組み立てたentries一式で現在のタイムラインを置き換える。
  function loadEntries(newEntries: ReplayEntry[], skippedRows = 0) {
    setEntries(newEntries);
    setDisplayTime(null);
    setMessage(skippedRows > 0 ? `CSV読込: ${skippedRows}件の行を読み込めず除外しました` : "");
  }

  function updateLeadInDuration(value: number) {
    // カウントの起点そのものが変わるため、既存の回しはリセットする(旧実装と同じ)。
    setSettings((prev) => ({ ...prev, leadInDuration: value }));
    setEntries([]);
    setDisplayTime(null);
    setMessage("");
  }

  function updateCombatDuration(seconds: number) {
    setSettings((prev) => ({ ...prev, combatDuration: seconds }));
  }

  function updateGcdSetting(value: number) {
    const next = Math.max(1, value || 2.5);
    setSettings((prev) => ({ ...prev, gcdSetting: Math.round(next * 100) / 100 }));
  }

  return {
    entries,
    settings,
    isPreviewing,
    displayTime: effectiveDisplayTime,
    message: message || result.message,
    history: result.history,
    final: result.final,
    effectHistory: result.effectHistory,
    displaySnapshot,
    dispatch: {
      useSkill,
      wait,
      undo,
      deleteAt,
      moveEntry,
      insertSkillAt,
      reset,
      loadEntries,
      updateLeadInDuration,
      updateCombatDuration,
      updateGcdSetting,
      setDisplayTime,
    },
  };
}
