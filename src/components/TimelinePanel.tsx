import type { SimSettings } from "../types/state";
import type { HistoryEntry } from "../types/history";
import type { Skill } from "../types/skill";
import {
  TIMELINE_BASE_WIDTH,
  TIMELINE_DURATION,
  formatCombatDuration,
  getTimelineContentDuration,
  getTimelineContentEnd,
  getTimelineContentStart,
  parseCombatDurationInput,
  assignEffectLanes,
} from "../engine/timelineMath";
import { useTimelineScrub } from "../hooks/useTimelineScrub";
import { useTimelinePan } from "../hooks/useTimelinePan";
import { useTimelineTileDrag } from "../hooks/useTimelineTileDrag";

interface TimelinePanelProps {
  settings: SimSettings;
  history: HistoryEntry[];
  effectHistory: import("../types/state").StatusEffect[];
  skills: Record<string, Skill<any>>;
  displayTime: number;
  totalPotency: number;
  isPreviewing: boolean;
  chartRef: React.RefObject<HTMLDivElement | null>;
  gcdTrackRef: React.RefObject<HTMLDivElement | null>;
  abilityTrackRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onReturnToLatest?: () => void;
  onLeadInChange?: (value: number) => void;
  onCombatDurationChange?: (seconds: number) => void;
  onSetDisplayTime?: (time: number | null) => void;
  onMoveEntry?: (id: string, targetTime: number) => void;
  onDeleteEntry?: (id: string) => void;
}

const EFFECT_LANE_HEIGHT = 20;
const EFFECT_ROW_MIN_HEIGHT = 76;

export function TimelinePanel({
  settings,
  history,
  effectHistory,
  skills,
  displayTime,
  totalPotency,
  isPreviewing,
  chartRef,
  gcdTrackRef,
  abilityTrackRef,
  scrollRef,
  onReturnToLatest,
  onLeadInChange,
  onCombatDurationChange,
  onSetDisplayTime,
  onMoveEntry,
  onDeleteEntry,
}: TimelinePanelProps) {
  const scrub = useTimelineScrub(chartRef, settings, history, (time) => onSetDisplayTime?.(time));
  useTimelinePan(scrollRef);

  const contentStart = getTimelineContentStart(settings);
  const contentEnd = getTimelineContentEnd(settings, history);
  const contentDuration = getTimelineContentDuration(settings, history);
  const trackWidth = TIMELINE_BASE_WIDTH * (contentDuration / TIMELINE_DURATION);

  const firstTick = Math.ceil(contentStart / 5) * 5;
  const ticks: number[] = [];
  for (let seconds = firstTick; seconds <= contentEnd; seconds += 5) {
    ticks.push(seconds);
  }

  const gcdEntries = history.filter((entry) => entry.kind === "wait" || entry.type !== "ability");
  const abilityEntries = history.filter((entry) => entry.kind === "skill" && entry.type === "ability");

  const timelineEffects = effectHistory.filter((effect) => effect.showOnTimeline && effect.appliedAt < contentEnd);
  const { lanes, laneCount } = assignEffectLanes(timelineEffects);
  const effectRowHeight = Math.max(EFFECT_ROW_MIN_HEIGHT, laneCount * EFFECT_LANE_HEIGHT + 16);

  const indicatorRatio = Math.max(0, Math.min((displayTime - contentStart) / contentDuration, 1));

  return (
    <section className="panel timeline-panel">
      <header className="panel-header timeline-header">
        <h2>タイムライン</h2>
        <div className="timeline-settings">
          <label className="lead-in-setting">
            カウント
            <input
              type="number"
              min={0}
              max={30}
              step={1}
              defaultValue={settings.leadInDuration}
              onChange={(event) => onLeadInChange?.(Math.min(30, Math.max(0, Math.round(Number(event.target.value) || 0))))}
            />
            秒
          </label>
          <label className="lead-in-setting">
            戦闘時間
            <input
              type="text"
              placeholder="無制限"
              inputMode="numeric"
              defaultValue={formatCombatDuration(settings.combatDuration)}
              onChange={(event) => onCombatDurationChange?.(parseCombatDurationInput(event.target.value))}
            />
          </label>
        </div>
        <div className="timeline-summary">
          <button className="button button-small" type="button" hidden={!isPreviewing} onClick={onReturnToLatest}>
            最新へ戻る
          </button>
          <span>
            表示位置 <strong>{displayTime.toFixed(2)}s</strong>
          </span>
          <span>
            合計威力 <strong>{totalPotency.toLocaleString("ja-JP")}</strong>
          </span>
        </div>
      </header>
      <div className="timeline-body">
        <div className="timeline-row-labels">
          <div className="timeline-row-labels-spacer" />
          <div className="timeline-row-label">GCD</div>
          <div className="timeline-row-label">アビ</div>
          <div className="timeline-row-label timeline-row-label-effect" style={{ height: `${effectRowHeight}px` }}>
            効果時間
          </div>
        </div>
        <div className="timeline-scroll" ref={scrollRef}>
          <div className="timeline-chart" ref={chartRef} style={{ width: `${trackWidth + 48}px` }}>
            <div
              className="timeline-ticks"
              onPointerDown={scrub.onPointerDown}
              onPointerMove={scrub.onPointerMove}
              onPointerUp={scrub.onPointerUp}
              onPointerCancel={scrub.onPointerCancel}
            >
              {ticks.map((seconds) => (
                <span key={seconds} className="timeline-tick" style={{ left: `${((seconds - contentStart) / contentDuration) * 100}%` }}>
                  {seconds}s
                </span>
              ))}
            </div>
            <div className="timeline-axis" />
            <div className="timeline-row timeline-row-gcd">
              <div className="timeline-track" ref={gcdTrackRef}>
                {gcdEntries.map((entry) => (
                  <TimelineTile
                    key={entry.id}
                    entry={entry}
                    skills={skills}
                    contentStart={contentStart}
                    contentDuration={contentDuration}
                    settings={settings}
                    history={history}
                    onMove={onMoveEntry}
                    onDelete={onDeleteEntry}
                  />
                ))}
              </div>
            </div>
            <div className="timeline-row timeline-row-ability">
              <div className="timeline-track" ref={abilityTrackRef}>
                {abilityEntries.map((entry) => (
                  <TimelineTile
                    key={entry.id}
                    entry={entry}
                    skills={skills}
                    contentStart={contentStart}
                    contentDuration={contentDuration}
                    settings={settings}
                    history={history}
                    onMove={onMoveEntry}
                    onDelete={onDeleteEntry}
                  />
                ))}
              </div>
            </div>
            <div className="timeline-row timeline-row-effect" style={{ height: `${effectRowHeight}px` }}>
              <div className={`timeline-track${timelineEffects.length > 0 ? " has-effects" : " timeline-effect-empty"}`}>
                {timelineEffects.map((effect, index) => {
                  const start = (effect.appliedAt - contentStart) / contentDuration;
                  const end = (Math.min(effect.expiresAt, contentEnd) - contentStart) / contentDuration;
                  return (
                    <span
                      key={`${effect.id}-${index}`}
                      className={`timeline-effect timeline-effect-${effect.type}`}
                      style={{
                        left: `${start * 100}%`,
                        width: `${Math.max(0, end - start) * 100}%`,
                        top: `${8 + (lanes.get(effect) ?? 0) * EFFECT_LANE_HEIGHT}px`,
                      }}
                      title={`${effect.name}内：${effect.actionCount || 0}アクション / 威力${effect.potency || 0}`}
                    >
                      {effect.name}
                      {effect.potency ? ` ${effect.potency}` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
            <div
              className={`time-indicator${isPreviewing ? " is-previewing" : ""}`}
              style={{ left: `${indicatorRatio * trackWidth}px` }}
              onPointerDown={scrub.onPointerDown}
              onPointerMove={scrub.onPointerMove}
              onPointerUp={scrub.onPointerUp}
              onPointerCancel={scrub.onPointerCancel}
            >
              <span>{displayTime.toFixed(2)}s</span>
            </div>
            {settings.leadInDuration > 0 && (
              <div
                className="combat-start-marker"
                style={{ left: `${Math.max(0, Math.min((0 - contentStart) / contentDuration, 1)) * trackWidth}px` }}
              >
                <span>戦闘開始</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineTile({
  entry,
  skills,
  contentStart,
  contentDuration,
  settings,
  history,
  onMove,
  onDelete,
}: {
  entry: HistoryEntry;
  skills: Record<string, Skill<any>>;
  contentStart: number;
  contentDuration: number;
  settings: SimSettings;
  history: HistoryEntry[];
  onMove?: (id: string, targetTime: number) => void;
  onDelete?: (id: string) => void;
}) {
  const drag = useTimelineTileDrag({
    entry,
    settings,
    history,
    onMove: (id, targetTime) => onMove?.(id, targetTime),
  });

  const deleteButton = (
    <span
      className="timeline-action-delete"
      role="button"
      aria-label="削除"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onDelete?.(entry.id);
      }}
    >
      ×
    </span>
  );

  if (entry.kind === "wait") {
    return (
      <button
        type="button"
        className="timeline-action is-wait"
        style={{
          left: `${((entry.usedAt - contentStart) / contentDuration) * 100}%`,
          width: `${(entry.duration / contentDuration) * 100}%`,
        }}
        title={`${entry.usedAt.toFixed(2)}s → ${entry.endAt.toFixed(2)}s（待機${entry.duration.toFixed(1)}秒） / ドラッグで移動・ホバーの×で削除`}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
      >
        待機 {entry.duration.toFixed(1)}s
        {deleteButton}
      </button>
    );
  }
  const shortName = skills[entry.skillId]?.shortName || entry.skillName;
  const castLabel =
    entry.castStartAt !== entry.usedAt
      ? `詠唱開始${entry.castStartAt.toFixed(2)}s → 着弾${entry.usedAt.toFixed(2)}s`
      : `${entry.usedAt.toFixed(2)}s`;
  return (
    <button
      type="button"
      className={`timeline-action${entry.clipping > 0 ? " has-clipping" : ""}`}
      style={{ left: `${((entry.castStartAt - contentStart) / contentDuration) * 100}%` }}
      title={`${castLabel} / 威力 ${entry.potency}${entry.clipping ? ` / 食い込み ${entry.clipping.toFixed(2)}s` : ""} / ドラッグで移動・ホバーの×で削除`}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
    >
      <img className="skill-icon" src={`/assets/icons/${entry.skillId}.png`} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
      <span className="skill-name-fallback">{shortName}</span>
      {deleteButton}
    </button>
  );
}
