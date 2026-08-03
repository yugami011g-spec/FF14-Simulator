import { useMemo } from "react";
import type { Skill } from "../types/skill";
import type { JobDefinition } from "../types/job";
import type { SimSettings, SimSnapshot } from "../types/state";
import type { HistoryEntry } from "../types/history";
import { getActiveSlotSkill } from "../engine/gating";
import { buildSkillTooltipData, type SkillTooltipData } from "../engine/tooltipText";
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
  onShowTooltip?: (anchorEl: HTMLElement, data: SkillTooltipData) => void;
  onHideTooltip?: () => void;
  onInsertSkill?: (skillId: string, targetTime: number) => void;
  showGhost: (x: number, y: number, skillId: string, label: string) => void;
  moveGhost: (x: number, y: number) => void;
  hideGhost: () => void;
}

const WAIT_OPTIONS = [0.5, 1, 2.5];

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

  const handleShowTooltip = (anchorEl: HTMLElement, skill: Skill<any>) => {
    onShowTooltip?.(anchorEl, buildSkillTooltipData(skill, snapshot, elapsedTime, settings, job, job.buffNames));
  };

  const groups: Record<"weaponskill" | "ability" | "role", { base: (typeof job.skills)[string]; active: (typeof job.skills)[string] }[]> = {
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
          <h3>ウェポンスキル</h3>
          <div className="action-grid">
            {groups.weaponskill.map(({ base, active }) => (
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
                onShowTooltip={handleShowTooltip}
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
        </section>
        <section className="skill-category">
          <h3>アビリティ</h3>
          <div className="action-grid">
            {groups.ability.map(({ base, active }) => (
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
                onShowTooltip={handleShowTooltip}
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
        </section>
        <section className="skill-category">
          <h3>ロールアクション／他</h3>
          <div className="action-grid">
            {groups.role.map(({ base, active }) => (
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
                onShowTooltip={handleShowTooltip}
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
