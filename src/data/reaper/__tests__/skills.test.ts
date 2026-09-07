import { describe, expect, it } from "vitest";
import { skills } from "../skills";
import { actionSlots, slotsByBase, slotVariantSkillIds } from "../actionSlots";
import { buffNames } from "../buffNames";

describe("reaper skills data", () => {
  it("transcribes all 45 skill entries from legacy js/skills.js", () => {
    expect(Object.keys(skills)).toHaveLength(45);
  });

  it("spot-checks known potency values against legacy source", () => {
    expect(skills.communio.potency).toBe(1100);
    expect(skills.perfectio.potency).toBe(1300);
    expect(skills.voidReaping.enhancedPotency).toBe(640);
    expect(skills.plentifulHarvest.dynamicPotency).toBe("immortalSacrifice");
  });

  // ジビトゥ/ギャロウズ/エクス系は本来、方向指定(側面/背面攻撃)成功可否で威力が変わるが、この
  // シミュレーターは方向指定を扱わないため常に成功しているものとして計算する(ユーザー指定の
  // 方針)。そのため潜在的な威力は「通常時」ではなく「方向指定成功時」、buffEnhancedPotencyは
  // 「方向指定成功+バフ両方」の値になっており、legacy版(方向指定を考慮しない旧仕様)とは
  // 意図的に異なる。
  it("方向指定(側面/背面攻撃)は常に成功しているものとして威力を計算する", () => {
    expect(skills.gibbet.potency).toBe(560);
    expect(skills.gibbet.buffEnhancedPotency).toBe(620);
    expect(skills.gallows.potency).toBe(560);
    expect(skills.gallows.buffEnhancedPotency).toBe(620);
    expect(skills.executionersGibbet.potency).toBe(760);
    expect(skills.executionersGibbet.buffEnhancedPotency).toBe(820);
    expect(skills.executionersGallows.potency).toBe(760);
    expect(skills.executionersGallows.buffEnhancedPotency).toBe(820);
  });

  it("generalizes requirements into stacks/flags without losing values", () => {
    expect(skills.gibbet.requirements).toEqual({ stacks: { soulReaver: 1 } });
    expect(skills.enshroud.requirements).toEqual({ flags: { notEnshrouded: true } });
    expect(skills.voidReaping.requirements).toEqual({ flags: { enshrouded: true }, stacks: { lemure: 1 } });
    expect(skills.sacrificium.requirements).toEqual({ flags: { enshrouded: true, sacrificium: true } });
    expect(skills.plentifulHarvest.requirements).toEqual({
      stacks: { immortalSacrifice: 1 },
      buffAbsent: "bloodsownCircle",
    });
    expect(skills.gibbetClaw.requirements).toEqual({ buff: "enhancedGibbet" });
  });

  it("every skill has a unique id matching its dict key", () => {
    for (const [key, skill] of Object.entries(skills)) {
      expect(skill.id).toBe(key);
      expect(skill.job).toBe("reaper");
    }
  });

  it("keeps actionSlots consistent with skills data", () => {
    expect(actionSlots).toHaveLength(8);
    expect(slotsByBase.get("gibbet")?.variants.map((v) => v.skillId)).toEqual(["voidReaping", "executionersGibbet"]);
    expect(slotVariantSkillIds.has("perfectio")).toBe(true);
  });

  it("derives buffNames from every effect id across all skills", () => {
    expect(buffNames.deathDesign).toBe("デスデザイン");
    expect(buffNames.arcaneCircle).toBe("アルケインサークル");
    expect(buffNames.enhancedGibbet).toBe("ジビトゥ効果アップ");
  });

  // jobEffects側(reaperJobEffects.ts)でcreateTimedBuff/applyPersistentBuffにより動的に付与され、
  // どのスキルのeffects配列にも載らないバフ。未登録だとツールチップの条件表示が英語の内部ID
  // (例: "perfectioReady")のまま出てしまう不具合があった。
  it("includes job-effect-only buffs not present in any skill's effects array", () => {
    expect(buffNames.perfectioReady).toBe("ペルフェクティオ実行可");
    expect(buffNames.soulSow).toBe("ソウルソウ");
    expect(buffNames.enshroudReady).toBe("レムールシュラウド実行可");
    expect(buffNames.perfectioPending).toBe("ペルフェクティオ待機");
  });
});
