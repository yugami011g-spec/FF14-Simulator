import { useEffect, useRef, useState } from "react";
import type { SimSettings } from "../types/state";
import type { HistoryEntry, WaitEntry } from "../types/history";
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
  onDeleteEntry,
}: TimelinePanelProps) {
  const scrub = useTimelineScrub(chartRef, settings, history, (time) => onSetDisplayTime?.(time));
  useTimelinePan(scrollRef);

  const contentStart = getTimelineContentStart(settings);
  const contentEnd = getTimelineContentEnd(settings, history);
  const contentDuration = getTimelineContentDuration(settings, history);
  const trackWidth = TIMELINE_BASE_WIDTH * (contentDuration / TIMELINE_DURATION);
  const latestPositionPx = (Math.max(0, Math.min((displayTime - contentStart) / contentDuration, 1))) * trackWidth;

  // ライブ入力(スキル/待機の追加)でタイムラインが伸びたときだけ、最新位置(表示位置インジケーター)が
  // 見える位置まで自動で右へスクロール追従する。ベースの表示尺(35秒分)自体は常に確保されているため、
  // scrollWidth基準で末尾へ飛ばすと、実際にはまだ短い回しでもベース末尾(35秒地点)まで飛んでしまう
  // ―― そのため実際の最新位置の座標を基準にする。プレビュー中(過去確認スクラブ中)は追従しない。
  // latestPositionPxはアイコンの「左端」(usedAt/castStartAt)の座標で、アイコン自体はそこから
  // 右へ最大44px(GCDアイコン幅)描画されるため、右端が見切れないよう分だけ余白を足す。
  const prevHistoryLengthRef = useRef(history.length);
  useEffect(() => {
    const grew = history.length > prevHistoryLengthRef.current;
    prevHistoryLengthRef.current = history.length;
    const scrollEl = scrollRef.current;
    if (grew && !isPreviewing && scrollEl) {
      const iconWidth = 44;
      const breathingRoom = 30;
      scrollEl.scrollLeft = Math.max(0, latestPositionPx + iconWidth + breathingRoom - scrollEl.clientWidth);
    }
  }, [history.length, isPreviewing, scrollRef, latestPositionPx]);

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
                      <span className="timeline-effect-label">{effect.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div
              className={`time-indicator${isPreviewing ? " is-previewing" : ""}`}
              style={{ left: `${latestPositionPx}px` }}
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
  onDelete,
}: {
  entry: HistoryEntry;
  skills: Record<string, Skill<any>>;
  contentStart: number;
  contentDuration: number;
  onDelete?: (id: string) => void;
}) {
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
      <WaitTile
        entry={entry}
        contentStart={contentStart}
        contentDuration={contentDuration}
        onDelete={onDelete}
      />
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
      title={`${castLabel} / 威力 ${entry.potency}${entry.clipping ? ` / 食い込み ${entry.clipping.toFixed(2)}s` : ""} / ホバーの×で削除`}
    >
      <img className="skill-icon" src={`${import.meta.env.BASE_URL}assets/icons/${entry.skillId}.png`} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
      <span className="skill-name-fallback">{shortName}</span>
      {deleteButton}
    </button>
  );
}

// 待機は直前アクションと同じ時刻から始まることが多く、アクションアイコン(44px固定幅)の下に
// 完全に隠れることがある。削除×はホバー時だけ出す挙動を維持したいが、CSSの:hoverだと
// アクション(z-index:1)に覆われている間は待機自体へマウスの当たり判定が届かずホバーが
// 発火しないため、React stateでホバー管理する。削除×はaction本体の子要素ではなく独立した
// 兄弟要素にし、アクションより手前(z-index)に置く(子のz-indexは親のスタッキング階層を
// 超えられないため)。ボタンと削除×をdisplay:contentsの共通親でまとめ、削除×自体にマウスが
// 乗ってもグループとしてはホバー継続扱いにし、出た瞬間に消えるちらつきを防ぐ。
function WaitTile({
  entry,
  contentStart,
  contentDuration,
  onDelete,
}: {
  entry: WaitEntry;
  contentStart: number;
  contentDuration: number;
  onDelete?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const leftPercent = ((entry.usedAt - contentStart) / contentDuration) * 100;
  const widthPercent = (entry.duration / contentDuration) * 100;

  return (
    <div style={{ display: "contents" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        type="button"
        className="timeline-action is-wait"
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
        title={`${entry.usedAt.toFixed(2)}s → ${entry.endAt.toFixed(2)}s（待機${entry.duration.toFixed(1)}秒） / ホバーの×で削除`}
      >
        待機 {entry.duration.toFixed(1)}s
      </button>
      {hovered && (
        <span
          className="timeline-action-delete timeline-wait-delete"
          role="button"
          aria-label="削除"
          style={{ left: `calc(${leftPercent + widthPercent}% - 14px)` }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.(entry.id);
          }}
        >
          ×
        </span>
      )}
    </div>
  );
}
