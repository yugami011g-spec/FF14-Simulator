import type { JobDefinition } from "../../types/job";
import type { ReaperJobEffects } from "./types";
import { skills } from "./skills";
import { actionSlots } from "./actionSlots";
import { buffNames } from "./buffNames";
import { INITIAL_REAPER_JOB_STATE } from "../../engine/jobs/reaper/reaperState";
import { matchesSlotCondition, isResourceUnavailable, normalizeTimedState, isRecommended } from "../../engine/jobs/reaper/reaperGating";
import { applyJobEffects, resolveDynamicPotency } from "../../engine/jobs/reaper/reaperJobEffects";
import { getDisplayStatuses } from "../../engine/jobs/reaper/reaperDisplayStatus";
import { ReaperGaugeExtras } from "./ReaperGaugeExtras";

export const reaperJobDefinition: JobDefinition<ReaperJobEffects> = {
  id: "reaper",
  label: "リーパー",
  skills,
  actionSlots,
  gaugeDefs: [
    { key: "soul", label: "ソウルゲージ", max: 100 },
    { key: "shroud", label: "シュラウドゲージ", max: 100, color: "var(--red)" },
  ],
  stackDefs: [
    { key: "lemure", label: "レムール", maxDots: 5 },
    { key: "void", label: "ヴォイド", maxDots: 5 },
  ],
  buffNames,
  initialJobState: INITIAL_REAPER_JOB_STATE,
  // ソウルソウは常時得ている前提のバフとして扱うため、シミュレーション開始時点から
  // 付与済みにする(applyPersistentBuffが生成する形と揃える)。
  initialBuffs: {
    soulSow: { type: "buff", id: "soulSow", name: "ソウルソウ", showOnTimeline: false, appliedAt: 0, expiresAt: Number.MAX_SAFE_INTEGER },
  },
  matchesSlotCondition,
  isResourceUnavailable,
  applyJobEffects,
  resolveDynamicPotency,
  normalizeTimedState,
  isRecommended,
  renderCustomGaugeExtras: (snapshot) => <ReaperGaugeExtras snapshot={snapshot} />,
  getDisplayStatuses,
};
