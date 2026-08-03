// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { reaperJobDefinition } from "../../data/reaper/jobDefinition";
import { useSimulator } from "../useSimulator";

const job = reaperJobDefinition;

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
});
