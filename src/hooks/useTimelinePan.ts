import { useEffect } from "react";
import { DRAG_THRESHOLD_PX } from "../engine/timelineMath";

// タイムラインの空白部分をつかんでドラッグすると、表示領域を左右にパンできるようにする
// (旧 setupTimelinePan)。タッチ/ペンはOS標準のスワイプスクロールに任せ、マウス操作のときだけ有効にする。
// scrollEl への addEventListener を直接使うのは、タイル/挿入ドラッグ側の pointerdown が
// stopPropagation した際に確実にパンへ伝播させない(=競合しない)挙動を旧実装のまま保つため。
export function useTimelinePan(scrollRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(".timeline-action, .timeline-ticks, .time-indicator"));

    let pointerId: number | null = null;
    let startX = 0;
    let startScrollLeft = 0;
    let panning = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || isInteractiveTarget(event.target)) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = scrollEl.scrollLeft;
      panning = false;
      try {
        scrollEl.setPointerCapture(event.pointerId);
      } catch {
        /* synthetic pointer */
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null) return;
      const deltaX = event.clientX - startX;
      if (!panning) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
        panning = true;
        scrollEl.classList.add("is-panning");
      }
      scrollEl.scrollLeft = startScrollLeft - deltaX;
    };

    const endPan = () => {
      if (pointerId === null) return;
      try {
        scrollEl.releasePointerCapture(pointerId);
      } catch {
        /* capture already released */
      }
      pointerId = null;
      panning = false;
      scrollEl.classList.remove("is-panning");
    };

    scrollEl.addEventListener("pointerdown", onPointerDown);
    scrollEl.addEventListener("pointermove", onPointerMove);
    scrollEl.addEventListener("pointerup", endPan);
    scrollEl.addEventListener("pointercancel", endPan);

    return () => {
      scrollEl.removeEventListener("pointerdown", onPointerDown);
      scrollEl.removeEventListener("pointermove", onPointerMove);
      scrollEl.removeEventListener("pointerup", endPan);
      scrollEl.removeEventListener("pointercancel", endPan);
    };
  }, [scrollRef]);
}
