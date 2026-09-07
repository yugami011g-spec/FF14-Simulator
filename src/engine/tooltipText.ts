import type { Skill } from "../types/skill";
import type { SkillUseEntry, WaitEntry } from "../types/history";
import { getEffectiveGcdRecast } from "./cooldowns";
import type { SimSettings } from "../types/state";

// 公式ジョブガイドの表記(種類/キャストタイム/リキャストタイム/効果)に揃えた見出し。
const SKILL_TYPE_LABELS: Record<string, string> = {
  weaponskill: "ウェポンスキル",
  ability: "アビリティ",
  spell: "魔法",
};

export function formatSkillTypeLabel(skill: Skill<any>): string {
  return SKILL_TYPE_LABELS[skill.type] ?? skill.type;
}

// noCastTimeBeforeCombatを持つスキル(現状ソウルソウのみ)は戦闘開始前(elapsedTime<0)だと
// 無詠唱になる(replay.tsのisBeforeCombatWaived)。この仕様を注記しないと、戦闘開始前に
// 使っても詠唱が発生するかのように誤解させてしまうため、括弧書きで補足する。
export function formatCastTimeLine(skill: Skill<any>): string {
  const base = skill.castTime ? `${skill.castTime}秒` : "なし";
  const note = skill.noCastTimeBeforeCombat ? "（戦闘開始前は無詠唱）" : "";
  return `キャストタイム：${base}${note}`;
}

// リキャストタイムは、個別リキャストが設定されているアクションはその値、GCDアクションは
// 実効GCD(スキル速度設定を反映した値)を表示する(公式ジョブガイドの表記に合わせた仕様。
// 例:ソウルスライスは30秒のリキャストを個別に持つが、通常のGCDアクションはGCD=リキャスト
// タイムとして表示される)。
export function formatRecastTimeLine(skill: Skill<any>, settings: SimSettings): string {
  const recast = skill.recast ?? (skill.gcd ? getEffectiveGcdRecast(skill, settings) : 0);
  return `リキャストタイム：${recast ? `${recast}秒` : "なし"}`;
}

export interface SkillTooltipData {
  title: string;
  typeLabel: string;
  castTimeLine: string;
  recastTimeLine: string;
  effectText: string;
}

// 公式ジョブガイドの原文(officialEffect)は情報量が多く見づらいため、要点(威力と追加効果)に
// 絞って表示する。1行目(主効果の説明。効果によっては「威力」という語を含まない場合があるため
// 常に残す)に加えて、「威力」を含む行(複数条件の威力パターンも含む)・「追加効果：」で始まる行
// だけを残し、発動条件・コンボ条件・付与したバフ自体の詳細な仕組みの説明・ホットバー非表示の
// 注記などは削る。
export function summarizeOfficialEffect(officialEffect: string): string {
  const lines = officialEffect.split("\n");
  return lines.filter((line, index) => index === 0 || line.includes("威力") || line.startsWith("追加効果：")).join("\n");
}

// アクション名/種類/キャストタイム/リキャストタイム/効果、という公式ジョブガイドと同じ
// レイアウトでツールチップの内容を組み立てる。現在の実行可否など状態依存の情報は含めない
// (実行可否はアイコンの明暗で判断できるためユーザー判断で削除済み)。
export function buildSkillTooltipData(skill: Skill<any>, settings: SimSettings): SkillTooltipData {
  return {
    title: skill.name,
    typeLabel: formatSkillTypeLabel(skill),
    castTimeLine: formatCastTimeLine(skill),
    recastTimeLine: formatRecastTimeLine(skill, settings),
    effectText: skill.officialEffect ? summarizeOfficialEffect(skill.officialEffect) : "",
  };
}

// タイムライン上のアクションタイルをホバーしたときの詳細。アクション名を見出しにし、
// 実行時間→威力の順で本文に並べる(「ホバーの×で削除」の案内は、削除×自体がホバー時に
// 常時表示される操作なのでここには含めない)。
export function buildTimelineActionTooltip(entry: SkillUseEntry, skillName: string): { title: string; lines: string[] } {
  const timingLine =
    entry.castStartAt !== entry.usedAt
      ? `詠唱開始${entry.castStartAt.toFixed(2)}s → 着弾${entry.usedAt.toFixed(2)}s`
      : `${entry.usedAt.toFixed(2)}s`;
  const lines = [timingLine, `威力 ${entry.potency}`];
  if (entry.clipping > 0) lines.push(`食い込み ${entry.clipping.toFixed(2)}s`);
  return { title: skillName, lines };
}

// 待機タイルをホバーしたときの詳細。待機にはアクション名に相当するものがないため、
// 見出しは「待機」固定にし、実行時間(区間)を本文へ回す。
export function buildTimelineWaitTooltip(entry: WaitEntry): { title: string; lines: string[] } {
  const timingLine = `${entry.usedAt.toFixed(2)}s → ${entry.endAt.toFixed(2)}s（待機${entry.duration.toFixed(1)}秒）`;
  return { title: "待機", lines: [timingLine] };
}
