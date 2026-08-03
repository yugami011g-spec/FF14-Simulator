import { useLayoutEffect, useRef, useState } from "react";
import type { TooltipRequest } from "../hooks/useTooltipController";

interface SkillTooltipProps {
  request: TooltipRequest | null;
}

export function SkillTooltip({ request }: SkillTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!request || !ref.current) return;
    const tooltipRect = ref.current.getBoundingClientRect();
    const showAbove = request.anchorRect.top > tooltipRect.height + 16;
    const left = Math.max(4, Math.min(request.anchorRect.left, window.innerWidth - tooltipRect.width - 8));
    const top = showAbove ? request.anchorRect.top - tooltipRect.height - 8 : request.anchorRect.bottom + 8;
    setPosition({ left, top });
  }, [request]);

  if (!request) {
    return <div className="skill-tooltip" hidden />;
  }

  const { data } = request;
  return (
    <div ref={ref} className="skill-tooltip" style={{ left: position.left, top: position.top }}>
      <div className="skill-tooltip-title">{data.title}</div>
      <div className={`skill-tooltip-status ${data.isReady ? "is-ready" : "is-blocked"}`}>{data.statusLine}</div>
      {data.timingLine && <div className="skill-tooltip-line">{data.timingLine}</div>}
      <div className="skill-tooltip-line">{data.potencyLine}</div>
      {data.gaugeLine && <div className="skill-tooltip-line">{data.gaugeLine}</div>}
      {data.requirementLines.map((line, index) => (
        <div className="skill-tooltip-line skill-tooltip-requirement" key={index}>
          {line}
        </div>
      ))}
      {data.effectLines.map((line, index) => (
        <div className="skill-tooltip-line skill-tooltip-effect" key={index}>
          {line}
        </div>
      ))}
    </div>
  );
}
