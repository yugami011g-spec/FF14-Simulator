import { useCallback, useRef } from "react";
import type { Skill } from "../types/skill";
import type { SimSettings } from "../types/state";
import type { HistoryEntry } from "../types/history";
import { DRAG_THRESHOLD_PX, timeFromPointerX } from "../engine/timelineMath";

interface UseSkillInsertDragOptions {
  activeSkill: Skill<any>;
  chartRef: React.RefObject<HTMLElement | null>;
  gcdTrackRef: React.RefObject<HTMLElement | null>;
  abilityTrackRef: React.RefObject<HTMLElement | null>;
  settings: SimSettings;
  history: HistoryEntry[];
  onInsert: (skillId: string, targetTime: number) => void;
  onClick: (skillId: string) => void;
  showGhost: (x: number, y: number, skillId: string, label: string) => void;
  moveGhost: (x: number, y: number) => void;
  hideGhost: () => void;
}

// スキル操作欄のボタンを、タイムライン上の任意位置へドラッグして挿入できるようにする
// (旧 setupSkillButtonInsertDrag)。閾値未満の操作はドラッグとみなさず、クリック=末尾追加として扱う。
export function useSkillInsertDrag({
  activeSkill,
  chartRef,
  gcdTrackRef,
  abilityTrackRef,
  settings,
  history,
  onInsert,
  onClick,
  showGhost,
  moveGhost,
  hideGhost,
}: UseSkillInsertDragOptions) {
  const pointerId = useRef<number | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const overChart = useRef(false);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    pointerId.current = event.pointerId;
    startPos.current = { x: event.clientX, y: event.clientY };
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
      if (!dragging.current) {
        const moved = Math.hypot(event.clientX - startPos.current.x, event.clientY - startPos.current.y);
        if (moved < DRAG_THRESHOLD_PX) return;
        dragging.current = true;
        showGhost(event.clientX, event.clientY, activeSkill.id, activeSkill.shortName || activeSkill.name);
      }
      moveGhost(event.clientX, event.clientY);
      const chartEl = chartRef.current;
      if (!chartEl) return;
      const chartRect = chartEl.getBoundingClientRect();
      overChart.current =
        event.clientX >= chartRect.left &&
        event.clientX <= chartRect.right &&
        event.clientY >= chartRect.top &&
        event.clientY <= chartRect.bottom;
    },
    [activeSkill, chartRef, showGhost, moveGhost],
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, shouldCommit: boolean) => {
      if (pointerId.current === null) return;
      try {
        event.currentTarget.releasePointerCapture(pointerId.current);
      } catch {
        /* capture already released */
      }
      pointerId.current = null;
      hideGhost();
      if (dragging.current && shouldCommit && overChart.current) {
        suppressClick.current = true;
        const rowEl = activeSkill.type === "ability" ? abilityTrackRef.current : gcdTrackRef.current;
        if (rowEl) {
          const rect = rowEl.getBoundingClientRect();
          const targetTime = timeFromPointerX(rect, event.clientX, settings, history);
          onInsert(activeSkill.id, targetTime);
        }
      } else if (dragging.current) {
        // タイムライン外でのドロップ、または中断(pointercancel)は挿入しない。
        suppressClick.current = true;
      }
      dragging.current = false;
      overChart.current = false;
    },
    [activeSkill, abilityTrackRef, gcdTrackRef, settings, history, onInsert, hideGhost],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => finishDrag(event, true), [finishDrag]);
  const onPointerCancel = useCallback((event: React.PointerEvent<HTMLButtonElement>) => finishDrag(event, false), [finishDrag]);

  const onClickHandler = useCallback(() => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onClick(activeSkill.id);
  }, [activeSkill, onClick]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick: onClickHandler };
}
