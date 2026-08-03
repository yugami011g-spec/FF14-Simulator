import type { JobDefinition } from "../../types/job";
import type { ReaperJobEffects } from "./types";
import { skills } from "./skills";
import { actionSlots } from "./actionSlots";
import { buffNames } from "./buffNames";
import { INITIAL_REAPER_JOB_STATE } from "../../engine/jobs/reaper/reaperState";
import { matchesSlotCondition, isResourceUnavailable, normalizeTimedState } from "../../engine/jobs/reaper/reaperGating";
import { applyJobEffects, resolveDynamicPotency } from "../../engine/jobs/reaper/reaperJobEffects";

export const reaperJobDefinition: JobDefinition<ReaperJobEffects> = {
  id: "reaper",
  skills,
  actionSlots,
  gaugeDefs: [
    { key: "soul", label: "ソウルゲージ", max: 100 },
    { key: "shroud", label: "シュラウドゲージ", max: 100 },
  ],
  stackDefs: [
    { key: "lemure", label: "レムール", maxDots: 5 },
    { key: "void", label: "ヴォイド", maxDots: 5 },
  ],
  buffNames,
  initialJobState: INITIAL_REAPER_JOB_STATE,
  matchesSlotCondition,
  isResourceUnavailable,
  applyJobEffects,
  resolveDynamicPotency,
  normalizeTimedState,
};
