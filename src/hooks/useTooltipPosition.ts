import { useLayoutEffect, useRef, useState } from "react";
import { computeTooltipPosition } from "../engine/tooltipPosition";

// SkillTooltip/TimelineTileTooltipで共通の「アンカー矩形から、自身の実寸を測って画面内に
// 収まる表示位置を計算する」ロジック。ref(自身の矩形取得用)とposition(算出済みの表示位置)を
// 返す。anchorRectがundefined(ツールチップ非表示中)の間は位置計算を行わない。
export function useTooltipPosition(anchorRect: DOMRect | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!anchorRect || !ref.current) return;
    setPosition(computeTooltipPosition(anchorRect, ref.current.getBoundingClientRect()));
  }, [anchorRect]);

  return { ref, position };
}
