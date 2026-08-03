import { describe, expect, it } from "vitest";
import { reaperJobDefinition } from "../../data/reaper/jobDefinition";
import { appendSkillEntry } from "../editOps";
import { getLiveAppendRejectionReason } from "../gating";
import { replay } from "../replay";
import type { SimSettings } from "../../types/state";
import type { ReplayEntry } from "../../types/history";

const settings: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 };
const job = reaperJobDefinition;

// M5で実装するuseSkillディスパッチャの動作を再現する: 追加前に必ずgetLiveAppendRejectionReasonで
// ライブクリックとしての可否を検証し、拒否ならentriesへ追加しない(旧 useSkill の早期returnと同じ)。
// replay() 自体は undo/delete/move/insert の詰め直し用に個別リキャストを常に自動待機する、
// より寛容な挙動を持つため、"通常のライブクリック連打" のテストには必ずこの事前検証を挟む。
function simulateLiveClicks(skillIds: string[]): { entries: ReplayEntry[]; rejected: boolean[] } {
  let entries: ReplayEntry[] = [];
  const rejected: boolean[] = [];
  for (const skillId of skillIds) {
    const current = replay(entries, settings, job);
    const skill = job.skills[skillId];
    const reason = getLiveAppendRejectionReason(skill, current.final, current.final.elapsedTime, settings, job);
    if (reason) {
      rejected.push(true);
      continue;
    }
    rejected.push(false);
    entries = appendSkillEntry(entries, skillId);
  }
  return { entries, rejected };
}

describe("cross-check against legacy js/engine.js live useSkill output (scripts/cross-check-legacy.cjs)", () => {
  it("matches legacy totalPotency/gauges/rejections for a 12-step rotation where charges run out", () => {
    const rotation = [
      "soulSlice", "stalkSwathe", "gibbet",
      "soulSlice", "stalkSwathe", "gallows",
      "soulSlice", "stalkSwathe", "gibbet",
      "soulSlice", "stalkSwathe", "gallows",
    ];
    const { entries, rejected } = simulateLiveClicks(rotation);
    const result = replay(entries, settings, job);

    // legacy output (node scripts/cross-check-legacy.cjs '[...]'):
    // totalPotency=2780, soulGauge=0, shroudGauge=20, historyCount=6, results[6..11].ok=false
    expect(result.final.totalPotency).toBe(2780);
    expect(result.final.gauges.soul).toBe(0);
    expect(result.final.gauges.shroud).toBe(20);
    expect(result.history).toHaveLength(6);
    expect(rejected).toEqual([false, false, false, false, false, false, true, true, true, true, true, true]);
  });
});
