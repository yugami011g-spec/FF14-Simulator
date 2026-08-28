import { toPng } from "html-to-image";

// タイムライン(GCD/アビ/効果時間の行を含むtimeline-chart要素)をPNG画像として保存する。
export async function exportTimelineImage(node: HTMLElement, fileNamePrefix: string): Promise<void> {
  const dataUrl = await toPng(node, { backgroundColor: "#ffffff", pixelRatio: 2 });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${fileNamePrefix}.png`;
  link.click();
}
