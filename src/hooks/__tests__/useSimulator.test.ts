// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { reaperJobDefinition } from "../../data/reaper/jobDefinition";
import { useSimulator } from "../useSimulator";

const job = reaperJobDefinition;

// M8: 各テストが前のテストの自動永続化(localStorage)の影響を受けないようにする。
beforeEach(() => {
  localStorage.clear();
});

describe("useSimulator (integration: hook wiring, not just the pure engine)", () => {
  it("clicking through a combo chain updates totalPotency/history via React state", () => {
    const { result } = renderHook(() => useSimulator(job));

    act(() => result.current.dispatch.useSkill("slice"));
    act(() => result.current.dispatch.useSkill("waxingSlice"));
    act(() => result.current.dispatch.useSkill("infernalSlice"));

    expect(result.current.history).toHaveLength(3);
    expect(result.current.final.totalPotency).toBe(420 + 500 + 600);
    expect(result.current.message).toBe("");
  });

  it("rejects a click when the individual charge/recast isn't ready and surfaces a message, matching legacy live-click behavior", () => {
    const { result } = renderHook(() => useSimulator(job));

    const rotation = [
      "soulSlice", "stalkSwathe", "gibbet",
      "soulSlice", "stalkSwathe", "gallows",
      "soulSlice", "stalkSwathe", "gibbet",
      "soulSlice", "stalkSwathe", "gallows",
    ];
    for (const skillId of rotation) {
      act(() => result.current.dispatch.useSkill(skillId));
    }

    // legacy cross-check (scripts/cross-check-legacy.cjs, live useSkill path):
    // totalPotency=2780, soulGauge=0, shroudGauge=20, historyCount=6
    expect(result.current.history).toHaveLength(6);
    expect(result.current.final.totalPotency).toBe(2780);
    expect(result.current.final.gauges.soul).toBe(0);
    expect(result.current.final.gauges.shroud).toBe(20);
    expect(result.current.message).not.toBe("");
  });

  it("undo removes the last entry via React state", () => {
    const { result } = renderHook(() => useSimulator(job));
    act(() => result.current.dispatch.useSkill("slice"));
    act(() => result.current.dispatch.useSkill("waxingSlice"));
    act(() => result.current.dispatch.undo());
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({ skillId: "slice" });
  });

  it("reset clears entries back to zero", () => {
    const { result } = renderHook(() => useSimulator(job));
    act(() => result.current.dispatch.useSkill("slice"));
    act(() => result.current.dispatch.reset());
    expect(result.current.history).toHaveLength(0);
    expect(result.current.final.totalPotency).toBe(0);
  });

  it("wait appends a wait entry and advances elapsed time", () => {
    const { result } = renderHook(() => useSimulator(job));
    act(() => result.current.dispatch.wait(2.5));
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({ kind: "wait", duration: 2.5 });
    expect(result.current.final.elapsedTime).toBe(2.5);
  });

  it("changing gcdSetting re-times the whole rotation live (no explicit rebuild call needed)", () => {
    const { result } = renderHook(() => useSimulator(job));
    act(() => result.current.dispatch.useSkill("slice"));
    act(() => result.current.dispatch.useSkill("waxingSlice"));
    const beforeUsedAt = result.current.history[1].usedAt;

    act(() => result.current.dispatch.updateGcdSetting(2.0));
    const afterUsedAt = result.current.history[1].usedAt;
    expect(afterUsedAt).toBeLessThan(beforeUsedAt);
    expect(result.current.final.totalPotency).toBe(420 + 500);
  });

  it("scrubbing to a past displayTime previews historical state without perturbing the live/final state (M6)", () => {
    const { result } = renderHook(() => useSimulator(job));
    act(() => result.current.dispatch.useSkill("slice"));
    act(() => result.current.dispatch.useSkill("waxingSlice"));
    act(() => result.current.dispatch.useSkill("infernalSlice"));

    const liveTotalPotency = result.current.final.totalPotency;
    const firstActionTime = result.current.history[0].usedAt;

    act(() => result.current.dispatch.setDisplayTime(firstActionTime));
    expect(result.current.isPreviewing).toBe(true);
    // 1手目の時点ではまだ1回分の威力しか乗っていないはず。
    expect(result.current.displaySnapshot.totalPotency).toBe(420);
    // スクラブ中でも最新状態(final)は変化しない。
    expect(result.current.final.totalPotency).toBe(liveTotalPotency);

    act(() => result.current.dispatch.setDisplayTime(null));
    expect(result.current.isPreviewing).toBe(false);
    expect(result.current.displaySnapshot.totalPotency).toBe(liveTotalPotency);
  });

  it("a live click while previewing the past snaps back to latest and appends at the end (M6, matches legacy useSkill contract)", () => {
    const { result } = renderHook(() => useSimulator(job));
    act(() => result.current.dispatch.useSkill("slice"));
    act(() => result.current.dispatch.useSkill("waxingSlice"));
    act(() => result.current.dispatch.setDisplayTime(result.current.history[0].usedAt));
    expect(result.current.isPreviewing).toBe(true);

    act(() => result.current.dispatch.useSkill("infernalSlice"));
    expect(result.current.isPreviewing).toBe(false);
    expect(result.current.history).toHaveLength(3);
    expect(result.current.history[2]).toMatchObject({ skillId: "infernalSlice", comboSuccess: true });
  });

  describe("M8: auto-persistence to localStorage", () => {
    it("restores entries and settings from a previous session on mount", () => {
      const first = renderHook(() => useSimulator(job));
      act(() => first.result.current.dispatch.useSkill("slice"));
      act(() => first.result.current.dispatch.useSkill("waxingSlice"));
      act(() => first.result.current.dispatch.updateGcdSetting(2.0));

      // 別セッション(再訪)を模してフックを新規マウントする。
      const second = renderHook(() => useSimulator(job));
      expect(second.result.current.history).toHaveLength(2);
      expect(second.result.current.history[0]).toMatchObject({ skillId: "slice" });
      expect(second.result.current.settings.gcdSetting).toBe(2.0);
    });

    it("starts empty when nothing was persisted", () => {
      const { result } = renderHook(() => useSimulator(job));
      expect(result.current.history).toHaveLength(0);
    });

    it("drops persisted entries referencing skills that no longer exist on the job, without throwing", () => {
      localStorage.setItem(
        `ff14-simulator:${job.id}`,
        JSON.stringify({
          version: 1,
          entries: [
            { id: "a", kind: "skill", skillId: "notARealSkill", usedAt: 0, preserveTiming: true },
            { id: "b", kind: "skill", skillId: "slice", usedAt: 0, preserveTiming: true },
          ],
          settings: { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 },
        }),
      );

      const { result } = renderHook(() => useSimulator(job));
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0]).toMatchObject({ skillId: "slice" });
    });

    it("ignores corrupted persisted data and starts empty instead of throwing", () => {
      localStorage.setItem(`ff14-simulator:${job.id}`, "{not valid json");
      const { result } = renderHook(() => useSimulator(job));
      expect(result.current.history).toHaveLength(0);
    });

    it("reset() clears the persisted state too, so a fresh mount stays empty", () => {
      const first = renderHook(() => useSimulator(job));
      act(() => first.result.current.dispatch.useSkill("slice"));
      act(() => first.result.current.dispatch.reset());

      const second = renderHook(() => useSimulator(job));
      expect(second.result.current.history).toHaveLength(0);
    });
  });
});
