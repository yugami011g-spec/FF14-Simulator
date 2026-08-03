import { useCallback, useRef } from "react";
import type { SimSettings } from "../types/state";
import type { HistoryEntry } from "../types/history";
import { timeFromPointerX } from "../engine/timelineMath";

// タイムインジケーター本体と目盛り(定規)エリアの両方から、プレイヘッドをドラッグで
// 動かせるようにする(旧 setupTimelineIndicatorDrag)。displayTime の変更は replay() の
// メモを無効化しないため、pointermove ごとに素直に setDisplayTime してよい。
export function useTimelineScrub(
  chartRef: React.RefObject<HTMLElement | null>,
  settings: SimSettings,
  history: HistoryEntry[],
  setDisplayTime: (time: number | null) => void,
) {
  const isDragging = useRef(false);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      setDisplayTime(timeFromPointerX(rect, clientX, settings, history));
    },
    [chartRef, settings, history, setDisplayTime],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault();
      isDragging.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* synthetic pointer */
      }
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!isDragging.current) return;
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    isDragging.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* capture already released */
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}
