import { describe, expect, it } from "vitest";
import { reaperJobDefinition as job } from "../../../../data/reaper/jobDefinition";
import { initialSnapshot } from "../../../replay";
import { createTimedBuff } from "../../../effects";
import { isRecommended } from "../reaperGating";
import type { SimSettings, SimSnapshot } from "../../../../types/state";

// 実機観察に基づくアクション強調表示(is-combo)仕様の再現テスト。
// 詳細: .company/engineering/docs/reaper-action-highlight-spec.md
const settings: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5, autoAttackInterval: 2.08 };
const T = 100;
const skills = job.skills;

function baseSnapshot(): SimSnapshot {
  return initialSnapshot(settings, job);
}

describe("reaper isRecommended: ソウルゲージ50以上(グラトニー/ストークスウェーズ)", () => {
  it("ソウルゲージ50未満では強調しない", () => {
    const snapshot = { ...baseSnapshot(), gauges: { soul: 40, shroud: 0 } };
    expect(isRecommended(skills.gluttony, snapshot, T)).toBe(false);
    expect(isRecommended(skills.stalkSwathe, snapshot, T)).toBe(false);
  });

  it("ソウルゲージ50以上では、リキャスト中でも強調する(isRecommendedはリキャストを見ない)", () => {
    const snapshot = { ...baseSnapshot(), gauges: { soul: 50, shroud: 0 }, cooldowns: { avatar: T + 60 } };
    expect(isRecommended(skills.gluttony, snapshot, T)).toBe(true);
    expect(isRecommended(skills.stalkSwathe, snapshot, T)).toBe(true);
  });
});

describe("reaper isRecommended: ジビトゥ/ギャロウズ/エクス系(威力アップバフの有無)", () => {
  it("妖異の鎌スタックで発動条件を満たした直後(対応バフなし)は両方とも強調する", () => {
    const snapshot: SimSnapshot = {
      ...baseSnapshot(),
      jobState: { ...baseSnapshot().jobState, soulReaver: { kind: "counter", value: 1, expiresAt: T + 30 } },
    };
    expect(isRecommended(skills.gibbet, snapshot, T)).toBe(true);
    expect(isRecommended(skills.gallows, snapshot, T)).toBe(true);
  });

  it("ギャロウズ効果アップ中はギャロウズだけを強調し、ジビトゥは強調しない", () => {
    const snapshot: SimSnapshot = {
      ...baseSnapshot(),
      jobState: { ...baseSnapshot().jobState, soulReaver: { kind: "counter", value: 1, expiresAt: T + 30 } },
      buffs: { enhancedGallows: createTimedBuff("enhancedGallows", "ギャロウズ効果アップ", 60, T) },
    };
    expect(isRecommended(skills.gallows, snapshot, T)).toBe(true);
    expect(isRecommended(skills.gibbet, snapshot, T)).toBe(false);
  });

  it("処刑人スタック中も同様: エクスギャロウズはバフがある側だけ強調", () => {
    const snapshot: SimSnapshot = {
      ...baseSnapshot(),
      jobState: { ...baseSnapshot().jobState, executioner: { kind: "counter", value: 1, expiresAt: T + 30 } },
      buffs: { enhancedGallows: createTimedBuff("enhancedGallows", "ギャロウズ効果アップ", 60, T) },
    };
    expect(isRecommended(skills.executionersGallows, snapshot, T)).toBe(true);
    expect(isRecommended(skills.executionersGibbet, snapshot, T)).toBe(false);
  });
});

describe("reaper isRecommended: シュラウドゲージ50以上(エンシュラウド)", () => {
  it("50未満では強調しない、50以上では強調する", () => {
    const under = { ...baseSnapshot(), gauges: { soul: 0, shroud: 40 } };
    const over = { ...baseSnapshot(), gauges: { soul: 0, shroud: 50 } };
    expect(isRecommended(skills.enshroud, under, T)).toBe(false);
    expect(isRecommended(skills.enshroud, over, T)).toBe(true);
  });
});

describe("reaper isRecommended: ヴォイドリーパー/クロスリーパー(レムール中のモード)", () => {
  function enshroudedSnapshot(lemure: number, mode: string | null): SimSnapshot {
    return {
      ...baseSnapshot(),
      jobState: {
        ...baseSnapshot().jobState,
        lemure: { kind: "counter", value: lemure },
        enshroudUntil: { kind: "counter", value: T + 30 },
        reapingCombo: { kind: "mode", value: mode },
      },
    };
  }

  it("突入直後(モード未確定)は両方とも強調する", () => {
    const snapshot = enshroudedSnapshot(5, null);
    expect(isRecommended(skills.voidReaping, snapshot, T)).toBe(true);
    expect(isRecommended(skills.crossReaping, snapshot, T)).toBe(true);
  });

  it("片方使用後はモードに対応する方だけを強調する", () => {
    // voidReapingがjobEffects.reapingComboSet:"cross"を設定する = 次はcrossReapingが強調
    const afterVoid = enshroudedSnapshot(4, "cross");
    expect(isRecommended(skills.crossReaping, afterVoid, T)).toBe(true);
    expect(isRecommended(skills.voidReaping, afterVoid, T)).toBe(false);

    // crossReapingはjobEffects.reapingComboSet:"void" = 次はvoidReapingが強調
    const afterCross = enshroudedSnapshot(4, "void");
    expect(isRecommended(skills.voidReaping, afterCross, T)).toBe(true);
    expect(isRecommended(skills.crossReaping, afterCross, T)).toBe(false);
  });
});

describe("reaper isRecommended: ハルパー(ハルパー効果アップ中のみ強調)", () => {
  it("ハルパー効果アップが付与されている間だけ強調する", () => {
    const withBuff: SimSnapshot = {
      ...baseSnapshot(),
      buffs: { enhancedHarpe: createTimedBuff("enhancedHarpe", "ハルパー効果アップ", 10, T) },
    };
    expect(isRecommended(skills.harpe, withBuff, T)).toBe(true);
    expect(isRecommended(skills.harpe, baseSnapshot(), T)).toBe(false);
  });
});

describe("reaper isRecommended: コムニオ(レムールスタック1のみ)", () => {
  function enshroudedSnapshot(lemure: number): SimSnapshot {
    return {
      ...baseSnapshot(),
      jobState: {
        ...baseSnapshot().jobState,
        lemure: { kind: "counter", value: lemure },
        enshroudUntil: { kind: "counter", value: T + 30 },
      },
    };
  }

  it("レムールスタックが1の時だけ強調する", () => {
    expect(isRecommended(skills.communio, enshroudedSnapshot(1), T)).toBe(true);
    expect(isRecommended(skills.communio, enshroudedSnapshot(2), T)).toBe(false);
    expect(isRecommended(skills.communio, enshroudedSnapshot(5), T)).toBe(false);
  });
});

// SkillButton側で既にgetResourceUnavailableReasonを計算している場合、isRecommended内部で
// isResourceUnavailableを再計算せずそれを再利用できる(呼び出し側の二重計算を避けるため)。
describe("reaper isRecommended: resourceReasonを渡すと再計算を省略できる", () => {
  it("resourceReasonを省略した場合と同じ結果になる(後方互換)", () => {
    const snapshot = { ...baseSnapshot(), gauges: { soul: 50, shroud: 0 } };
    expect(isRecommended(skills.gluttony, snapshot, T)).toBe(isRecommended(skills.gluttony, snapshot, T, ""));
  });

  it("空でないresourceReasonを渡すと、実際の状態に関わらず強調しない", () => {
    // ソウルゲージが足りていて本来は強調されるはずの状態でも、呼び出し側からの
    // resourceReasonが空でなければそれを信頼してfalseを返す。
    const snapshot = { ...baseSnapshot(), gauges: { soul: 50, shroud: 0 } };
    expect(isRecommended(skills.gluttony, snapshot, T)).toBe(true);
    expect(isRecommended(skills.gluttony, snapshot, T, "戦闘時間終了後は使用できません")).toBe(false);
  });
});
