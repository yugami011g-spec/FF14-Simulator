import { describe, expect, it } from "vitest";
import { buildTimelineActionTooltip, buildTimelineWaitTooltip, buildSkillTooltipData, summarizeOfficialEffect } from "../tooltipText";
import { reaperJobDefinition as job } from "../../data/reaper/jobDefinition";
import type { SkillUseEntry, WaitEntry } from "../../types/history";
import type { SimSettings } from "../../types/state";

// タイムラインのタイルをホバーしたときの詳細。アクション名を見出しにし、実行時間→威力の順で
// 本文に並べる。「ホバーの×で削除」の案内文言を含まないこと、詠唱ありの場合とキャスト即着弾の
// 場合の「実行時間」表記が既存のtitle属性の文言を踏襲していることを確認する。
describe("buildTimelineActionTooltip", () => {
  const baseEntry: SkillUseEntry = {
    id: "e1",
    kind: "skill",
    skillId: "slice",
    skillName: "スライス",
    usedAt: 5,
    castStartAt: 5,
    type: "weaponskill",
    potency: 420,
    comboSuccess: false,
    charges: null,
    clipping: 0,
    snapshot: {} as SkillUseEntry["snapshot"],
  };

  it("見出しはアクション名、本文は実行時間→威力の順", () => {
    const { title, lines } = buildTimelineActionTooltip(baseEntry, "スライス");
    expect(title).toBe("スライス");
    expect(lines).toEqual(["5.00s", "威力 420"]);
  });

  it("詠唱ありの場合は本文の実行時間が詠唱開始→着弾の表記になる", () => {
    const entry: SkillUseEntry = { ...baseEntry, skillId: "harpe", castStartAt: 3, usedAt: 4.3 };
    const { title, lines } = buildTimelineActionTooltip(entry, "ハルパー");
    expect(title).toBe("ハルパー");
    expect(lines[0]).toBe("詠唱開始3.00s → 着弾4.30s");
  });

  it("食い込みがある場合は追加行になる", () => {
    const entry: SkillUseEntry = { ...baseEntry, clipping: 0.42 };
    const { lines } = buildTimelineActionTooltip(entry, "スライス");
    expect(lines).toEqual(["5.00s", "威力 420", "食い込み 0.42s"]);
  });

  it("「ホバーの×で削除」の文言を含まない", () => {
    const { title, lines } = buildTimelineActionTooltip(baseEntry, "スライス");
    expect([title, ...lines].join(" ")).not.toContain("削除");
  });
});

describe("buildTimelineWaitTooltip", () => {
  it("アクション名に相当するものがないため見出しは「待機」固定、本文に実行時間の区間を表示", () => {
    const entry: WaitEntry = { id: "w1", kind: "wait", usedAt: 5, duration: 1.5, endAt: 6.5, snapshot: {} as WaitEntry["snapshot"] };
    const { title, lines } = buildTimelineWaitTooltip(entry);
    expect(title).toBe("待機");
    expect(lines).toEqual(["5.00s → 6.50s（待機1.5秒）"]);
  });
});

// ツールチップは公式ジョブガイドと同じレイアウト(アクション名/種類/キャストタイム/
// リキャストタイム/効果)で組み立てる。現在の実行可否など状態依存の情報(旧statusLine/
// isReady/requirementLines)は表示しない(実行可否はアイコンの明暗で判断できるため削除済み)。
describe("buildSkillTooltipData: ジョブガイドと同じレイアウトで組み立てる", () => {
  const settings: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 };

  it("通常のGCDウェポンスキル: 種類はウェポンスキル、キャストタイムはなし、リキャストタイムは実効GCD", () => {
    const data = buildSkillTooltipData(job.skills.slice, settings);
    expect(data.title).toBe("スライス");
    expect(data.typeLabel).toBe("ウェポンスキル");
    expect(data.castTimeLine).toBe("キャストタイム：なし");
    expect(data.recastTimeLine).toBe("リキャストタイム：2.5秒");
    expect(data.effectText).toBe(job.skills.slice.officialEffect);
  });

  it("詠唱ありの魔法: キャストタイムに秒数が入る", () => {
    const data = buildSkillTooltipData(job.skills.harpe, settings);
    expect(data.typeLabel).toBe("魔法");
    expect(data.castTimeLine).toBe("キャストタイム：1.3秒");
  });

  it("個別リキャストを持つアビリティ: リキャストタイムはGCDではなくその値", () => {
    const data = buildSkillTooltipData(job.skills.gluttony, settings);
    expect(data.typeLabel).toBe("アビリティ");
    expect(data.recastTimeLine).toBe("リキャストタイム：60秒");
  });

  // ソウルソウは戦闘開始前(elapsedTime<0)だと無詠唱になる(noCastTimeBeforeCombat、
  // replay.tsのisBeforeCombatWaived)。キャストタイム表示が常に「5秒」のままだと、
  // 戦闘開始前に使っても詠唱が発生するかのように誤解させてしまうため、注記を付ける。
  it("noCastTimeBeforeCombatを持つスキルは、戦闘開始前は無詠唱になる旨を注記する", () => {
    const data = buildSkillTooltipData(job.skills.soulSow, settings);
    expect(data.castTimeLine).toBe("キャストタイム：5秒（戦闘開始前は無詠唱）");
  });

  it("noCastTimeBeforeCombatを持たないスキルには注記を付けない", () => {
    const data = buildSkillTooltipData(job.skills.harpe, settings);
    expect(data.castTimeLine).toBe("キャストタイム：1.3秒");
  });

  it("効果文が短い場合はそのまま入る(削る行が無い)", () => {
    const data = buildSkillTooltipData(job.skills.slice, settings);
    expect(data.effectText).toBe(job.skills.slice.officialEffect);
  });

  it("効果文が長い場合は威力/追加効果に絞られ、原文そのままではなくなる", () => {
    const data = buildSkillTooltipData(job.skills.gibbet, settings);
    expect(data.effectText).not.toBe(job.skills.gibbet.officialEffect);
    expect(data.effectText).toBe(
      "対象に物理攻撃。　威力：500\nジビトゥ効果アップ時威力：560\n側面攻撃時威力：560\nジビトゥ効果アップかつ側面攻撃時威力：620\n追加効果：自身に「ギャロウズ効果アップ」を付与する。\n追加効果：「シュラウドゲージ」を10上昇させる。",
    );
  });
});

// ツールチップの「効果」が情報過多で見づらいというユーザー指摘により、officialEffectの原文から
// 威力(複数条件パターン含む)と追加効果の行だけに絞るsummarizeOfficialEffectを新設した。
// 1行目(主効果の説明)は「威力」という語を含まない効果(回復・デバフ付与等)もあるため常に残す。
describe("summarizeOfficialEffect", () => {
  it("1行目は常に残す(「威力」を含まない主効果でも欠落させない)", () => {
    expect(summarizeOfficialEffect(job.skills.secondWind.officialEffect!)).toBe(job.skills.secondWind.officialEffect);
  });

  it("発動条件・コンボ条件・バフの仕組みの説明・ホットバー非表示の注記は削る", () => {
    const summarized = summarizeOfficialEffect(job.skills.voidReaping.officialEffect!);
    expect(summarized).not.toContain("発動条件");
    expect(summarized).not.toContain("ホットバー");
    expect(summarized).toContain("威力：580");
    expect(summarized).toContain("追加効果：自身に「クロスリーパー効果アップ」を付与する。");
  });

  it("複数の威力条件パターン(通常時/バフ時/方向指定時/両方時)は全て残す", () => {
    const summarized = summarizeOfficialEffect(job.skills.gibbet.officialEffect!);
    expect(summarized).toContain("威力：500");
    expect(summarized).toContain("ジビトゥ効果アップ時威力：560");
    expect(summarized).toContain("側面攻撃時威力：560");
    expect(summarized).toContain("ジビトゥ効果アップかつ側面攻撃時威力：620");
  });
});
