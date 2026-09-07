import type { JobDefinition } from "../../types/job";
import type { KnightJobEffects } from "./types";
import { skills } from "./skills";
import { actionSlots } from "./actionSlots";
import { buffNames } from "./buffNames";
import { INITIAL_KNIGHT_JOB_STATE } from "../../engine/jobs/knight/knightState";
import { matchesSlotCondition, isResourceUnavailable, normalizeTimedState, isRecommended } from "../../engine/jobs/knight/knightGating";
import { applyJobEffects, resolveDynamicPotency } from "../../engine/jobs/knight/knightJobEffects";

export const knightJobDefinition: JobDefinition<KnightJobEffects> = {
  id: "knight",
  label: "ナイト",
  skills,
  actionSlots,
  gaugeDefs: [
    // 現状は表示のみで増減ロジック未実装(常に0)。詳細はskills.ts先頭のスコープコメント、
    // engineering/docs/multi-job-ui-design.md参照。
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
};
