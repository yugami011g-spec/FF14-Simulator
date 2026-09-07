import { useCallback, useState } from "react";

// 「今どのアクション枠(base skill id)をホバーしているか」だけを保持します。ホバー中に
// アクション枠の中身が入れ替わっても(例: コムニオ使用後にペルフェクティオへ枠替え)、
// 描画側が毎レンダー最新状態からツールチップ内容を組み立て直せるようにするため、
// 計算済みのツールチップ本文そのものはここでは保持しません。
export interface TooltipHover {
  anchorEl: HTMLElement;
  baseSkillId: string;
}

export function useTooltipController() {
  const [hover, setHover] = useState<TooltipHover | null>(null);

  const show = useCallback((anchorEl: HTMLElement, baseSkillId: string) => {
    setHover({ anchorEl, baseSkillId });
  }, []);

  const hide = useCallback(() => setHover(null), []);

  return { hover, show, hide };
}
