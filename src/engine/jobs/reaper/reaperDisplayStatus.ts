import type { DisplayStatus, SimSnapshot } from "../../../types/state";
import { isEnshrouded } from "./reaperState";

// レムール状態・妖異の鎌・処刑人・サクリフィキウム実行可・死の供物は、宣言的な buffs/debuffs
// ではなくジョブ固有の jobState として管理されているため、StatusPanelのバフ欄への表示だけ
// この場でバフ風に変換します(job.getDisplayStatusesフック経由。snapshot.buffsの生データには
// 追加分として合流する)。
export function getDisplayStatuses(snapshot: SimSnapshot, displayTime: number): DisplayStatus[] {
  const statuses: DisplayStatus[] = [];

  const enshroudUntil = snapshot.jobState.enshroudUntil?.kind === "counter" ? snapshot.jobState.enshroudUntil.value : 0;
  if (isEnshrouded(snapshot, displayTime)) {
    statuses.push({ name: "レムール", expiresAt: enshroudUntil });
  }
  const soulReaver = snapshot.jobState.soulReaver;
  if (soulReaver?.kind === "counter" && soulReaver.value) {
    statuses.push({ name: `妖異の鎌 ×${soulReaver.value}`, expiresAt: soulReaver.expiresAt ?? 0 });
  }
  const executioner = snapshot.jobState.executioner;
  if (executioner?.kind === "counter" && executioner.value) {
    statuses.push({ name: `処刑人 ×${executioner.value}`, expiresAt: executioner.expiresAt ?? 0 });
  }
  const sacrificiumReady = snapshot.jobState.sacrificiumReady;
  if (sacrificiumReady?.kind === "flag" && sacrificiumReady.active) {
    statuses.push({ name: "サクリフィキウム実行可", expiresAt: enshroudUntil });
  }
  const immortalSacrifice = snapshot.jobState.immortalSacrifice;
  if (immortalSacrifice?.kind === "counter" && immortalSacrifice.value) {
    statuses.push({ name: `死の供物 ×${immortalSacrifice.value}`, expiresAt: Number.MAX_SAFE_INTEGER });
  }
  return statuses;
}
