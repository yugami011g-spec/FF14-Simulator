import { describe, expect, it } from "vitest";
import { reaperJobDefinition } from "../../data/reaper/jobDefinition";
import { appendSkillEntry, buildEntriesAfterDelete, buildEntriesAfterUndo } from "../editOps";
import { initialSnapshot, replay } from "../replay";
import { isEnshrouded } from "../jobs/reaper/reaperState";
import type { SimSettings } from "../../types/state";
import type { ReplayEntry } from "../../types/history";

const settings: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 };
const job = reaperJobDefinition;

function withSkills(...skillIds: string[]): ReplayEntry[] {
  return skillIds.reduce<ReplayEntry[]>((entries, skillId) => appendSkillEntry(entries, skillId), []);
}

describe("replay determinism", () => {
  it("returns deep-equal results for the same input across repeated calls", () => {
    const entries = withSkills("slice", "waxingSlice", "infernalSlice");
    const first = replay(entries, settings, job);
    const second = replay(entries, settings, job);
    expect(second.final).toEqual(first.final);
    expect(second.history).toEqual(first.history);
    expect(second.effectHistory).toEqual(first.effectHistory);
  });

  it("never mutates the entries array passed in", () => {
    const entries = withSkills("slice", "waxingSlice");
    const snapshotBefore = JSON.stringify(entries);
    replay(entries, settings, job);
    expect(JSON.stringify(entries)).toBe(snapshotBefore);
  });
});

describe("combo chain potency", () => {
  it("applies comboPotency across slice -> waxingSlice -> infernalSlice", () => {
    const entries = withSkills("slice", "waxingSlice", "infernalSlice");
    const result = replay(entries, settings, job);
    expect(result.droppedNames).toEqual([]);
    expect(result.history).toHaveLength(3);
    expect(result.history[0]).toMatchObject({ skillId: "slice", potency: 420, comboSuccess: false });
    expect(result.history[1]).toMatchObject({ skillId: "waxingSlice", potency: 500, comboSuccess: true });
    expect(result.history[2]).toMatchObject({ skillId: "infernalSlice", potency: 600, comboSuccess: true });
    expect(result.final.totalPotency).toBe(420 + 500 + 600);
  });

  it("drops back to base potency when the combo chain is broken", () => {
    // slice(コンボ1開始) -> shadowOfDeath(コンボ非関与、状態を変えない) -> infernalSlice(コンボ2待ちだが実際は1のまま)
    const entries = withSkills("slice", "infernalSlice");
    const result = replay(entries, settings, job);
    expect(result.history[1]).toMatchObject({ skillId: "infernalSlice", potency: 280, comboSuccess: false });
  });
});

describe("enshroud lifecycle (direct unit test of applyJobEffects, avoids fragile hand-built rotations)", () => {
  it("enterEnshroud grants 5 lemure stacks + a 30s window and costs 50 shroud gauge", () => {
    const base = initialSnapshot(settings, job);
    const withShroudGauge = { ...base, gauges: { ...base.gauges, shroud: 50 } };
    const afterEnshroud = job.applyJobEffects(job.skills.enshroud, withShroudGauge, 0, false, settings.leadInDuration);

    expect(afterEnshroud.gauges.shroud).toBe(0);
    expect(afterEnshroud.jobState.lemure).toEqual({ kind: "counter", value: 5 });
    expect(afterEnshroud.jobState.void).toEqual({ kind: "counter", value: 0 });
    expect(afterEnshroud.jobState.enshroudUntil).toEqual({ kind: "counter", value: 30 });
    expect(isEnshrouded(afterEnshroud, 0)).toBe(true);
    expect(isEnshrouded(afterEnshroud, 30)).toBe(false); // ちょうど30秒で失効(> ではなく厳密比較)
  });

  it("voidReaping consumes 1 lemure, gains 1 void, and sets reapingCombo to cross", () => {
    const base = initialSnapshot(settings, job);
    const enshrouded = job.applyJobEffects(job.skills.enshroud, { ...base, gauges: { ...base.gauges, shroud: 50 } }, 0, false, 0);

    const afterVoidReaping = job.applyJobEffects(job.skills.voidReaping, enshrouded, 2.5, false, 0);
    expect(afterVoidReaping.jobState.lemure).toEqual({ kind: "counter", value: 4 });
    expect(afterVoidReaping.jobState.void).toEqual({ kind: "counter", value: 1 });
    expect(afterVoidReaping.jobState.reapingCombo).toEqual({ kind: "mode", value: "cross" });
  });

  it("exitEnshroud (via communio) clears lemure/void/enshroudUntil/reapingCombo entirely", () => {
    const base = initialSnapshot(settings, job);
    const enshrouded = job.applyJobEffects(job.skills.enshroud, { ...base, gauges: { ...base.gauges, shroud: 50 } }, 0, false, 0);
    const afterVoidReaping = job.applyJobEffects(job.skills.voidReaping, enshrouded, 2.5, false, 0);

    const afterCommunio = job.applyJobEffects(job.skills.communio, afterVoidReaping, 5, false, 0);
    expect(afterCommunio.jobState.lemure).toEqual({ kind: "counter", value: 0 });
    expect(afterCommunio.jobState.void).toEqual({ kind: "counter", value: 0 });
    expect(afterCommunio.jobState.enshroudUntil).toEqual({ kind: "counter", value: 0 });
    expect(afterCommunio.jobState.reapingCombo).toEqual({ kind: "mode", value: null });
    expect(isEnshrouded(afterCommunio, 5)).toBe(false);
  });

  it("dynamicPotency immortalSacrifice formula: 720 + max(0, stacks-1)*40", () => {
    const base = initialSnapshot(settings, job);
    expect(job.resolveDynamicPotency?.("immortalSacrifice", { ...base, jobState: { ...base.jobState, immortalSacrifice: { kind: "counter", value: 0 } } }, 0)).toBe(720);
    expect(job.resolveDynamicPotency?.("immortalSacrifice", { ...base, jobState: { ...base.jobState, immortalSacrifice: { kind: "counter", value: 1 } } }, 0)).toBe(720);
    expect(job.resolveDynamicPotency?.("immortalSacrifice", { ...base, jobState: { ...base.jobState, immortalSacrifice: { kind: "counter", value: 8 } } }, 0)).toBe(720 + 7 * 40);
  });
});

describe("full-rotation replay via editOps (reflow semantics: auto-waits through individual recast/charges)", () => {
  it("lets a 12-step rotation with repeated soulSlice charge exhaustion fully succeed by auto-waiting", () => {
    const entries: ReplayEntry[] = [
      ...withSkills("soulSlice", "stalkSwathe", "gibbet", "soulSlice", "stalkSwathe", "gallows"),
      ...withSkills("soulSlice", "stalkSwathe", "gibbet", "soulSlice", "stalkSwathe", "gallows"),
    ];
    const result = replay(entries, settings, job);
    // 検証済み(scripts/probe.ts): totalPotency=5620, gauges={soul:0, shroud:40}, 12件全て成功(historyLen=12)
    expect(result.droppedNames).toEqual([]);
    expect(result.history).toHaveLength(12);
    expect(result.final.totalPotency).toBe(5620);
    expect(result.final.gauges.soul).toBe(0);
    expect(result.final.gauges.shroud).toBe(40);
  });
});

describe("delete then replay drops now-invalid follow-ups", () => {
  it("removes a soulSlice charge use and drops a later action that depended on it", () => {
    const entries = withSkills("soulSlice", "soulSlice", "gibbet");
    const first = replay(entries, settings, job);
    // ジビトゥは妖異の鎌が無いと不成立でdropされているはず(ストークスウェーズを挟んでいないため)。
    expect(first.droppedNames).toContain("ジビトゥ");

    const withoutFirstSoulSlice = buildEntriesAfterDelete(first.history, first.history[0].id);
    const second = replay(withoutFirstSoulSlice, settings, job);
    expect(second.history.some((entry) => entry.kind === "skill" && entry.skillId === "soulSlice")).toBe(true);
  });
});

describe("undo", () => {
  it("removes the last entry without affecting earlier timing", () => {
    const entries = withSkills("slice", "waxingSlice", "infernalSlice");
    const full = replay(entries, settings, job);
    const undone = buildEntriesAfterUndo(full.history);
    const result = replay(undone, settings, job);
    expect(result.history).toHaveLength(2);
    expect(result.history[0].usedAt).toBe(full.history[0].usedAt);
    expect(result.history[1].usedAt).toBe(full.history[1].usedAt);
  });
});

describe("GCD setting change re-times the whole rotation", () => {
  it("shifts every subsequent GCD skill landing time when gcdSetting changes", () => {
    const entries = withSkills("slice", "waxingSlice", "infernalSlice");
    const base = replay(entries, { ...settings, gcdSetting: 2.5 }, job);
    const faster = replay(entries, { ...settings, gcdSetting: 2.0 }, job);
    expect(faster.history[1].usedAt).toBeLessThan(base.history[1].usedAt);
    expect(faster.history[2].usedAt).toBeLessThan(base.history[2].usedAt);
    expect(faster.final.totalPotency).toBe(base.final.totalPotency);
  });
});
