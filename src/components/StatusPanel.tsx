import type { SimSnapshot } from "../types/state";
import { isEnshrouded } from "../engine/jobs/reaper/reaperState";

interface StatusPanelProps {
  snapshot: SimSnapshot;
  displayTime: number;
}

interface DisplayStatus {
  name: string;
  expiresAt: number;
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

// レムール状態・妖異の鎌・処刑人・サクリフィキウム実行可・死の供物は、宣言的な buffs/debuffs
// ではなくジョブ固有の jobState として管理されているため、状態欄への表示だけこの場でバフ風に変換します
// (旧 ui.js renderStatus のリーパー専用合成ロジックを、リーパー用コンポーネントとして踏襲)。
function buildReaperBuffs(snapshot: SimSnapshot, displayTime: number): DisplayStatus[] {
  const buffs: DisplayStatus[] = Object.values(snapshot.buffs)
    .filter((buff) => buff.expiresAt > displayTime)
    .map((buff) => ({ name: buff.name, expiresAt: buff.expiresAt }));

  const enshroudUntil = snapshot.jobState.enshroudUntil?.kind === "counter" ? snapshot.jobState.enshroudUntil.value : 0;
  if (isEnshrouded(snapshot, displayTime)) {
    buffs.push({ name: "レムール", expiresAt: enshroudUntil });
  }
  const soulReaver = snapshot.jobState.soulReaver;
  if (soulReaver?.kind === "counter" && soulReaver.value) {
    buffs.push({ name: `妖異の鎌 ×${soulReaver.value}`, expiresAt: soulReaver.expiresAt ?? 0 });
  }
  const executioner = snapshot.jobState.executioner;
  if (executioner?.kind === "counter" && executioner.value) {
    buffs.push({ name: `処刑人 ×${executioner.value}`, expiresAt: executioner.expiresAt ?? 0 });
  }
  const sacrificiumReady = snapshot.jobState.sacrificiumReady;
  if (sacrificiumReady?.kind === "flag" && sacrificiumReady.active) {
    buffs.push({ name: "サクリフィキウム実行可", expiresAt: enshroudUntil });
  }
  const immortalSacrifice = snapshot.jobState.immortalSacrifice;
  if (immortalSacrifice?.kind === "counter" && immortalSacrifice.value) {
    buffs.push({ name: `死の供物 ×${immortalSacrifice.value}`, expiresAt: Number.MAX_SAFE_INTEGER });
  }
  return buffs;
}

export function StatusPanel({ snapshot, displayTime }: StatusPanelProps) {
  const buffs = buildReaperBuffs(snapshot, displayTime);
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
