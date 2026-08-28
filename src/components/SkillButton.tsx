import { useRef, useState } from "react";
import type { Skill } from "../types/skill";
import type { SimSettings, SimSnapshot } from "../types/state";
import type { JobDefinition } from "../types/job";
import type { HistoryEntry } from "../types/history";
import { getResourceUnavailableReason } from "../engine/gating";
import { getAvailableCharges, getCooldownRemaining, getNextChargeRemaining } from "../engine/cooldowns";
import { isComboSuccess, matchesEnhancedMode } from "../engine/potency";
import { useSkillInsertDrag } from "../hooks/useSkillInsertDrag";

interface SkillButtonProps {
  baseSkill: Skill<any>;
  activeSkill: Skill<any>;
  job: JobDefinition<any>;
  snapshot: SimSnapshot;
  elapsedTime: number;
  settings: SimSettings;
  history: HistoryEntry[];
  isPreviewing: boolean;
  chartRef: React.RefObject<HTMLElement | null>;
  gcdTrackRef: React.RefObject<HTMLElement | null>;
  abilityTrackRef: React.RefObject<HTMLElement | null>;
  onUse?: (skillId: string) => void;
  onShowTooltip?: (anchorEl: HTMLElement, skill: Skill<any>) => void;
  onHideTooltip?: () => void;
  onInsert?: (skillId: string, targetTime: number) => void;
  showGhost: (x: number, y: number, skillId: string, label: string) => void;
  moveGhost: (x: number, y: number) => void;
  hideGhost: () => void;
}

export function SkillButton({
  baseSkill,
  activeSkill,
  job,
  snapshot,
  elapsedTime,
  settings,
  history,
  isPreviewing,
  chartRef,
  gcdTrackRef,
  abilityTrackRef,
  onUse,
  onShowTooltip,
  onHideTooltip,
  onInsert,
  showGhost,
  moveGhost,
  hideGhost,
}: SkillButtonProps) {
  const [iconFailed, setIconFailed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const skill = activeSkill;

  const resourceReason = getResourceUnavailableReason(skill, snapshot, elapsedTime, settings, job);
  const cooldownRemaining = getCooldownRemaining(skill, snapshot, elapsedTime, settings.leadInDuration);
  const isPersonallyCooling = cooldownRemaining > 0;
  const charges = getAvailableCharges(skill, snapshot, elapsedTime);
  const badgeRemaining = skill.maxCharges ? getNextChargeRemaining(skill, snapshot, elapsedTime) : cooldownRemaining;

  const isComboAction = isComboSuccess(skill, snapshot, elapsedTime);
  const isEnhancedReaping = Boolean(skill.enhancedBy && matchesEnhancedMode(snapshot, skill.enhancedBy));
  const isReadyJobAction = Boolean(skill.requirements) && !resourceReason;
  const isReplaced = skill.id !== baseSkill.id;

  const classNames = [
    "action-tile",
    "skill-button",
    isPersonallyCooling || resourceReason ? "is-cooling" : "",
    isComboAction || isEnhancedReaping || isReadyJobAction ? "is-combo" : "",
    isReplaced ? "is-replaced" : "",
    isPreviewing ? "is-previewing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showTooltip = () => {
    if (buttonRef.current) onShowTooltip?.(buttonRef.current, skill);
  };

  const drag = useSkillInsertDrag({
    activeSkill: skill,
    chartRef,
    gcdTrackRef,
    abilityTrackRef,
    settings,
    history,
    onInsert: (skillId, targetTime) => onInsert?.(skillId, targetTime),
    onClick: (skillId) => onUse?.(skillId),
    showGhost: (x, y, skillId, label) => {
      onHideTooltip?.();
      showGhost(x, y, skillId, label);
    },
    moveGhost,
    hideGhost,
  });

  return (
    <button
      ref={buttonRef}
      type="button"
      className={classNames}
      data-skill-id={baseSkill.id}
      onClick={drag.onClick}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onPointerEnter={showTooltip}
      onPointerLeave={onHideTooltip}
      onFocus={showTooltip}
      onBlur={onHideTooltip}
    >
      <strong>
        {!iconFailed && <img className="skill-icon" alt="" src={`${import.meta.env.BASE_URL}assets/icons/${skill.id}.png`} onError={() => setIconFailed(true)} />}
        {iconFailed && <span className="skill-name-fallback">{skill.shortName || skill.name}</span>}
        <em className="recast-time">{badgeRemaining > 0 ? `${badgeRemaining.toFixed(1)}s` : ""}</em>
        <i className="charge-badge">{charges === null ? "" : charges}</i>
      </strong>
    </button>
  );
}
