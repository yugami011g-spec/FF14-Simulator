import type { JobDefinition } from "../../types/job";
import type { KnightJobEffects } from "./types";
import { skills } from "./skills";
import { actionSlots } from "./actionSlots";
import { buffNames } from "./buffNames";
import { INITIAL_KNIGHT_JOB_STATE } from "../../engine/jobs/knight/knightState";
import { matchesSlotCondition, isResourceUnavailable, normalizeTimedState, isRecommended } from "../../engine/jobs/knight/knightGating";
import { applyJobEffects, resolveDynamicPotency, computeGaugeValue } from "../../engine/jobs/knight/knightJobEffects";
import { KnightGaugeExtras } from "./KnightGaugeExtras";

export const knightJobDefinition: JobDefinition<KnightJobEffects> = {
  id: "knight",
  label: "ナイト",
  skills,
  actionSlots,
  gaugeDefs: [
    // 表示値はcomputeGaugeValue(オートアタック間隔設定に基づく連続蓄積)で算出する。
    // 開幕(戦闘開始前を含む)は常に100からのスタート(INITIAL_KNIGHT_JOB_STATE.oathAnchor参照)。
    { key: "oath", label: "オウスゲージ", max: 100 },
  ],
  stackDefs: [],
  buffNames,
  initialJobState: INITIAL_KNIGHT_JOB_STATE,
  matchesSlotCondition,
  isResourceUnavailable,
  applyJobEffects,
  resolveDynamicPotency,
  normalizeTimedState,
  isRecommended,
  computeGaugeValue,
  renderCustomGaugeExtras: (_snapshot, _elapsedTime, settings, onSettingsChange) => (
    <KnightGaugeExtras settings={settings} onSettingsChange={onSettingsChange} />
  ),
};
