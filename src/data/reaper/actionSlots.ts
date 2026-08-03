import type { ActionSlot } from "../../types/skill";
import { skills } from "./skills";

// 公式ジョブガイドが示す、同一ホットバー枠内でのアクション置き換わりです。
// base のスキルを既定表示とし、上から順に条件を満たす variant があればそちらを表示・実行します。
export const actionSlots: ActionSlot[] = [
  // ジョブガイドいわく、ストークスウェーズはジビトゥ／ギャロウズ効果アップ保持中は
  // その枠自体がジビトゥクロウ／ギャロウズクロウへ置き換わる（ジビトゥ／ギャロウズ本体ではない）。
  {
    base: "stalkSwathe",
    variants: [
      { skillId: "lemureSlice", condition: "enshrouded" },
      { skillId: "gibbetClaw", condition: "enhancedGibbet" },
      { skillId: "gallowsClaw", condition: "enhancedGallows" },
    ],
  },
  { base: "shiffSwathe", variants: [{ skillId: "lemureScythe", condition: "enshrouded" }] },
  {
    base: "gibbet",
    variants: [
      { skillId: "voidReaping", condition: "enshrouded" },
      { skillId: "executionersGibbet", condition: "executioner" },
    ],
  },
  {
    base: "gallows",
    variants: [
      { skillId: "crossReaping", condition: "enshrouded" },
      { skillId: "executionersGallows", condition: "executioner" },
    ],
  },
  {
    base: "guillotine",
    variants: [
      { skillId: "grimReaping", condition: "enshrouded" },
      { skillId: "executionersGuillotine", condition: "executioner" },
    ],
  },
  { base: "gluttony", variants: [{ skillId: "sacrificium", condition: "enshrouded" }] },
  { base: "communio", variants: [{ skillId: "perfectio", condition: "perfectioReady" }] },
  { base: "soulSow", variants: [{ skillId: "harvestMoon", condition: "soulSow" }] },
];

export const slotsByBase = new Map(actionSlots.map((slot) => [slot.base, slot]));
export const slotVariantSkillIds = new Set(actionSlots.flatMap((slot) => slot.variants.map((variant) => variant.skillId)));

// base スキルが存在すること自体の整合性チェック(移植時の転記ミス検知用)。
for (const slot of actionSlots) {
  if (!skills[slot.base]) {
    throw new Error(`actionSlots: unknown base skill "${slot.base}"`);
  }
  for (const variant of slot.variants) {
    if (!skills[variant.skillId]) {
      throw new Error(`actionSlots: unknown variant skill "${variant.skillId}"`);
    }
  }
}
