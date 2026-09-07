export interface TooltipPosition {
  left: number;
  top: number;
}

// アンカー要素の矩形とツールチップ自身の矩形から、画面内に収まる表示位置を計算します。
// SkillTooltip(スキル操作パネル)とTimelineTileTooltip(タイムライン)の両方から使われます。
export function computeTooltipPosition(anchorRect: DOMRect, tooltipRect: DOMRect): TooltipPosition {
  const showAbove = anchorRect.top > tooltipRect.height + 16;
  const left = Math.max(4, Math.min(anchorRect.left, window.innerWidth - tooltipRect.width - 8));
  const top = showAbove ? anchorRect.top - tooltipRect.height - 8 : anchorRect.bottom + 8;
  return { left, top };
}
