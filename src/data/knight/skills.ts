import type { Skill, SkillType } from "../../types/skill";
import type { KnightJobEffects } from "./types";

// Patch 7.5 / Lv100時点の公式ジョブガイドを基準にしたナイト用データです。
//
// スコープについて: このファイルはナイトの「与ダメージ(威力)に関わるアクション」のみを
// 対象にした最初の実装です。以下は今回意図的に未実装です(engineering/docs/multi-job-ui-design.md
// の実装ログ参照):
// - 被ダメージ軽減・回復専門のアクション(ホーリーシェルトロン/インターベンション/センチネル系
//   /かばう/ディヴァインヴェール/クレメンシー等)。このシミュレーターは被ダメージ・回復量を
//   一切追跡しないため、実装しても総威力計算には影響しない。
// - 上記に伴い、オウスゲージ(ジョブゲージ)は表示のみで、増減ロジック未実装(常に0)。
//   実際のゲージ生成はオートアタック命中依存という通常のアクション消費/獲得型とは異なる
//   仕組みのため、要件を確定してから実装する。
// - サークル・オブ・ドゥームの継続ダメージ(DoT)部分。このエンジンには「時間経過で継続的に
//   威力を加算する」ためのDoT tick機構がまだ存在しないため、初撃威力(140)のみ計算に含め、
//   継続ダメージはofficialEffect(ツールチップ)上の情報にとどめている。
// - lv100で自動的に上位版へ置き換わる下位アクション(旧Requiescat/旧Sheltron/旧Sentinel/
//   旧Rage of Halone/旧Spirits Within)。lv100固定のシミュレーターのため上位版のみを収録。
type KnightSkill = Skill<KnightJobEffects>;

function createAction(
  id: string,
  name: string,
  shortName: string,
  type: SkillType,
  potency: number,
  options: Partial<KnightSkill> = {},
): KnightSkill {
  return {
    id,
    job: "knight",
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
    ...options,
  };
}

export const skills: Record<string, KnightSkill> = {
  fastBlade: createAction("fastBlade", "ファストブレード", "ファスト", "weaponskill", 220, {
    comboStep: 1,
    officialEffect: "対象に物理攻撃。　威力：220",
  }),
  riotBlade: createAction("riotBlade", "ライオットソード", "ライオット", "weaponskill", 170, {
    comboPotency: 330,
    requiredComboStep: 1,
    comboStep: 2,
    officialEffect:
      "対象に物理攻撃。　威力：170\nコンボ条件：ファストブレード　コンボ時威力：330\nコンボボーナス：自身のＭＰを回復する。",
  }),
  royalAuthority: createAction("royalAuthority", "ロイヤルアソリティ", "ロイヤル", "weaponskill", 200, {
    comboPotency: 460,
    requiredComboStep: 2,
    comboStep: 3,
    jobEffects: { grantOnComboSuccess: ["atonementReady", "holyPower"] },
    officialEffect:
      "対象に物理攻撃。　威力：200\nコンボ条件：ライオットソード　コンボ時威力：460\nコンボボーナス：自身に「ロイエ実行可」を付与する。\n効果時間：30秒\nコンボボーナス：自身に「神聖魔法効果アップ」を付与する。\n効果時間：30秒\n神聖魔法効果アップ効果：次に実行する1回のホーリースピリットまたはホーリーサークルの威力が上昇し、かつ詠唱時間無しで実行できる。",
  }),
  goringBlade: createAction("goringBlade", "ゴアブレード", "ゴア", "weaponskill", 700, {
    requirements: { flags: { goringBladeReady: true } },
    jobEffects: { consumeBuffs: ["goringBladeReady"] },
    officialEffect: "対象に物理攻撃。　威力：700\n発動条件：「ゴアブレード実行可」効果中",
  }),
  totalEclipse: createAction("totalEclipse", "トータルエクリプス", "トータル", "weaponskill", 120, {
    comboStep: 11,
    row: 1,
    officialEffect: "自身の周囲の敵に範囲物理攻撃。　威力：120\n追加効果：敵視アップ",
  }),
  prominence: createAction("prominence", "プロミネンス", "プロミネンス", "weaponskill", 100, {
    comboPotency: 220,
    requiredComboStep: 11,
    comboStep: 12,
    row: 1,
    jobEffects: { grantOnComboSuccess: ["holyPower"] },
    officialEffect:
      "自身の周囲の敵に範囲物理攻撃。　威力：100\nコンボ条件：トータルエクリプス　コンボ時威力：220\n追加効果：敵視アップ\nコンボボーナス：自身のＭＰを回復する。\nコンボボーナス：自身に「神聖魔法効果アップ」を付与する。\n効果時間：30秒\n神聖魔法効果アップ効果：次に実行する1回のホーリースピリットまたはホーリーサークルの威力が上昇し、かつ詠唱時間無しで実行できる。",
  }),
  fightOrFlight: createAction("fightOrFlight", "ファイト・オア・フライト", "FoF", "ability", 0, {
    gcd: false,
    recast: 60,
    cooldownGroup: "fightOrFlight",
    noTarget: true,
    effects: [
      { type: "buff", id: "fightOrFlight", name: "ファイト・オア・フライト", duration: 20, potencyMultiplier: 1.25, showOnTimeline: true },
      { type: "buff", id: "goringBladeReady", name: "ゴアブレード実行可", duration: 30, showOnTimeline: false },
    ],
    officialEffect:
      "一定時間、自身の与ダメージを25％上昇させる。\n効果時間：20秒\n追加効果：自身に「ゴアブレード実行可」を付与する。\n効果時間：30秒",
  }),
  atonement: createAction("atonement", "ロイエ", "ロイエ", "weaponskill", 460, {
    requirements: { flags: { atonementReady: true } },
    effects: [{ type: "buff", id: "supplicationReady", name: "ゲベート実行可", duration: 30, showOnTimeline: false }],
    jobEffects: { consumeBuffs: ["atonementReady"] },
    officialEffect:
      "対象に物理攻撃。　威力：460\n追加効果：自身のＭＰを回復する。\n追加効果：自身に「ゲベート実行可」を付与する。\n効果時間：30秒\n発動条件：「ロイエ実行可」効果中",
  }),
  supplication: createAction("supplication", "ゲベート", "ゲベート", "weaponskill", 500, {
    requirements: { flags: { supplicationReady: true } },
    effects: [{ type: "buff", id: "sepulchreReady", name: "グラブカッマー実行可", duration: 30, showOnTimeline: false }],
    jobEffects: { consumeBuffs: ["supplicationReady"] },
    officialEffect:
      "対象に物理攻撃。　威力：500\n追加効果：自身のＭＰを回復する。\n追加効果：自身に「グラブカッマー実行可」を付与する。\n効果時間：30秒\n発動条件：「ゲベート実行可」効果中\n\n※このアクションはホットバーに登録することはできない。\n　発動条件を満たすとロイエがゲベートに変化する。",
  }),
  sepulchre: createAction("sepulchre", "グラブカッマー", "グラブ", "weaponskill", 540, {
    requirements: { flags: { sepulchreReady: true } },
    jobEffects: { consumeBuffs: ["sepulchreReady"] },
    officialEffect:
      "対象に物理攻撃。　威力：540\n追加効果：自身のＭＰを回復する。\n発動条件：「グラブカッマー実行可」効果中\n\n※このアクションはホットバーに登録することはできない。\n　発動条件を満たすとゲベートがグラブカッマーに変化する。",
  }),
  holySpirit: createAction("holySpirit", "ホーリースピリット", "ホーリスピ", "spell", 400, {
    dynamicPotency: "holySpirit",
    castTime: 1.5,
    castTimeEnhancedBy: ["holyPower", "requiescat"],
    // 神聖魔法効果アップは「次に実行する1回」限定の効果(officialEffect参照)なので使用したら
    // 消費する。レクイエスカットは4スタック性のため、消費対象はconsumeRequiescatStackで別途扱う
    // (詳細はengineering/docs/multi-job-ui-design.mdの実装ログ参照)。
    jobEffects: { consumeBuffs: ["holyPower"], consumeRequiescatStack: true },
    officialEffect:
      "対象に無属性魔法攻撃。　威力：400\n神聖魔法効果アップ時威力：500\nレクイエスカット時威力：700\n神聖魔法効果アップとレクイエスカットの両方が付与されている場合は、神聖魔法効果アップの効果が優先的に適用される。\n追加効果：自身のＨＰを回復する。　回復力：400",
  }),
  holyCircle: createAction("holyCircle", "ホーリーサークル", "ホーリサク", "spell", 100, {
    dynamicPotency: "holyCircle",
    castTime: 1.5,
    castTimeEnhancedBy: ["holyPower", "requiescat"],
    row: 1,
    jobEffects: { consumeBuffs: ["holyPower"], consumeRequiescatStack: true },
    officialEffect:
      "自身の周囲の敵に無属性範囲魔法攻撃。　威力：100\n神聖魔法効果アップ時威力：250\nレクイエスカット時威力：350\n神聖魔法効果アップとレクイエスカットの両方が付与されている場合は、神聖魔法効果アップの効果が優先的に適用される。\n追加効果：自身のＨＰを回復する。　回復力：400",
  }),
  imperator: createAction("imperator", "インペラトル", "インペラトル", "ability", 580, {
    gcd: false,
    recast: 60,
    cooldownGroup: "imperator",
    effects: [{ type: "buff", id: "confiteorReady", name: "コンフィテオル実行可", duration: 30, showOnTimeline: false }],
    // レクイエスカットは4スタック性の消費型リソースのため宣言的effectsではなくjobEffectsで
    // 管理する(jobState.requiescatカウンタ+buffs.requiescatを連動させる。詳細は
    // knightJobEffects.tsのapplyJobEffects参照)。
    jobEffects: { setRequiescatStacks: 4 },
    officialEffect:
      "対象とその周囲の敵に無属性範囲魔法攻撃。　威力：580\n2体目以降の対象への威力は60％減少する。\n追加効果：自身に4スタックの「レクイエスカット」を付与する。\n効果時間：30秒\nレクイエスカット効果：魔法を詠唱時間無しで実行できる。\n加えて、ホーリースピリットとホーリーサークル、さらにコンフィテオルとそれ以降のコンボアクションの威力を上昇させる。\n追加効果：自身に「コンフィテオル実行可」を付与する。\n効果時間：30秒",
  }),
  confiteor: createAction("confiteor", "コンフィテオル", "コンフィテオル", "spell", 500, {
    buffEnhancedBy: "requiescat",
    buffEnhancedPotency: 1000,
    requirements: { flags: { confiteorReady: true } },
    jobEffects: { consumeBuffs: ["confiteorReady"], consumeRequiescatStack: true },
    comboStep: 21,
    officialEffect:
      "対象とその周囲の敵に無属性範囲魔法攻撃。　威力：500\nレクイエスカット時威力：1000\n2体目以降の対象への威力は60％減少する。\n追加効果：自身のＨＰを回復する。　回復力：400\n発動条件：「コンフィテオル実行可」効果中",
  }),
  bladeOfFaith: createAction("bladeOfFaith", "ブレード・オブ・フェイス", "フェイス", "spell", 260, {
    buffEnhancedBy: "requiescat",
    buffEnhancedPotency: 760,
    requiredComboStep: 21,
    comboStep: 22,
    jobEffects: { consumeRequiescatStack: true },
    officialEffect:
      "対象とその周囲の敵に無属性範囲魔法攻撃。　威力：260\nレクイエスカット時威力：760\n2体目以降の対象への威力は60％減少する。\nコンボ条件：コンフィテオル\n追加効果：自身のＨＰを回復する。　回復力：400\n\n※このアクションはホットバーに登録することはできない。\n　発動条件を満たすとコンフィテオルがブレード・オブ・フェイスに変化する。",
  }),
  bladeOfTruth: createAction("bladeOfTruth", "ブレード・オブ・トゥルース", "トゥルース", "spell", 380, {
    buffEnhancedBy: "requiescat",
    buffEnhancedPotency: 880,
    requiredComboStep: 22,
    comboStep: 23,
    jobEffects: { consumeRequiescatStack: true },
    officialEffect:
      "対象とその周囲の敵に無属性範囲魔法攻撃。　威力：380\nレクイエスカット時威力：880\n2体目以降の対象への威力は60％減少する。\nコンボ条件：ブレード・オブ・フェイス\n追加効果：自身のＨＰを回復する。　回復力：400\n\n※このアクションはホットバーに登録することはできない。\n　発動条件を満たすとブレード・オブ・フェイスがブレード・オブ・トゥルースに変化する。",
  }),
  bladeOfValor: createAction("bladeOfValor", "ブレード・オブ・ヴァラー", "ヴァラー", "spell", 500, {
    buffEnhancedBy: "requiescat",
    buffEnhancedPotency: 1000,
    requiredComboStep: 23,
    comboStep: 24,
    effects: [{ type: "buff", id: "bladeOfHonorReady", name: "ブレード・オブ・オナー実行可", duration: 30, showOnTimeline: false }],
    jobEffects: { consumeRequiescatStack: true },
    officialEffect:
      "対象とその周囲の敵に無属性範囲魔法攻撃。　威力：500\nレクイエスカット時威力：1000\n2体目以降の対象への威力は60％減少する。\nコンボ条件：ブレード・オブ・トゥルース\n追加効果：自身のＨＰを回復する。　回復力：400\n追加効果：自身に「ブレード・オブ・オナー実行可」を付与する。\n効果時間：30秒\n\n※このアクションはホットバーに登録することはできない。\n　発動条件を満たすとブレード・オブ・トゥルースがブレード・オブ・ヴァラーに変化する。",
  }),
  bladeOfHonor: createAction("bladeOfHonor", "ブレード・オブ・オナー", "オナー", "ability", 1000, {
    gcd: false,
    recast: 1,
    cooldownGroup: "bladeOfHonor",
    requirements: { flags: { bladeOfHonorReady: true } },
    jobEffects: { consumeBuffs: ["bladeOfHonorReady"] },
    officialEffect:
      "対象とその周囲の敵に無属性範囲魔法攻撃。　威力：1000\n2体目以降の対象への威力は60％減少する。\n発動条件：「ブレード・オブ・オナー実行可」効果中\n\n※このアクションはホットバーに登録することはできない。\n　発動条件を満たすとインペラトルがブレード・オブ・オナーに変化する。",
  }),
  circleOfScorn: createAction("circleOfScorn", "サークル・オブ・ドゥーム", "サークル", "ability", 140, {
    gcd: false,
    recast: 30,
    cooldownGroup: "circleOfScorn",
    noTarget: true,
    officialEffect:
      "自身の周囲の敵に範囲物理攻撃。　威力：140\n追加効果：対象に継続ダメージを付与する。\n威力：30　効果時間：15秒",
  }),
  expiacion: createAction("expiacion", "エクスピアシオン", "エクスピ", "ability", 450, {
    gcd: false,
    recast: 30,
    cooldownGroup: "expiacion",
    officialEffect:
      "対象とその周囲の敵に範囲物理攻撃。　威力：450\n2体目以降の対象への威力は60％減少する。\n追加効果：自身のＭＰを回復する。",
  }),

  // --- 防御バフ(アビリティ2行目) ---
  // 被ダメージ・回復量はこのシミュレーターの追跡対象外(威力=0)。TLの効果時間帯には
  // showOnTimeline:trueで表示されるようにする。オウスゲージを要求するホーリーシェルトロン/
  // インターベンション/かばうは、ゲージの増加ロジックが未実装のため今回も対象外
  // (engineering/docs/multi-job-ui-design.mdの実装ログ参照)。
  extremeGuard: createAction("extremeGuard", "エクストリームガード", "ガード", "ability", 0, {
    gcd: false,
    recast: 120,
    cooldownGroup: "extremeGuard",
    row: 1,
    noTarget: true,
    effects: [{ type: "buff", id: "extremeGuard", name: "エクストリームガード", duration: 15, showOnTimeline: true }],
    officialEffect:
      "一定時間、自身の被ダメージを40％軽減させる。\n効果時間：15秒\n追加効果：自身に一定量のダメージを防ぐバリアを張る。\nバリア量：回復力1000相当　効果時間：15秒",
  }),
  bulwark: createAction("bulwark", "ブルワーク", "ブルワーク", "ability", 0, {
    gcd: false,
    recast: 90,
    cooldownGroup: "bulwark",
    row: 1,
    noTarget: true,
    effects: [{ type: "buff", id: "bulwark", name: "ブルワーク", duration: 10, showOnTimeline: true }],
    officialEffect: "一定時間、受ける攻撃を必ずブロックする。　効果時間：10秒",
  }),
  hallowedGround: createAction("hallowedGround", "インビンシブル", "インビン", "ability", 0, {
    gcd: false,
    recast: 420,
    cooldownGroup: "hallowedGround",
    row: 1,
    noTarget: true,
    effects: [{ type: "buff", id: "hallowedGround", name: "インビンシブル", duration: 10, showOnTimeline: true }],
    officialEffect: "一定時間、自身への一部を除くすべてのダメージを無効化する。　効果時間：10秒",
  }),
  divineVeil: createAction("divineVeil", "ディヴァインヴェール", "ヴェール", "ability", 0, {
    gcd: false,
    recast: 90,
    cooldownGroup: "divineVeil",
    row: 1,
    noTarget: true,
    effects: [{ type: "buff", id: "divineVeil", name: "ディヴァインヴェール", duration: 30, showOnTimeline: true }],
    officialEffect:
      "自身と周囲のパーティメンバーに、一定量のダメージを防ぐバリアを張る。\nこのバリアはナイト自身の最大ＨＰの10％分のダメージを軽減する。　効果時間：30秒\n追加効果：対象のＨＰを回復する。　回復力：400",
  }),

  // --- ロールアクション(タンク共通)・薬 ---
  rampart: createAction("rampart", "ランパート", "ランパート", "ability", 0, {
    category: "role",
    recast: 90,
    noTarget: true,
    effects: [{ type: "buff", id: "rampart", name: "ランパート", duration: 20, showOnTimeline: true }],
    officialEffect: "一定時間、自身の被ダメージを20％軽減させる。\nさらに、自身が受けるＨＰ回復効果を15％上昇させる。　効果時間：20秒",
  }),
  provoke: createAction("provoke", "挑発", "挑発", "ability", 0, {
    category: "role",
    recast: 30,
    officialEffect: "対象を挑発し、自身への敵視を最高位にしたうえで、さらに自身への敵視を上昇させる。",
  }),
  reprisal: createAction("reprisal", "リプライザル", "リプライザル", "ability", 0, {
    category: "role",
    recast: 60,
    noTarget: true,
    effects: [{ type: "debuff", id: "reprisal", name: "リプライザル", duration: 15, showOnTimeline: true }],
    officialEffect: "自身の周囲の敵の与ダメージを10％減少させる。　効果時間：15秒",
  }),
  shirk: createAction("shirk", "シャーク", "シャーク", "ability", 0, {
    category: "role",
    recast: 120,
    officialEffect: "自身に向けられている敵視の25％を対象のパーティメンバーに移す。",
  }),
  interject: createAction("interject", "インタージェクト", "インタージェクト", "ability", 0, {
    category: "role",
    recast: 30,
    officialEffect: "対象のアクション詠唱を中断させる。",
  }),
  lowBlow: createAction("lowBlow", "ロウブロウ", "ロウブロウ", "ability", 0, {
    category: "role",
    recast: 25,
    officialEffect: "対象をスタンさせる。　効果時間：5秒",
    effects: [{ type: "debuff", id: "stun", name: "スタン", duration: 5 }],
  }),
  armsLength: createAction("armsLength", "アームズレングス", "アームズ", "ability", 0, {
    category: "role",
    recast: 120,
    noTarget: true,
    officialEffect:
      "一定時間、一部を除くすべてのノックバックと引き寄せを無効化する。　効果時間：6秒\n追加効果：効果中に自身が物理攻撃を受けると、攻撃者に20％スロウを付与する。　効果時間：15秒",
    effects: [{ type: "buff", id: "armsLength", name: "アームズレングス", duration: 6, showOnTimeline: true }],
  }),
  tincture: createAction("tincture", "薬", "薬", "ability", 0, {
    // 効果: 30秒間メインステータス+10%(公式ロードストーン記事の記述に基づく)。
    // 威力計算では簡略化し、既存のデスデザイン/アルケインサークルと同様に威力への乗算バフとして扱います。
    // リキャストタイムは現行パッチの一般的な値(270秒=4分30秒)を採用していますが未検証です。
    // 「薬」はジョブガイドに掲載されているアクションではないため、officialEffectはロードストーン
    // 記事に基づく記述であり公式ジョブガイドからの引用ではない(他スキルと出典が異なる)。
    category: "role",
    recast: 270,
    noTarget: true,
    officialEffect: "自身のメインステータスが一定時間上昇する(具体的な数値・時間は未検証)",
    effects: [{ type: "buff", id: "tincture", name: "薬", duration: 30, potencyMultiplier: 1.1, showOnTimeline: true }],
  }),
};
