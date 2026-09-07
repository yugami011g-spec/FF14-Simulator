import { describe, expect, it } from "vitest";
import { knightJobDefinition as job } from "../../../../data/knight/jobDefinition";
import { appendSkillEntry } from "../../../editOps";
import { initialSnapshot, replay } from "../../../replay";
import { getActiveSkillByBaseId } from "../../../gating";
import type { SimSettings } from "../../../../types/state";
import type { ReplayEntry } from "../../../../types/history";

const settings: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5 };
const T = 100;

function withSkills(...skillIds: string[]): ReplayEntry[] {
  return skillIds.reduce<ReplayEntry[]>((entries, skillId) => appendSkillEntry(entries, skillId), []);
}

describe("basic 1-2-3 combo", () => {
  it("applies comboPotency across fastBlade -> riotBlade -> royalAuthority", () => {
    const result = replay(withSkills("fastBlade", "riotBlade", "royalAuthority"), settings, job);
    expect(result.droppedNames).toEqual([]);
    expect(result.history[0]).toMatchObject({ skillId: "fastBlade", potency: 220, comboSuccess: false });
    expect(result.history[1]).toMatchObject({ skillId: "riotBlade", potency: 330, comboSuccess: true });
    expect(result.history[2]).toMatchObject({ skillId: "royalAuthority", potency: 460, comboSuccess: true });
    expect(result.final.totalPotency).toBe(220 + 330 + 460);
  });

  it("falls back to base potency when the combo is broken", () => {
    const result = replay(withSkills("fastBlade", "royalAuthority"), settings, job);
    expect(result.history[1]).toMatchObject({ skillId: "royalAuthority", potency: 200, comboSuccess: false });
  });

  it("grants atonementReady/holyPower only when royalAuthority combos successfully", () => {
    const comboed = replay(withSkills("fastBlade", "riotBlade", "royalAuthority"), settings, job).final;
    expect(comboed.buffs.atonementReady?.expiresAt).toBeGreaterThan(0);
    expect(comboed.buffs.holyPower?.expiresAt).toBeGreaterThan(0);

    const notComboed = replay(withSkills("royalAuthority"), settings, job).final;
    expect(notComboed.buffs.atonementReady).toBeUndefined();
    expect(notComboed.buffs.holyPower).toBeUndefined();
  });
});

describe("goring blade", () => {
  it("is unavailable without fightOrFlight's buff", () => {
    const result = replay(withSkills("goringBlade"), settings, job);
    expect(result.droppedNames).toEqual(["ゴアブレード"]);
    expect(result.final.totalPotency).toBe(0);
  });

  it("hits once fightOrFlight has granted goringBladeReady", () => {
    const result = replay(withSkills("fightOrFlight", "goringBlade"), settings, job);
    expect(result.droppedNames).toEqual([]);
    // ファイト・オア・フライトの与ダメージ25%アップも乗る(700 * 1.25 = 875)。
    expect(result.history[1]).toMatchObject({ skillId: "goringBlade", potency: 875 });
  });

  it("consumes goringBladeReady so it can't be spammed within the same window", () => {
    const result = replay(withSkills("fightOrFlight", "goringBlade", "goringBlade"), settings, job);
    expect(result.droppedNames).toEqual(["ゴアブレード"]);
    expect(result.final.buffs.goringBladeReady).toBeUndefined();
  });
});

describe("atonement combo slot morphing", () => {
  it("shows atonement itself with no buff active", () => {
    const snapshot = initialSnapshot(settings, job);
    expect(getActiveSkillByBaseId(job, "atonement", snapshot, T).id).toBe("atonement");
  });

  it("morphs to supplication/sepulchre in order and each hits for the right potency", () => {
    const result = replay(
      withSkills("fastBlade", "riotBlade", "royalAuthority", "atonement", "supplication", "sepulchre"),
      settings,
      job,
    );
    expect(result.droppedNames).toEqual([]);
    expect(result.history[3]).toMatchObject({ skillId: "atonement", potency: 460 });
    expect(result.history[4]).toMatchObject({ skillId: "supplication", potency: 500 });
    expect(result.history[5]).toMatchObject({ skillId: "sepulchre", potency: 540 });
  });

  it("rejects atonement without the royalAuthority combo bonus", () => {
    const result = replay(withSkills("atonement"), settings, job);
    expect(result.droppedNames).toEqual(["ロイエ"]);
  });

  it("consumes each step's ready buff so re-pressing the same slot advances instead of repeating", () => {
    // ロイエ→ゲベート→グラブカッマーの各段階で前段階のバフ(atonementReady等)が消費されず
    // 残ると、実行済みの段階のバフがまだ真のままになり、次のクリックで正しい段階へ進めなくなる
    // 不具合の再発防止(枠替え判定は変異せずbuffsのみ確認するテスト)。
    const result = replay(
      withSkills("fastBlade", "riotBlade", "royalAuthority", "atonement", "supplication", "sepulchre"),
      settings,
      job,
    );
    const skillIds = result.history.filter((entry) => entry.kind === "skill").map((entry) => entry.skillId);
    expect(skillIds.slice(3)).toEqual(["atonement", "supplication", "sepulchre"]);
    expect(result.final.buffs.atonementReady).toBeUndefined();
    expect(result.final.buffs.supplicationReady).toBeUndefined();
    expect(result.final.buffs.sepulchreReady).toBeUndefined();
  });
});

describe("holy magic dynamic potency", () => {
  it("uses base potency with no buffs", () => {
    const result = replay(withSkills("holySpirit"), settings, job);
    expect(result.history[0]).toMatchObject({ skillId: "holySpirit", potency: 400 });
  });

  it("uses the holyPower tier when only holyPower is active", () => {
    const result = replay(withSkills("fastBlade", "riotBlade", "royalAuthority", "holySpirit"), settings, job);
    expect(result.history[3]).toMatchObject({ skillId: "holySpirit", potency: 500 });
  });

  it("uses the requiescat tier when only requiescat is active", () => {
    const result = replay(withSkills("imperator", "holySpirit"), settings, job);
    expect(result.history[1]).toMatchObject({ skillId: "holySpirit", potency: 700 });
  });

  it("prefers the holyPower tier when both holyPower and requiescat are active", () => {
    const result = replay(
      withSkills("imperator", "fastBlade", "riotBlade", "royalAuthority", "holySpirit"),
      settings,
      job,
    );
    expect(result.history[4]).toMatchObject({ skillId: "holySpirit", potency: 500 });
  });

  it("removes holySpirit's cast time when either buff is active", () => {
    const withBuff = replay(withSkills("imperator", "holySpirit", "fastBlade"), settings, job);
    // castTime==0ならusedAtとGCD開始が一致するはず(詠唱による着弾遅延が発生しない)。
    expect(withBuff.history[1]).toMatchObject({ castStartAt: withBuff.history[1].usedAt });
  });

  it("consumes holyPower after one cast (next cast falls back to base/requiescat tier)", () => {
    const result = replay(
      withSkills("fastBlade", "riotBlade", "royalAuthority", "holySpirit", "holySpirit"),
      settings,
      job,
    );
    expect(result.history[3]).toMatchObject({ skillId: "holySpirit", potency: 500 });
    expect(result.history[4]).toMatchObject({ skillId: "holySpirit", potency: 400 });
    expect(result.final.buffs.holyPower).toBeUndefined();
  });
});

describe("confiteor burst combo", () => {
  it("chains imperator -> confiteor -> bladeOfFaith -> bladeOfTruth -> bladeOfValor -> bladeOfHonor at requiescat potency", () => {
    const result = replay(
      withSkills("imperator", "confiteor", "bladeOfFaith", "bladeOfTruth", "bladeOfValor", "bladeOfHonor"),
      settings,
      job,
    );
    expect(result.droppedNames).toEqual([]);
    expect(result.history[1]).toMatchObject({ skillId: "confiteor", potency: 1000 });
    expect(result.history[2]).toMatchObject({ skillId: "bladeOfFaith", potency: 760 });
    expect(result.history[3]).toMatchObject({ skillId: "bladeOfTruth", potency: 880 });
    expect(result.history[4]).toMatchObject({ skillId: "bladeOfValor", potency: 1000 });
    expect(result.history[5]).toMatchObject({ skillId: "bladeOfHonor", potency: 1000 });
  });

  it("rejects confiteor without imperator's buff", () => {
    const result = replay(withSkills("confiteor"), settings, job);
    expect(result.droppedNames).toEqual(["コンフィテオル"]);
  });

  it("morphs confiteor's slot through the combo steps", () => {
    const afterImperatorConfiteor = replay(withSkills("imperator", "confiteor"), settings, job).final;
    expect(getActiveSkillByBaseId(job, "confiteor", afterImperatorConfiteor, afterImperatorConfiteor.elapsedTime).id).toBe(
      "bladeOfFaith",
    );

    const afterBladeOfValor = replay(
      withSkills("imperator", "confiteor", "bladeOfFaith", "bladeOfTruth", "bladeOfValor"),
      settings,
      job,
    ).final;
    expect(getActiveSkillByBaseId(job, "imperator", afterBladeOfValor, afterBladeOfValor.elapsedTime).id).toBe("bladeOfHonor");
  });

  it("consumes confiteorReady so the chain can't be re-triggered within the same requiescat window", () => {
    // ブレード・オブ・ヴァラー使用後はcomboStepが24に進み、confiteor枠はbladeOfFaith/Truth/Valorの
    // どの条件にも合致しなくなるため、再びベースの「コンフィテオル」に戻る。この状態で
    // confiteorReadyが消費されていないと、まだ30秒以内なら再度コンフィテオルが発動してしまう。
    const result = replay(
      withSkills("imperator", "confiteor", "bladeOfFaith", "bladeOfTruth", "bladeOfValor", "confiteor"),
      settings,
      job,
    );
    expect(result.droppedNames).toEqual(["コンフィテオル"]);
  });

  it("consumes bladeOfHonorReady so it can't be spammed within the same window", () => {
    const result = replay(
      withSkills("imperator", "confiteor", "bladeOfFaith", "bladeOfTruth", "bladeOfValor", "bladeOfHonor", "bladeOfHonor"),
      settings,
      job,
    );
    expect(result.droppedNames).toEqual(["ブレード・オブ・オナー"]);
  });

  it("is registered as an ability, not a weaponskill (does not use the GCD)", () => {
    expect(job.skills.bladeOfHonor.type).toBe("ability");
    expect(job.skills.bladeOfHonor.gcd).toBe(false);
  });
});
