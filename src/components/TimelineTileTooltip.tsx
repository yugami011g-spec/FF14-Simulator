import { useTooltipPosition } from "../hooks/useTooltipPosition";

// タイムライン上のタイル(実行済みアクション/待機)は、現在の状態から実行可否を判定する
// SkillTooltipDataとは性質が異なり、すでに確定した実績値(実行時刻/アクション名/実際の威力)を
// 表示するだけなので、単純な「タイトル+行の配列」で足りる。見た目は.skill-tooltipを共用する。
export interface TimelineTooltipRequest {
  anchorRect: DOMRect;
  title: string;
  lines: string[];
}

interface TimelineTileTooltipProps {
  request: TimelineTooltipRequest | null;
}

export function TimelineTileTooltip({ request }: TimelineTileTooltipProps) {
  const { ref, position } = useTooltipPosition(request?.anchorRect);

  if (!request) {
    return <div className="skill-tooltip" hidden />;
  }

  return (
    <div ref={ref} className="skill-tooltip" style={{ left: position.left, top: position.top }}>
      <div className="skill-tooltip-title">{request.title}</div>
      {request.lines.map((line, index) => (
        <div className="skill-tooltip-line" key={index}>
          {line}
        </div>
      ))}
    </div>
  );
}
