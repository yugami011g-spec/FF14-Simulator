import { useMemo } from "react";
import type { JobDefinition } from "../types/job";
import type { Skill } from "../types/skill";
import type { SimSettings, SimSnapshot } from "../types/state";
import type { HistoryEntry } from "../types/history";
import { getActiveSlotSkill } from "../engine/gating";
import { SkillButton } from "./SkillButton";

interface SkillPanelProps {
  job: JobDefinition<any>;
  snapshot: SimSnapshot;
  elapsedTime: number;
  settings: SimSettings;
  history: HistoryEntry[];
  isPreviewing: boolean;
  canUndo: boolean;
  message: string;
  chartRef: React.RefObject<HTMLElement | null>;
  gcdTrackRef: React.RefObject<HTMLElement | null>;
  abilityTrackRef: React.RefObject<HTMLElement | null>;
  onUseSkill?: (skillId: string) => void;
  onWait?: (duration: number) => void;
  onUndo?: () => void;
  onGcdSettingChange?: (value: number) => void;
  onShowTooltip?: (anchorEl: HTMLElement, baseSkillId: string) => void;
  onHideTooltip?: () => void;
  onInsertSkill?: (skillId: string, targetTime: number) => void;
  showGhost: (x: number, y: number, skillId: string, label: string) => void;
  moveGhost: (x: number, y: number) => void;
  hideGhost: () => void;
}

const WAIT_OPTIONS = [0.5, 1, 2.5];

interface SkillEntry {
  base: Skill<any>;
  active: Skill<any>;
}

// baseSkill.row(未指定は0)でグリッドを複数行に分ける。例: ウェポンスキル/魔法の1行目に単体
// 主体のコンボ、2行目に範囲技だけをまとめる、アビリティの1行目に攻撃系、2行目に防御バフだけ
// まとめる、といった用途。
function groupByRow(entries: SkillEntry[]): SkillEntry[][] {
  const byRow = new Map<number, SkillEntry[]>();
  for (const entry of entries) {
    const row = entry.base.row ?? 0;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)!.push(entry);
  }
  return [...byRow.entries()].sort(([a], [b]) => a - b).map(([, list]) => list);
}

export function SkillPanel({
  job,
  snapshot,
  elapsedTime,
  settings,
  history,
  isPreviewing,
  canUndo,
  message,
  chartRef,
  gcdTrackRef,
  abilityTrackRef,
  onUseSkill,
  onWait,
  onUndo,
  onGcdSettingChange,
  onShowTooltip,
  onHideTooltip,
  onInsertSkill,
  showGhost,
  moveGhost,
  hideGhost,
}: SkillPanelProps) {
  const slotsByBase = useMemo(() => new Map(job.actionSlots.map((slot) => [slot.base, slot])), [job]);
  const slotVariantSkillIds = useMemo(
    () => new Set(job.actionSlots.flatMap((slot) => slot.variants.map((variant) => variant.skillId))),
    [job],
  );

  const groups: Record<"weaponskill" | "ability" | "role", SkillEntry[]> = {
    weaponskill: [],
    ability: [],
    role: [],
  };

  for (const baseSkill of Object.values(job.skills)) {
    if (slotVariantSkillIds.has(baseSkill.id)) continue;
    const slot = slotsByBase.get(baseSkill.id);
    const activeSkill = slot ? getActiveSlotSkill(job, slot, snapshot, elapsedTime) : baseSkill;
    const bucket = baseSkill.category === "role" ? "role" : baseSkill.type === "ability" ? "ability" : "weaponskill";
    groups[bucket].push({ base: baseSkill, active: activeSkill });
  }

  function renderGrid(entries: SkillEntry[], key: string | number) {
    return (
      <div className="action-grid" key={key}>
        {entries.map(({ base, active }) => (
          <SkillButton
            key={base.id}
            baseSkill={base}
            activeSkill={active}
            job={job}
            snapshot={snapshot}
            elapsedTime={elapsedTime}
            settings={settings}
            history={history}
            isPreviewing={isPreviewing}
            onUse={onUseSkill}
            onShowTooltip={onShowTooltip}
            onHideTooltip={onHideTooltip}
            onInsert={onInsertSkill}
            chartRef={chartRef}
            gcdTrackRef={gcdTrackRef}
            abilityTrackRef={abilityTrackRef}
            showGhost={showGhost}
            moveGhost={moveGhost}
            hideGhost={hideGhost}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="panel skills-panel">
      <header className="panel-header">
        <h2>スキル操作</h2>
        <div className="skill-settings">
          <button className="button button-small" type="button" disabled={!canUndo} onClick={onUndo}>
            1手戻す
          </button>
          <label className="gcd-setting">
            GCD設定
            <input
              type="number"
              min={1}
              step={0.01}
              defaultValue={settings.gcdSetting.toFixed(2)}
              onChange={(event) => onGcdSettingChange?.(Number(event.target.value))}
            />
            秒
          </label>
        </div>
      </header>
      <div className="panel-body">
        <section className="skill-category">
          <h3>ウェポンスキル/魔法</h3>
          {groupByRow(groups.weaponskill).map((row, index) => renderGrid(row, index))}
        </section>
        <section className="skill-category">
          <h3>アビリティ</h3>
          {groupByRow(groups.ability).map((row, index) => renderGrid(row, index))}
        </section>
        <section className="skill-category">
          <h3>ロールアクション／他</h3>
          {groupByRow(groups.role).map((row, index) => renderGrid(row, index))}
        </section>
        <section className="skill-category">
          <h3>時間操作</h3>
          <div className="action-grid wait-grid">
            {WAIT_OPTIONS.map((duration) => (
              <button key={duration} className="action-tile wait-tile" type="button" onClick={() => onWait?.(duration)}>
                <strong>待機{duration.toFixed(1)}</strong>
                <small>入力</small>
              </button>
            ))}
          </div>
        </section>
        <p className="action-message" aria-live="polite">
          {message}
        </p>
      </div>
    </section>
  );
}
