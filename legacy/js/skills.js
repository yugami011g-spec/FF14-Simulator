// Patch 7.5 / Lv100時点の公式ジョブガイドを基準にしたリーパー用データです。
const skills = {
  shadowOfDeath: {
    id: "shadowOfDeath",
    job: "reaper",
    name: "シャドウ・オブ・デス",
    shortName: "シャドウ",
    type: "weaponskill",
    potency: 300,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    effects: [{ type: "debuff", id: "deathDesign", name: "デスデザイン", duration: 30, maxDuration: 60, showOnTimeline: true }]
  },
  slice: {
    id: "slice",
    job: "reaper",
    name: "スライス",
    shortName: "スライス",
    type: "weaponskill",
    potency: 420,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 1,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    gaugeGain: { soul: 10 },
    unavailableDuringEnshroud: true,
    effects: []
  },
  waxingSlice: {
    id: "waxingSlice",
    job: "reaper",
    name: "ワクシングスライス",
    shortName: "ワクシング",
    type: "weaponskill",
    potency: 260,
    comboPotency: 500,
    requiredComboStep: 1,
    comboStep: 2,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    gaugeGain: { soul: 10 },
    gaugeGainOnCombo: true,
    unavailableDuringEnshroud: true,
    effects: []
  },
  infernalSlice: {
    id: "infernalSlice",
    job: "reaper",
    name: "インファナルスライス",
    shortName: "インファナル",
    type: "weaponskill",
    potency: 280,
    comboPotency: 600,
    requiredComboStep: 2,
    comboStep: 3,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    gaugeGain: { soul: 10 },
    gaugeGainOnCombo: true,
    unavailableDuringEnshroud: true,
    effects: []
  },
  soulSlice: {
    id: "soulSlice",
    job: "reaper",
    name: "ソウルスライス",
    shortName: "ソウルスライス",
    type: "weaponskill",
    potency: 520,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: 30,
    maxCharges: 2,
    chargeGroup: "soulSlice",
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    gaugeGain: { soul: 50 },
    unavailableDuringEnshroud: true,
    effects: []
  },
  stalkSwathe: {
    id: "stalkSwathe",
    job: "reaper",
    name: "ストークスウェーズ",
    shortName: "ストーク",
    type: "ability",
    potency: 340,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: 1,
    cooldownGroup: "avatar",
    gcd: false,
    animationLock: 0.67,
    gaugeCost: { soul: 50 },
    jobEffects: { soulReaverSet: 1 },
    unavailableDuringEnshroud: true,
    effects: []
  },
  gibbet: {
    id: "gibbet",
    job: "reaper",
    name: "ジビトゥ",
    shortName: "ジビトゥ",
    type: "weaponskill",
    potency: 500,
    buffEnhancedPotency: 560,
    buffEnhancedBy: "enhancedGibbet",
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    requirements: { soulReaver: 1 },
    gaugeGain: { shroud: 10 },
    jobEffects: { soulReaverCost: 1, consumeBuff: "enhancedGibbet" },
    unavailableDuringEnshroud: true,
    effects: [{ type: "buff", id: "enhancedGallows", name: "ギャロウズ効果アップ", duration: 60 }]
  },
  gallows: {
    id: "gallows",
    job: "reaper",
    name: "ギャロウズ",
    shortName: "ギャロウズ",
    type: "weaponskill",
    potency: 500,
    buffEnhancedPotency: 560,
    buffEnhancedBy: "enhancedGallows",
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    requirements: { soulReaver: 1 },
    gaugeGain: { shroud: 10 },
    jobEffects: { soulReaverCost: 1, consumeBuff: "enhancedGallows" },
    unavailableDuringEnshroud: true,
    effects: [{ type: "buff", id: "enhancedGibbet", name: "ジビトゥ効果アップ", duration: 60 }]
  },
  gluttony: {
    id: "gluttony",
    job: "reaper",
    name: "グラトニー",
    shortName: "グラトニー",
    type: "ability",
    potency: 560,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: 60,
    gcd: false,
    animationLock: 0.67,
    gaugeCost: { soul: 50 },
    jobEffects: { executionerSet: 2, soulReaverSet: 0 },
    unavailableDuringEnshroud: true,
    effects: []
  },
  executionersGibbet: {
    id: "executionersGibbet",
    job: "reaper",
    name: "エクスジビトゥ",
    shortName: "エクスジビトゥ",
    type: "weaponskill",
    potency: 700,
    buffEnhancedPotency: 760,
    buffEnhancedBy: "enhancedGibbet",
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    requirements: { executioner: 1 },
    gaugeGain: { shroud: 10 },
    jobEffects: { executionerCost: 1, consumeBuff: "enhancedGibbet" },
    unavailableDuringEnshroud: true,
    effects: [{ type: "buff", id: "enhancedGallows", name: "ギャロウズ効果アップ", duration: 60 }]
  },
  executionersGallows: {
    id: "executionersGallows",
    job: "reaper",
    name: "エクスギャロウズ",
    shortName: "エクスギャロウズ",
    type: "weaponskill",
    potency: 700,
    buffEnhancedPotency: 760,
    buffEnhancedBy: "enhancedGallows",
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    requirements: { executioner: 1 },
    gaugeGain: { shroud: 10 },
    jobEffects: { executionerCost: 1, consumeBuff: "enhancedGallows" },
    unavailableDuringEnshroud: true,
    effects: [{ type: "buff", id: "enhancedGibbet", name: "ジビトゥ効果アップ", duration: 60 }]
  },
  enshroud: {
    id: "enshroud",
    job: "reaper",
    name: "レムールシュラウド",
    shortName: "シュラウド",
    type: "ability",
    potency: 0,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: 5,
    gcd: false,
    animationLock: 0.67,
    gaugeCost: { shroud: 50 },
    requirements: { notEnshrouded: true },
    jobEffects: { enterEnshroud: true },
    noTarget: true,
    effects: []
  },
  voidReaping: {
    id: "voidReaping",
    job: "reaper",
    name: "ヴォイドリーパー",
    shortName: "ヴォイド",
    type: "weaponskill",
    potency: 580,
    enhancedPotency: 640,
    enhancedBy: "void",
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 1.5,
    animationLock: 0.67,
    requirements: { enshrouded: true, lemure: 1 },
    jobEffects: { lemureCost: 1, voidGain: 1, reapingComboSet: "cross" },
    effects: []
  },
  crossReaping: {
    id: "crossReaping",
    job: "reaper",
    name: "クロスリーパー",
    shortName: "クロス",
    type: "weaponskill",
    potency: 580,
    enhancedPotency: 640,
    enhancedBy: "cross",
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 1.5,
    animationLock: 0.67,
    requirements: { enshrouded: true, lemure: 1 },
    jobEffects: { lemureCost: 1, voidGain: 1, reapingComboSet: "void" },
    effects: []
  },
  lemureSlice: {
    id: "lemureSlice",
    job: "reaper",
    name: "レムールスライス",
    shortName: "レムール",
    type: "ability",
    potency: 280,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: 1,
    cooldownGroup: "lemureAttack",
    gcd: false,
    animationLock: 0.67,
    requirements: { enshrouded: true, void: 2 },
    jobEffects: { voidCost: 2 },
    effects: []
  },
  communio: {
    id: "communio",
    job: "reaper",
    name: "コムニオ",
    shortName: "コムニオ",
    type: "spell",
    potency: 1100,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: true,
    gcdRecast: 2.5,
    animationLock: 0.67,
    requirements: { enshrouded: true, lemure: 1 },
    jobEffects: { exitEnshroud: true, promotePerfectio: true },
    effects: []
  },
  sacrificium: {
    id: "sacrificium",
    job: "reaper",
    name: "サクリフィキウム",
    shortName: "サクリフィキウム",
    type: "ability",
    potency: 700,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: 1,
    gcd: false,
    animationLock: 0.67,
    requirements: { enshrouded: true, sacrificium: true },
    jobEffects: { consumeSacrificium: true },
    effects: []
  },
  arcaneCircle: {
    id: "arcaneCircle",
    job: "reaper",
    name: "アルケインサークル",
    shortName: "アルケイン",
    type: "ability",
    potency: 0,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: 120,
    gcd: false,
    animationLock: 0.67,
    noTarget: true,
    effects: [
      { type: "buff", id: "arcaneCircle", name: "アルケインサークル", duration: 20, potencyMultiplier: 1.03, showOnTimeline: true },
      { type: "buff", id: "circleOfSacrifice", name: "供儀のサークル", duration: 5 },
      { type: "buff", id: "bloodsownCircle", name: "死の供儀", duration: 6 }
    ]
  }
};

function createAction(id, name, shortName, type, potency, options = {}) {
  return {
    id,
    job: "reaper",
    name,
    shortName,
    type,
    potency,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 0,
    recast: null,
    gcd: type !== "ability",
    gcdRecast: type === "ability" ? null : 2.5,
    animationLock: 0.67,
    effects: [],
    ...options
  };
}

Object.assign(skills, {
  harpe: createAction("harpe", "ハルパー", "ハルパー", "spell", 300, {
    // 詠唱時間(秒)。着弾はGCD開始(押した時刻)からこの秒数だけ後になります。ユーザー申告値のため要検証。
    castTime: 1.3,
    // 公式ジョブガイドいわく「ハルパー効果アップ」中は詠唱時間無しで詠唱できます(威力への影響はありません)。
    castTimeEnhancedBy: "enhancedHarpe",
    gaugeGain: { soul: 10 },
    jobEffects: { consumeBuff: "enhancedHarpe", reduceCooldown: { group: "hellsMovement", amount: 5 } },
    unavailableDuringEnshroud: true
  }),
  hellsIngress: createAction("hellsIngress", "ヘルズイングレス", "イングレス", "ability", 0, {
    recast: 20,
    cooldownGroup: "hellsMovement",
    noTarget: true,
    effects: [
      { type: "buff", id: "enhancedHarpe", name: "ハルパー効果アップ", duration: 10 },
      { type: "buff", id: "returnReady", name: "リターン実行可", duration: 10 }
    ]
  }),
  hellsEgress: createAction("hellsEgress", "ヘルズイーグレス", "イーグレス", "ability", 0, {
    recast: 20,
    cooldownGroup: "hellsMovement",
    noTarget: true,
    effects: [
      { type: "buff", id: "enhancedHarpe", name: "ハルパー効果アップ", duration: 10 },
      { type: "buff", id: "returnReady", name: "リターン実行可", duration: 10 }
    ]
  }),
  spinningScythe: createAction("spinningScythe", "スピニングサイズ", "スピニング", "weaponskill", 140, {
    comboStep: 11,
    gaugeGain: { soul: 10 },
    unavailableDuringEnshroud: true
  }),
  whorlOfDeath: createAction("whorlOfDeath", "ワーラル・オブ・デス", "ワーラル", "weaponskill", 100, {
    effects: [{ type: "debuff", id: "deathDesign", name: "デスデザイン", duration: 30, maxDuration: 60, showOnTimeline: true }]
  }),
  arcaneCrest: createAction("arcaneCrest", "アルケインクレスト", "クレスト", "ability", 0, {
    recast: 30,
    noTarget: true,
    effects: [{ type: "buff", id: "arcaneCrest", name: "守護のクレスト", duration: 5 }]
  }),
  nightmareScythe: createAction("nightmareScythe", "ナイトメアサイズ", "ナイトメア", "weaponskill", 120, {
    comboPotency: 180,
    requiredComboStep: 11,
    comboStep: 12,
    gaugeGain: { soul: 10 },
    gaugeGainOnCombo: true,
    unavailableDuringEnshroud: true
  }),
  shiffSwathe: createAction("shiffSwathe", "シーフスウェーズ", "シーフ", "ability", 140, {
    recast: 1,
    cooldownGroup: "avatar",
    gaugeCost: { soul: 50 },
    jobEffects: { soulReaverSet: 1 },
    unavailableDuringEnshroud: true
  }),
  soulScythe: createAction("soulScythe", "ソウルサイズ", "ソウルサイズ", "weaponskill", 180, {
    recast: 30,
    maxCharges: 2,
    chargeGroup: "soulSlice",
    gaugeGain: { soul: 50 },
    unavailableDuringEnshroud: true
  }),
  guillotine: createAction("guillotine", "ギロティン", "ギロティン", "weaponskill", 200, {
    requirements: { soulReaver: 1 },
    gaugeGain: { shroud: 10 },
    jobEffects: { soulReaverCost: 1 },
    unavailableDuringEnshroud: true
  }),
  gibbetClaw: createAction("gibbetClaw", "ジビトゥクロウ", "ジビクロウ", "ability", 440, {
    recast: 1,
    cooldownGroup: "avatar",
    gaugeCost: { soul: 50 },
    requirements: { buff: "enhancedGibbet" },
    // ジビトゥ効果アップの消費はジビトゥ／エクスジビトゥ側が行うため、ここでは消費しません。
    jobEffects: { soulReaverSet: 1 },
    unavailableDuringEnshroud: true
  }),
  gallowsClaw: createAction("gallowsClaw", "ギャロウズクロウ", "ギャロクロウ", "ability", 440, {
    recast: 1,
    cooldownGroup: "avatar",
    gaugeCost: { soul: 50 },
    requirements: { buff: "enhancedGallows" },
    // ギャロウズ効果アップの消費はギャロウズ／エクスギャロウズ側が行うため、ここでは消費しません。
    jobEffects: { soulReaverSet: 1 },
    unavailableDuringEnshroud: true
  }),
  returnAction: createAction("returnAction", "リターン", "リターン", "ability", 0, {
    recast: 1,
    requirements: { buff: "returnReady" },
    jobEffects: { consumeBuff: "returnReady" },
    noTarget: true
  }),
  grimReaping: createAction("grimReaping", "グリムリーパー", "グリム", "weaponskill", 220, {
    gcdRecast: 1.5,
    requirements: { enshrouded: true, lemure: 1 },
    jobEffects: { lemureCost: 1, voidGain: 1 }
  }),
  soulSow: createAction("soulSow", "ソウルソウ", "ソウルソウ", "spell", 0, {
    jobEffects: { applyPersistentBuff: { id: "soulSow", name: "ソウルソウ" } },
    noTarget: true
  }),
  harvestMoon: createAction("harvestMoon", "ハーベストムーン", "ハーベスト", "spell", 800, {
    gaugeGain: { soul: 10 },
    requirements: { buff: "soulSow" },
    jobEffects: { consumeBuff: "soulSow" }
  }),
  lemureScythe: createAction("lemureScythe", "レムールサイズ", "レムールサイズ", "ability", 100, {
    recast: 1,
    cooldownGroup: "lemureAttack",
    requirements: { enshrouded: true, void: 2 },
    jobEffects: { voidCost: 2 }
  }),
  plentifulHarvest: createAction("plentifulHarvest", "プレンティフルハーベスト", "プレンティ", "weaponskill", 720, {
    dynamicPotency: "immortalSacrifice",
    requirements: { immortalSacrifice: 1, buffAbsent: "bloodsownCircle" },
    jobEffects: { consumeImmortalSacrifice: true, grantEnshroudReady: true, grantPerfectioPending: true }
  }),
  executionersGuillotine: createAction("executionersGuillotine", "エクスギロティン", "エクスギロ", "weaponskill", 260, {
    requirements: { executioner: 1 },
    gaugeGain: { shroud: 10 },
    jobEffects: { executionerCost: 1 },
    unavailableDuringEnshroud: true
  }),
  perfectio: createAction("perfectio", "ペルフェクティオ", "ペルフェ", "weaponskill", 1300, {
    requirements: { buff: "perfectioReady" },
    jobEffects: { consumeBuff: "perfectioReady" }
  }),
  secondWind: createAction("secondWind", "内丹", "内丹", "ability", 0, { category: "role", recast: 120, noTarget: true }),
  legSweep: createAction("legSweep", "レッグスウィープ", "レッグ", "ability", 0, {
    category: "role", recast: 40,
    effects: [{ type: "debuff", id: "stun", name: "スタン", duration: 3 }]
  }),
  bloodbath: createAction("bloodbath", "ブラッドバス", "ブラッドバス", "ability", 0, {
    category: "role", recast: 90, noTarget: true,
    effects: [{ type: "buff", id: "bloodbath", name: "ブラッドバス", duration: 20, showOnTimeline: true }]
  }),
  feint: createAction("feint", "牽制", "牽制", "ability", 0, {
    category: "role", recast: 90,
    effects: [{ type: "debuff", id: "feint", name: "牽制", duration: 15, showOnTimeline: true }]
  }),
  armsLength: createAction("armsLength", "アームズレングス", "アームズ", "ability", 0, {
    category: "role", recast: 120, noTarget: true,
    effects: [{ type: "buff", id: "armsLength", name: "アームズレングス", duration: 6, showOnTimeline: true }]
  }),
  trueNorth: createAction("trueNorth", "トゥルーノース", "トゥルー", "ability", 0, {
    category: "role", recast: 45, maxCharges: 2, chargeGroup: "trueNorth", noTarget: true,
    effects: [{ type: "buff", id: "trueNorth", name: "トゥルーノース", duration: 10, showOnTimeline: true }]
  }),
  tincture: createAction("tincture", "薬", "薬", "ability", 0, {
    // 効果: 30秒間メインステータス+10%(公式ロードストーン記事の記述に基づく)。
    // 威力計算では簡略化し、既存のデスデザイン/アルケインサークルと同様に威力への乗算バフとして扱います。
    // リキャストタイムは現行パッチの一般的な値(270秒=4分30秒)を採用していますが未検証です。
    category: "role", recast: 270, noTarget: true,
    effects: [{ type: "buff", id: "tincture", name: "薬", duration: 30, potencyMultiplier: 1.1, showOnTimeline: true }]
  })
});

// 公式ジョブガイドが示す、同一ホットバー枠内でのアクション置き換わりです。
// base のスキルを既定表示とし、上から順に条件を満たす variant があればそちらを表示・実行します。
const actionSlots = [
  // ジョブガイドいわく、ストークスウェーズはジビトゥ／ギャロウズ効果アップ保持中は
  // その枠自体がジビトゥクロウ／ギャロウズクロウへ置き換わる（ジビトゥ／ギャロウズ本体ではない）。
  { base: "stalkSwathe", variants: [
    { skillId: "lemureSlice", condition: "enshrouded" },
    { skillId: "gibbetClaw", condition: "enhancedGibbet" },
    { skillId: "gallowsClaw", condition: "enhancedGallows" }
  ] },
  { base: "shiffSwathe", variants: [{ skillId: "lemureScythe", condition: "enshrouded" }] },
  { base: "gibbet", variants: [
    { skillId: "voidReaping", condition: "enshrouded" },
    { skillId: "executionersGibbet", condition: "executioner" }
  ] },
  { base: "gallows", variants: [
    { skillId: "crossReaping", condition: "enshrouded" },
    { skillId: "executionersGallows", condition: "executioner" }
  ] },
  { base: "guillotine", variants: [
    { skillId: "grimReaping", condition: "enshrouded" },
    { skillId: "executionersGuillotine", condition: "executioner" }
  ] },
  { base: "gluttony", variants: [{ skillId: "sacrificium", condition: "enshrouded" }] },
  { base: "communio", variants: [{ skillId: "perfectio", condition: "perfectioReady" }] },
  { base: "soulSow", variants: [{ skillId: "harvestMoon", condition: "soulSow" }] }
];

const slotsByBase = new Map(actionSlots.map((slot) => [slot.base, slot]));
const slotVariantSkillIds = new Set(actionSlots.flatMap((slot) => slot.variants.map((variant) => variant.skillId)));

// バフ／デバフIDから表示名を引くための一覧です（ツールチップの条件表示に使います）。
const buffNames = Object.values(skills).reduce((names, skill) => {
  (skill.effects || []).forEach((effect) => { names[effect.id] = effect.name; });
  return names;
}, {});
