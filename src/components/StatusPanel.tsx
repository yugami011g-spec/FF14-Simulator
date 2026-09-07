import type { JobDefinition } from "../types/job";
import type { DisplayStatus, SimSnapshot } from "../types/state";

interface StatusPanelProps {
  job: JobDefinition<any>;
  snapshot: SimSnapshot;
  displayTime: number;
}

function StatusList({ statuses, displayTime }: { statuses: DisplayStatus[]; displayTime: number }) {
  if (statuses.length === 0) {
    return (
      <div className="status-grid">
        <div className="status-row">
          <span>なし</span>
          <strong>--</strong>
        </div>
      </div>
    );
  }
  return (
    <div className="status-grid">
      {statuses.map((status, index) => {
        const remaining = status.expiresAt === Number.MAX_SAFE_INTEGER ? "--" : `${Math.max(0, status.expiresAt - displayTime).toFixed(1)}s`;
        return (
          <div className="status-row is-active" key={`${status.name}-${index}`}>
            <span>{status.name}</span>
            <strong>{remaining}</strong>
          </div>
        );
      })}
    </div>
  );
}

// snapshot.buffsの生データ(ジョブ非依存)に、job.getDisplayStatusesが返すジョブ固有の
// 派生ステータス(jobStateから合成したスタック数・タイマー等)を合流させて表示用リストを作る。
// フック未実装のジョブは生のbuffsのみが表示される。
function buildDisplayBuffs(job: JobDefinition<any>, snapshot: SimSnapshot, displayTime: number): DisplayStatus[] {
  const rawBuffs: DisplayStatus[] = Object.values(snapshot.buffs)
    .filter((buff) => buff.expiresAt > displayTime)
    .map((buff) => ({ name: buff.name, expiresAt: buff.expiresAt }));
  const derived = job.getDisplayStatuses?.(snapshot, displayTime) ?? [];
  return [...rawBuffs, ...derived];
}

export function StatusPanel({ job, snapshot, displayTime }: StatusPanelProps) {
  const buffs = buildDisplayBuffs(job, snapshot, displayTime);
  const debuffs = Object.values(snapshot.debuffs)
    .filter((debuff) => debuff.expiresAt > displayTime)
    .map((debuff) => ({ name: debuff.name, expiresAt: debuff.expiresAt }));

  return (
    <aside className="panel status-panel">
      <header className="panel-header">
        <h2>状態</h2>
      </header>
      <div className="panel-body">
        <h3>バフ</h3>
        <StatusList statuses={buffs} displayTime={displayTime} />
        <h3 className="status-subheading">デバフ / DoT</h3>
        <StatusList statuses={debuffs} displayTime={displayTime} />
      </div>
    </aside>
  );
}
