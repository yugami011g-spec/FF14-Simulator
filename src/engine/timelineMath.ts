import type { SimSettings } from "../types/state";
import type { HistoryEntry } from "../types/history";
import type { StatusEffect } from "../types/state";
import { roundTime } from "./time";

export const TIMELINE_DURATION = 35;
export const TIMELINE_BASE_WIDTH = 1206;
// 末尾のアクション（left:100%付近）がアイコン幅ぶんはみ出さないよう、右側に確保する余白です。
// css/style.css の calc(100% - 48px) と対にして使うため、値を変える場合は両方合わせてください。
export const TIMELINE_RIGHT_MARGIN = 48;
// タイムラインが伸びた際、最後のアクションから確保する最低余白（秒）。GCD1回分。
export const TIMELINE_TRAILING_SECONDS = 2.5;
// この距離(px)を超えて動いたら「クリック」ではなく「ドラッグ」として扱います。
export const DRAG_THRESHOLD_PX = 6;

// 助走区間(助走時間の設定値)の分だけ、タイムラインの表示開始時刻をマイナス側にずらします。
export function getTimelineContentStart(settings: SimSettings): number {
  return -settings.leadInDuration;
}

export function getTimelineContentEnd(settings: SimSettings, history: HistoryEntry[]): number {
  // 戦闘時間が設定されている場合は、実際のアクション有無に関わらずその長さでTLを固定します。
  if (settings.combatDuration > 0) {
    return settings.combatDuration;
  }
  const latestActionAt = Math.max(0, ...history.map((entry) => (entry.kind === "wait" ? entry.endAt : entry.usedAt)));
  // 5秒刻みの丸めだけだと、最後のアクションがちょうど5秒境界に乗ったときに余白が無くなるため、
  // 先に最低余白(TIMELINE_TRAILING_SECONDS)を確保してから丸めます。
  const contentEnd = Math.max(TIMELINE_DURATION, latestActionAt + TIMELINE_TRAILING_SECONDS);
  return Math.ceil(contentEnd / 5) * 5;
}

export function getTimelineContentDuration(settings: SimSettings, history: HistoryEntry[]): number {
  return getTimelineContentEnd(settings, history) - getTimelineContentStart(settings);
}

// 戦闘時間の入力欄(m:ss形式)を秒数へ変換します。空欄や不正な値は0(無制限)扱いです。
export function parseCombatDurationInput(text: string): number {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  const match = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  const asSeconds = Number(trimmed);
  return Number.isFinite(asSeconds) && asSeconds >= 0 ? Math.round(asSeconds) : 0;
}

// 秒数をm:ss形式の表示用文字列へ変換します。0(無制限)は空欄で表します。
export function formatCombatDuration(seconds: number): string {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

// ポインターのX座標を、指定した矩形の幅を基準にタイムライン上の時刻へ変換します。
export function timeFromPointerX(rect: { left: number; width: number }, clientX: number, settings: SimSettings, history: HistoryEntry[]): number {
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return roundTime(getTimelineContentStart(settings) + ratio * getTimelineContentDuration(settings, history));
}

// 効果(バフ/デバフ)の帯を、時間的に重ならない範囲でできるだけ同じレーンへ詰め込みます。
export function assignEffectLanes(effects: StatusEffect[]): { lanes: Map<StatusEffect, number>; laneCount: number } {
  const sorted = [...effects].sort((a, b) => a.appliedAt - b.appliedAt);
  const laneEnds: number[] = [];
  const lanes = new Map<StatusEffect, number>();
  sorted.forEach((effect) => {
    let laneIndex = laneEnds.findIndex((endAt) => endAt <= effect.appliedAt);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(effect.expiresAt);
    } else {
      laneEnds[laneIndex] = effect.expiresAt;
    }
    lanes.set(effect, laneIndex);
  });
  return { lanes, laneCount: laneEnds.length };
}
