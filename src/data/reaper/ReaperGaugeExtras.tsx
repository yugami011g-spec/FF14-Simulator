import type { SimSnapshot } from "../../types/state";

// レムール(残り)とヴォイド(消費済み)は常に合計5になる(ヴォイドリーパー/クロスリーパーが
// レムールを1消費するたびヴォイドを1獲得するため)ので、1本のバーへ統合して表示します。
// 左側から消費済み(ヴォイド)ぶんを塗り、続けて残り(レムール)ぶんを別色で塗ります。
// この合成表示はStackDefの汎用ドット列(1スタック=1ドット列)では表現できないため、
// job.renderCustomGaugeExtrasフック経由でGaugePanelに差し込みます。
export function ReaperGaugeExtras({ snapshot }: { snapshot: SimSnapshot }) {
  const lemure = snapshot.jobState.lemure?.kind === "counter" ? snapshot.jobState.lemure.value : 0;
  const voidStacks = snapshot.jobState.void?.kind === "counter" ? snapshot.jobState.void.value : 0;
  const dots = Array.from({ length: 5 }, (_, index) => ({
    isVoid: index < voidStacks,
    isActive: index >= voidStacks && index < voidStacks + lemure,
  }));
  return (
    <div className="stack-block">
      <h3>スタック</h3>
      <span>シュラウドスタック</span>
      <div className="stack-dots" aria-label={`シュラウドスタック 残り${lemure} / 消費済み${voidStacks}`}>
        {dots.map((dot, index) => (
          <i key={index} className={[dot.isVoid ? "is-void" : "", dot.isActive ? "is-active" : ""].filter(Boolean).join(" ")} />
        ))}
      </div>
    </div>
  );
}
