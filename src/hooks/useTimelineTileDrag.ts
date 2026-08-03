import { useCallback, useRef } from "react";
import type { SimSettings } from "../types/state";
import type { HistoryEntry } from "../types/history";
import { DRAG_THRESHOLD_PX, timeFromPointerX } from "../engine/timelineMath";

interface UseTimelineTileDragOptions {
  entry: HistoryEntry;
  settings: SimSettings;
  history: HistoryEntry[];
  onMove: (id: string, targetTime: number) => void;
}

// タイムライン上の配置済みタイルを、ドラッグで別の時刻へ移動できるようにする(旧 setupTimelineActionMoveDrag)。
// ドラッグ中はタイルの style.left をrefで直接DOM操作し(Reactの再レンダーを経由しない)、
// pointerup 時のみ onMove(=dispatch.moveEntry) を呼んで本当の replay() を発火させる。
// pointercancel/範囲外ドロップ時は、ドラッグ開始前に記録しておいた元の left 文字列(%指定)を
// そのまま書き戻して元の位置へ戻す。React の style diffing は同じ値の props を再適用しない
// (直接DOM操作した左値との差分に気づけない)ため、rerenderに頼らずここで直接復元する。
export function useTimelineTileDrag({ entry, settings, history, onMove }: UseTimelineTileDragOptions) {
  const pointerId = useRef<number | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const grabOffsetPx = useRef(0);
  const trackEl = useRef<HTMLElement | null>(null);
  const originalLeftStyle = useRef("");
  const lastTargetTime = useRef(entry.usedAt);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    pointerId.current = event.pointerId;
    startPos.current = { x: event.clientX, y: event.clientY };
    trackEl.current = event.currentTarget.parentElement;
    originalLeftStyle.current = event.currentTarget.style.left;
    grabOffsetPx.current = event.clientX - event.currentTarget.getBoundingClientRect().left;
    dragging.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic pointer */
    }
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (pointerId.current === null) return;
      const item = event.currentTarget;
      if (!dragging.current) {
        const moved = Math.hypot(event.clientX - startPos.current.x, event.clientY - startPos.current.y);
        if (moved < DRAG_THRESHOLD_PX) return;
        dragging.current = true;
        item.classList.add("is-dragging");
      }
      const track = trackEl.current;
      if (!track) return;
      const trackRect = track.getBoundingClientRect();
      const maxLeft = Math.max(0, trackRect.width - item.offsetWidth);
      const leftPx = Math.max(0, Math.min(maxLeft, event.clientX - trackRect.left - grabOffsetPx.current));
      item.style.left = `${leftPx}px`;
      lastTargetTime.current = timeFromPointerX(
        { left: trackRect.left, width: trackRect.width },
        trackRect.left + leftPx,
        settings,
        history,
      );
    },
    [settings, history],
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, shouldCommit: boolean) => {
      if (pointerId.current === null) return;
      const item = event.currentTarget;
      try {
        item.releasePointerCapture(pointerId.current);
      } catch {
        /* capture already released */
      }
      pointerId.current = null;
      item.classList.remove("is-dragging");
      if (dragging.current) {
        if (shouldCommit) {
          onMove(entry.id, lastTargetTime.current);
        } else {
          // 中断(pointercancel)またはタイムライン外でのドロップは移動せず、元の位置へ戻す。
          item.style.left = originalLeftStyle.current;
        }
      }
      dragging.current = false;
    },
    [entry.id, onMove],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => finishDrag(event, true), [finishDrag]);
  const onPointerCancel = useCallback((event: React.PointerEvent<HTMLButtonElement>) => finishDrag(event, false), [finishDrag]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
