import type { JobDefinition, StackDef } from "../types/job";
import type { SimSnapshot } from "../types/state";

interface GaugePanelProps {
  job: JobDefinition<any>;
  snapshot: SimSnapshot;
}

const DEFAULT_GAUGE_COLOR = "var(--blue)";
const DEFAULT_STACK_COLOR = "var(--cyan)";

// StackDef 1件につき1本のドット列を描画する汎用表示。ジョブが renderCustomGaugeExtras を
// 指定していない場合のデフォルト描画に使う(現在値ぶんを stackDef.color で塗る単純な集計)。
function StackDots({ stackDef, snapshot }: { stackDef: StackDef; snapshot: SimSnapshot }) {
  const entry = snapshot.jobState[stackDef.key];
  const value = entry?.kind === "counter" ? entry.value : 0;
  const color = stackDef.color ?? DEFAULT_STACK_COLOR;
  return (
    <div className="stack-block" key={stackDef.key}>
      <span>{stackDef.label}</span>
      <div className="stack-dots" aria-label={`${stackDef.label} ${value}/${stackDef.maxDots}`}>
        {Array.from({ length: stackDef.maxDots }, (_, index) => (
          <i key={index} style={index < value ? { borderColor: color, background: color } : undefined} />
        ))}
      </div>
    </div>
  );
}

export function GaugePanel({ job, snapshot }: GaugePanelProps) {
  const gaugeExtras = job.renderCustomGaugeExtras
    ? job.renderCustomGaugeExtras(snapshot)
    : job.stackDefs.length > 0 && (
        <div className="stack-block">
          <h3>スタック</h3>
          {job.stackDefs.map((stackDef) => (
            <StackDots key={stackDef.key} stackDef={stackDef} snapshot={snapshot} />
          ))}
        </div>
      );

  return (
    <section className="panel gauge-panel">
      <header className="panel-header">
        <h2>ジョブゲージ</h2>
      </header>
      <div className="panel-body">
        {job.gaugeDefs.map((gaugeDef) => {
          const value = snapshot.gauges[gaugeDef.key] ?? 0;
          return (
            <div className="gauge-block" key={gaugeDef.key}>
              <div className="gauge-label">
                <span>{gaugeDef.label}</span>
                <strong>
                  {value} / {gaugeDef.max}
                </strong>
              </div>
              <div className="gauge-bar">
                <span style={{ width: `${(value / gaugeDef.max) * 100}%`, background: gaugeDef.color ?? DEFAULT_GAUGE_COLOR }} />
              </div>
            </div>
          );
        })}
        {gaugeExtras}
      </div>
    </section>
  );
}
