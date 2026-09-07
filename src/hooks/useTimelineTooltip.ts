import { useCallback, useState } from "react";
import type { TimelineTooltipRequest } from "../components/TimelineTileTooltip";

// タイムラインのタイルは、ホバー中に内容自体が変化することはない(確定済みの履歴エントリの
// 実績値を表示するだけ)ため、useTooltipControllerと違い、ホバー時に組み立てた内容を
// そのままstateへ保持してよい。
export function useTimelineTooltip() {
  const [request, setRequest] = useState<TimelineTooltipRequest | null>(null);

  const show = useCallback((anchorEl: HTMLElement, title: string, lines: string[]) => {
    setRequest({ anchorRect: anchorEl.getBoundingClientRect(), title, lines });
  }, []);

  const hide = useCallback(() => setRequest(null), []);

  return { request, show, hide };
}
