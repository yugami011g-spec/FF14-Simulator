import { useCallback, useState } from "react";
import type { SkillTooltipData } from "../engine/tooltipText";

export interface TooltipRequest {
  anchorRect: DOMRect;
  data: SkillTooltipData;
}

export function useTooltipController() {
  const [request, setRequest] = useState<TooltipRequest | null>(null);

  const show = useCallback((anchorEl: HTMLElement, data: SkillTooltipData) => {
    setRequest({ anchorRect: anchorEl.getBoundingClientRect(), data });
  }, []);

  const hide = useCallback(() => setRequest(null), []);

  return { request, show, hide };
}
