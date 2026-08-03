import type { JobDefinition } from "../types/job";
import type { SimSnapshot } from "../types/state";

interface GaugePanelProps {
  job: JobDefinition<any>;
  snapshot: SimSnapshot;
}

// レムール(残り)とヴォイド(消費済み)は常に合計5になる(ヴォイドリーパー/クロスリーパーが
// レムールを1消費するたびヴォイドを1獲得するため)ので、1本のバーへ統合して表示します。
// 左側から消費済み(ヴォイド)ぶんを塗り、続けて残り(レムール)ぶんを別色で塗ります。
function ShroudStacks({ snapshot }: { snapshot: SimSnapshot }) {
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

export function GaugePanel({ job, snapshot }: GaugePanelProps) {
  return (
    <section className="panel gauge-panel">
      <header className="panel-header">
        <h2>ジョブゲージ</h2>
      </header>
      <div className="panel-body">
        {job.gaugeDefs.map((gaugeDef, index) => {
          const value = snapshot.gauges[gaugeDef.key] ?? 0;
          return (
            <div className="gauge-block" key={gaugeDef.key}>
              <div className="gauge-label">
                <span>{gaugeDef.label}</span>
                <strong>
                  {value} / {gaugeDef.max}
                </strong>
              </div>
              <div className={`gauge-bar${index === 1 ? " gauge-bar-dark" : ""}`}>
                <span style={{ width: `${(value / gaugeDef.max) * 100}%` }} />
              </div>
            </div>
          );
        })}
        <ShroudStacks snapshot={snapshot} />
      </div>
    </section>
  );
}
