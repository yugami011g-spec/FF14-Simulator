import { describe, expect, it } from "vitest";
import { reaperJobDefinition as job } from "../../data/reaper/jobDefinition";
import { initialSnapshot } from "../replay";
import { createTimedBuff } from "../effects";
import { getActiveSkillByBaseId } from "../gating";
import type { SimSettings } from "../../types/state";

// getActiveSkillByBaseIdは、枠のbase skill id(ボタンの見た目上は変わらない固定ID)から
// 現在アクティブな(枠替え後の)スキルを引く。ホバー中のツールチップが枠替え後も最新の
// スキルへ自動追従するために使う(枠替え後、ホバーを外し入れし直すまで古い内容のままに
// なっていた不具合の再発防止)。
const settings: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 };
const T = 100;

describe("getActiveSkillByBaseId", () => {
  it("枠替え条件を満たしていなければbase skillそのものを返す(コムニオ)", () => {
    const snapshot = initialSnapshot(settings, job);
    expect(getActiveSkillByBaseId(job, "communio", snapshot, T).id).toBe("communio");
  });

  it("ペルフェクティオ実行可が付与されていれば、同じ枠がペルフェクティオへ枠替えされる", () => {
    const snapshot = {
      ...initialSnapshot(settings, job),
      buffs: { perfectioReady: createTimedBuff("perfectioReady", "ペルフェクティオ実行可", 30, T) },
    };
    expect(getActiveSkillByBaseId(job, "communio", snapshot, T).id).toBe("perfectio");
  });

  it("枠に属さないbase idはそのままjob.skillsから引く", () => {
    const snapshot = initialSnapshot(settings, job);
    expect(getActiveSkillByBaseId(job, "shadowOfDeath", snapshot, T).id).toBe("shadowOfDeath");
  });
});
