import { useState } from "react";
import type { DragGhostState } from "../hooks/useDragGhost";

export function DragGhost({ ghost }: { ghost: DragGhostState | null }) {
  const [iconFailed, setIconFailed] = useState(false);

  if (!ghost) {
    return <div className="drag-ghost" hidden />;
  }

  return (
    <div className="drag-ghost" style={{ left: `${ghost.x}px`, top: `${ghost.y}px` }}>
      <span className="drag-ghost-icon">
        {!iconFailed && <img alt="" src={`${import.meta.env.BASE_URL}assets/icons/${ghost.skillId}.png`} onError={() => setIconFailed(true)} />}
        {iconFailed && <span className="drag-ghost-fallback">{ghost.label}</span>}
      </span>
    </div>
  );
}
