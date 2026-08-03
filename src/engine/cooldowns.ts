import type { Skill } from "../types/skill";
import type { SimSettings, SimSnapshot } from "../types/state";
import { roundTime } from "./time";

// GCD設定(settings.gcdSetting)は通常GCD(2.5s基準)のスキルだけを置き換えます。
// レムール中の固定1.5s等、ゲーム側の仕様でスキル速度の影響を受けない特殊なGCDはそのままの値を使います。
export function getEffectiveGcdRecast(skill: Skill<any>, settings: SimSettings): number {
  const baseRecast = skill.gcdRecast ?? 2.5;
  return baseRecast === 2.5 ? settings.gcdSetting : baseRecast;
}

// 期限切れのチャージ準備時刻を除いた配列を返します(旧実装と異なり snapshot を変更しません)。
export function getPendingChargeReadyTimes(skill: Skill<any>, snapshot: SimSnapshot, elapsedTime: number): number[] {
  const chargeGroup = skill.chargeGroup || skill.id;
  const readyTimes = snapshot.chargeReadyTimes[chargeGroup] || [];
  return readyTimes.filter((readyAt) => readyAt > elapsedTime);
}

export function getAvailableCharges(skill: Skill<any>, snapshot: SimSnapshot, elapsedTime: number): number | null {
  if (!skill.maxCharges) {
    return null;
  }
  return skill.maxCharges - getPendingChargeReadyTimes(skill, snapshot, elapsedTime).length;
}

// チャージが1つ以上残っていても、次のチャージが貯まるまでの残り時間を返します（表示用）。
export function getNextChargeRemaining(skill: Skill<any>, snapshot: SimSnapshot, elapsedTime: number): number {
  if (!skill.maxCharges) {
    return 0;
  }
  const readyTimes = getPendingChargeReadyTimes(skill, snapshot, elapsedTime);
  return readyTimes.length ? Math.max(0, roundTime(readyTimes[0] - elapsedTime)) : 0;
}

export function getCooldownRemaining(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  leadInDuration: number,
): number {
  if (skill.maxCharges) {
    const readyTimes = getPendingChargeReadyTimes(skill, snapshot, elapsedTime);
    return readyTimes.length < skill.maxCharges ? 0 : Math.max(0, roundTime(readyTimes[0] - elapsedTime));
  }
  // 未使用スキルの既定値は「絶対時刻0」ではなく助走区間の起点にします。
  // 0固定だと、助走区間中(elapsedTimeが負)は「0 - 負の時刻」で常に残り時間が出てしまうため。
  const readyAt = snapshot.cooldowns[skill.cooldownGroup || skill.id] ?? -leadInDuration;
  return Math.max(0, roundTime(readyAt - elapsedTime));
}

export function getSkillReadyAt(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  leadInDuration: number,
): number {
  // 「制限なし」の既定値は絶対時刻0ではなく助走区間の起点にします（getCooldownRemainingと同じ理由）。
  const noRestriction = -leadInDuration;
  const chargeReadyAt =
    skill.maxCharges && getAvailableCharges(skill, snapshot, elapsedTime) === 0
      ? getPendingChargeReadyTimes(skill, snapshot, elapsedTime)[0]
      : noRestriction;

  return Math.max(
    snapshot.actionReadyAt,
    skill.gcd ? snapshot.gcdReadyAt : noRestriction,
    skill.maxCharges ? chargeReadyAt : (snapshot.cooldowns[skill.cooldownGroup || skill.id] ?? noRestriction),
  );
}

export function getNextReadyTime(
  skills: Record<string, Skill<any>>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  leadInDuration: number,
): number | null {
  const futureTimes = Object.values(skills)
    .map((skill) => getSkillReadyAt(skill, snapshot, elapsedTime, leadInDuration))
    .filter((time) => time > elapsedTime);
  return futureTimes.length ? Math.min(...futureTimes) : null;
}

// チャージを1つ消費した後の chargeReadyTimes 全体(他グループ含む)を返します。
export function spendCharge(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
  usedAt: number,
): Record<string, number[]> {
  const chargeGroup = skill.chargeGroup || skill.id;
  const readyTimes = getPendingChargeReadyTimes(skill, snapshot, elapsedTime);
  const previousReadyAt = readyTimes.length ? readyTimes[readyTimes.length - 1] : usedAt;
  const nextReadyAt = roundTime(Math.max(previousReadyAt, usedAt) + (skill.recast ?? 0));
  return { ...snapshot.chargeReadyTimes, [chargeGroup]: [...readyTimes, nextReadyAt] };
}
