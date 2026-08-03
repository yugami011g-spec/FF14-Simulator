import { describe, expect, it } from "vitest";
import { skills } from "../skills";
import { actionSlots, slotsByBase, slotVariantSkillIds } from "../actionSlots";
import { buffNames } from "../buffNames";

describe("reaper skills data", () => {
  it("transcribes all 45 skill entries from legacy js/skills.js", () => {
    expect(Object.keys(skills)).toHaveLength(45);
  });

  it("spot-checks known potency values against legacy source", () => {
    expect(skills.gibbet.potency).toBe(500);
    expect(skills.gibbet.buffEnhancedPotency).toBe(560);
    expect(skills.communio.potency).toBe(1100);
    expect(skills.perfectio.potency).toBe(1300);
    expect(skills.voidReaping.enhancedPotency).toBe(640);
    expect(skills.plentifulHarvest.dynamicPotency).toBe("immortalSacrifice");
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
});
