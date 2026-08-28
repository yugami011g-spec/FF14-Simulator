import { describe, expect, it } from "vitest";
import { reaperJobDefinition } from "../../data/reaper/jobDefinition";
import { replay } from "../../engine/replay";
import { csvToEntries, historyToCsv } from "../csv";

const job = reaperJobDefinition;
const settings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 };

describe("historyToCsv / csvToEntries", () => {
  it("round-trips a skill+wait rotation through CSV export and re-import", () => {
    const entries = [
      { id: "1", kind: "skill" as const, skillId: "slice", usedAt: 0, preserveTiming: false },
      { id: "2", kind: "wait" as const, duration: 3, usedAt: 0, preserveTiming: false },
      { id: "3", kind: "skill" as const, skillId: "waxingSlice", usedAt: 0, preserveTiming: false },
      { id: "4", kind: "skill" as const, skillId: "infernalSlice", usedAt: 0, preserveTiming: false },
    ];
    const original = replay(entries, settings, job);

    const csv = historyToCsv(original.history);
    const { entries: reimported, skippedRows } = csvToEntries(csv, job);

    expect(skippedRows).toBe(0);
    expect(reimported).toHaveLength(original.history.length);

    const reimportedResult = replay(reimported, settings, job);
    expect(reimportedResult.final.totalPotency).toBe(original.final.totalPotency);
    expect(reimportedResult.history.map((h) => h.kind)).toEqual(original.history.map((h) => h.kind));
  });

  it("drops rows with an unknown skillId and reports the count", () => {
    const csv = ["order,kind,skillId,skillName,duration,usedAt,potency", "1,skill,not-a-real-skill,???,,0,0"].join(
      "\r\n",
    );
    const { entries, skippedRows } = csvToEntries(csv, job);
    expect(entries).toHaveLength(0);
    expect(skippedRows).toBe(1);
  });

  it("drops wait rows with a non-positive duration", () => {
    const csv = ["order,kind,skillId,skillName,duration,usedAt,potency", "1,wait,,待機,0,0,"].join("\r\n");
    const { entries, skippedRows } = csvToEntries(csv, job);
    expect(entries).toHaveLength(0);
    expect(skippedRows).toBe(1);
  });

  it("returns nothing usable when the header has no kind column", () => {
    const csv = ["a,b,c", "1,2,3"].join("\r\n");
    const { entries, skippedRows } = csvToEntries(csv, job);
    expect(entries).toHaveLength(0);
    expect(skippedRows).toBe(1);
  });

  it("handles empty input", () => {
    const { entries, skippedRows } = csvToEntries("", job);
    expect(entries).toHaveLength(0);
    expect(skippedRows).toBe(0);
  });
});
