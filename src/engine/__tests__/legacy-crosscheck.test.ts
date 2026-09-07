import { describe, expect, it } from "vitest";
import { reaperJobDefinition } from "../../data/reaper/jobDefinition";
import { appendSkillEntry } from "../editOps";
import { getLiveAppendRejectionReason } from "../gating";
import { replay } from "../replay";
import { counterValue } from "../jobs/reaper/reaperState";
import type { SimSettings } from "../../types/state";
import type { ReplayEntry } from "../../types/history";

const settings: SimSettings = { leadInDuration: 0, combatDuration: 0, gcdSetting: 2.5, autoAttackInterval: 2.08 };
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

    // legacy output (node scripts/cross-check-legacy.cjs '[...]'): totalPotency=2780。
    // ただし新エンジンはジビトゥ/ギャロウズについて、方向指定(側面/背面攻撃)を常に成功している
    // ものとして計算する仕様(ユーザー指定の方針、legacy版にはない)を持つため、この2手ぶん
    // 実際にはlegacyより高い値になる(2780+120=2900)。gaugeやhistoryCount等はlegacyと完全一致。
    expect(result.final.totalPotency).toBe(2900);
    expect(result.final.gauges.soul).toBe(0);
    expect(result.final.gauges.shroud).toBe(20);
    expect(result.history).toHaveLength(6);
    expect(rejected).toEqual([false, false, false, false, false, false, true, true, true, true, true, true]);
  });

  it("matches legacy totalPotency/gauges/stacks for a realistic 32-step opener-to-enshroud rotation", () => {
    // 開幕儀式(アルケインサークル+シャドウ・オブ・デス)→3連コンボ→ソウルスライスでソウルゲージ100まで
    // 積んでグラトニー+ブラッドストーク(旧ストークスウェーズ)を両方消費→エグゼキューショナー
    // ジビトゥ/ギャロウズとソウルリーヴァージビトゥ/ギャロウズを計4回使ってシュラウドゲージ50まで
    // 貯め→レムールシュラウド突入→ヴォイド/クロスリーピング交互2周+レムールスライス2回→コムニオで
    // 離脱、という実戦的な開幕〜エンシュラウド1周分の流れ。全32手が有効(拒否なし)であることも含めて
    // legacy版(node scripts/cross-check-legacy.cjs)の出力と突き合わせる。
    const rotation = [
      "arcaneCircle", "shadowOfDeath", "slice", "waxingSlice", "infernalSlice",
      "soulSlice", "gluttony", "executionersGibbet", "executionersGallows",
      "soulSlice", "stalkSwathe", "gibbet",
      "slice", "waxingSlice", "infernalSlice",
      "stalkSwathe", "gallows",
      "slice", "waxingSlice", "infernalSlice", "slice",
      "soulSlice", "stalkSwathe", "gibbet",
      "enshroud", "voidReaping", "crossReaping", "lemureSlice",
      "voidReaping", "crossReaping", "lemureSlice", "communio",
    ];
    const { entries, rejected } = simulateLiveClicks(rotation);
    const result = replay(entries, settings, job);

    // legacy output (node scripts/cross-check-legacy.cjs '[...]'): totalPotency=16625。
    // ただし新エンジンはジビトゥ/ギャロウズ/エクス系について、方向指定(側面/背面攻撃)を常に
    // 成功しているものとして計算する仕様(ユーザー指定の方針、legacy版にはない)を持つため、
    // この5手(gibbet×2/gallows×1/executionersGibbet×1/executionersGallows×1)ぶん、
    // アルケインサークル/デスデザインの倍率補正込みでlegacyより322高い値になる(16947)。
    // soulGauge等の他の値はlegacyと完全一致。
    // soulGauge=50, shroudGauge=0, soulReaverStacks=0, executionerStacks=0,
    // lemureStacks=0, voidStacks=0, enshroudedUntil=0, comboStep=1, historyCount=32, all results[].ok=true
    expect(result.final.totalPotency).toBe(16947);
    expect(result.final.gauges.soul).toBe(50);
    expect(result.final.gauges.shroud).toBe(0);
    expect(counterValue(result.final, "soulReaver")).toBe(0);
    expect(counterValue(result.final, "executioner")).toBe(0);
    expect(counterValue(result.final, "lemure")).toBe(0);
    expect(counterValue(result.final, "void")).toBe(0);
    expect(result.history).toHaveLength(32);
    expect(rejected).toEqual(new Array(32).fill(false));
  });
});
