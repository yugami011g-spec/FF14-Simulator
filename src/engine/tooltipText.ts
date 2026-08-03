import type { Skill } from "../types/skill";
import type { JobDefinition } from "../types/job";
import { getCooldownRemaining, getEffectiveGcdRecast } from "./cooldowns";
import { getResourceUnavailableReason } from "./gating";
import type { SimSettings, SimSnapshot } from "../types/state";

export function formatTimingDetail(skill: Skill<any>, settings: SimSettings): string {
  const parts: string[] = [];
  if (skill.castTime) parts.push(`詠唱${skill.castTime}s`);
  if (skill.castTimeEnhancedBy) parts.push(`強化中は詠唱なし`);
  if (skill.gcd) parts.push(`GCD ${getEffectiveGcdRecast(skill, settings).toFixed(2)}s`);
  if (skill.recast) {
    parts.push(skill.maxCharges ? `リキャスト${skill.recast}s（チャージ${skill.maxCharges}）` : `リキャスト${skill.recast}s`);
  }
  return parts.join(" / ");
}

export function formatPotencyDetail(skill: Skill<any>): string {
  const parts: string[] = [];
  if (skill.potency) parts.push(`威力${skill.potency}`);
  if (skill.comboPotency) parts.push(`コンボ時${skill.comboPotency}`);
  if (skill.enhancedPotency) parts.push(`強化時${skill.enhancedPotency}`);
  if (skill.buffEnhancedPotency) parts.push(`強化時${skill.buffEnhancedPotency}`);
  if (skill.dynamicPotency === "immortalSacrifice") parts.push("死の供物のスタック数に応じて変動");
  return parts.join(" / ") || "威力なし";
}

export function formatGaugeDetail(skill: Skill<any>): string {
  const parts: string[] = [];
  if (skill.gaugeCost?.soul) parts.push(`ソウル -${skill.gaugeCost.soul}`);
  if (skill.gaugeCost?.shroud) parts.push(`シュラウド -${skill.gaugeCost.shroud}`);
  if (skill.gaugeGain?.soul) parts.push(`ソウル +${skill.gaugeGain.soul}${skill.gaugeGainOnCombo ? "（コンボ時）" : ""}`);
  if (skill.gaugeGain?.shroud) parts.push(`シュラウド +${skill.gaugeGain.shroud}`);
  return parts.join(" / ");
}

export function formatRequirementDetail(skill: Skill<any>, buffNames: Record<string, string>): string[] {
  const requirements = skill.requirements || {};
  const lines: string[] = [];
  if (requirements.stacks?.soulReaver) lines.push(`妖異の鎌${requirements.stacks.soulReaver}以上が必要`);
  if (requirements.stacks?.executioner) lines.push(`処刑人${requirements.stacks.executioner}以上が必要`);
  if (requirements.stacks?.lemure) lines.push(`レムールスタック${requirements.stacks.lemure}以上が必要`);
  if (requirements.stacks?.void) lines.push(`ヴォイドスタック${requirements.stacks.void}以上が必要`);
  if (requirements.stacks?.immortalSacrifice) lines.push(`死の供物${requirements.stacks.immortalSacrifice}以上が必要`);
  if (requirements.flags?.enshrouded) lines.push("レムール中のみ使用可");
  if (requirements.flags?.notEnshrouded) lines.push("レムール外のみ使用可");
  if (requirements.buff) lines.push(`${buffNames[requirements.buff] || requirements.buff}の間のみ使用可`);
  if (requirements.buffAbsent) lines.push(`${buffNames[requirements.buffAbsent] || requirements.buffAbsent}の間は使用不可`);
  if (requirements.flags?.sacrificium) lines.push("サクリフィキウム実行可の間のみ使用可");
  return lines;
}

export function formatEffectDetail(skill: Skill<any>): string[] {
  return (skill.effects || []).map(
    (effect) => `付与: ${effect.name} ${effect.duration}s${effect.maxDuration ? `（最大${effect.maxDuration}s）` : ""}`,
  );
}

// ホバー時のツールチップでは、共通GCD/硬直(押せば自動で待たれるだけの短い遅延)の残り時間は
// ノイズになるため表示しない。実際に足止めされる個別リキャストとゲージ/条件不足だけを表示する
// (見た目上アイコンを暗くする条件 = SkillButtonのis-cooling判定と揃えている)。
export function getTooltipStatusReason(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  settings: SimSettings,
  job: JobDefinition<any>,
): string {
  const cooldownRemaining = getCooldownRemaining(skill, snapshot, elapsedTime, settings.leadInDuration);
  if (cooldownRemaining > 0) {
    return `リキャスト中（あと${cooldownRemaining.toFixed(2)}秒）`;
  }
  return getResourceUnavailableReason(skill, snapshot, elapsedTime, settings, job);
}

export interface SkillTooltipData {
  title: string;
  statusLine: string;
  isReady: boolean;
  timingLine: string;
  potencyLine: string;
  gaugeLine: string;
  requirementLines: string[];
  effectLines: string[];
}

export function buildSkillTooltipData(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  settings: SimSettings,
  job: JobDefinition<any>,
  buffNames: Record<string, string>,
): SkillTooltipData {
  const statusReason = getTooltipStatusReason(skill, snapshot, elapsedTime, settings, job);
  return {
    title: skill.name,
    statusLine: statusReason || "使用可能",
    isReady: !statusReason,
    timingLine: formatTimingDetail(skill, settings),
    potencyLine: formatPotencyDetail(skill),
    gaugeLine: formatGaugeDetail(skill),
    requirementLines: formatRequirementDetail(skill, buffNames),
    effectLines: formatEffectDetail(skill),
  };
}
