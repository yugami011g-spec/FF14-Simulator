import type { SkillTooltipData } from "../engine/tooltipText";
import { useTooltipPosition } from "../hooks/useTooltipPosition";

// 呼び出し側(App.tsx)が、ホバー中のアクション枠の最新状態から毎レンダー組み立て直す
// 描画専用のデータです。値そのものを状態として保持し続けるものではありません。
export interface TooltipRequest {
  anchorRect: DOMRect;
  data: SkillTooltipData;
}

interface SkillTooltipProps {
  request: TooltipRequest | null;
}

export function SkillTooltip({ request }: SkillTooltipProps) {
  const { ref, position } = useTooltipPosition(request?.anchorRect);

  if (!request) {
    return <div className="skill-tooltip" hidden />;
  }

  const { data } = request;
  return (
    <div ref={ref} className="skill-tooltip" style={{ left: position.left, top: position.top }}>
      <div className="skill-tooltip-title">{data.title}</div>
      <div className="skill-tooltip-line">{data.typeLabel}</div>
      <div className="skill-tooltip-line">{data.castTimeLine}</div>
      <div className="skill-tooltip-line">{data.recastTimeLine}</div>
      {data.effectText && <div className="skill-tooltip-line skill-tooltip-effect">{data.effectText}</div>}
    </div>
  );
}
