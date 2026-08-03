import { useCallback, useState } from "react";

export interface DragGhostState {
  x: number;
  y: number;
  skillId: string;
  label: string;
}

export function useDragGhost() {
  const [ghost, setGhost] = useState<DragGhostState | null>(null);

  const showGhost = useCallback((x: number, y: number, skillId: string, label: string) => {
    setGhost({ x, y, skillId, label });
  }, []);

  const moveGhost = useCallback((x: number, y: number) => {
    setGhost((prev) => (prev ? { ...prev, x, y } : prev));
  }, []);

  const hideGhost = useCallback(() => setGhost(null), []);

  return { ghost, showGhost, moveGhost, hideGhost };
}
