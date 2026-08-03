import type { Effect, Skill } from "../types/skill";
import type { SimSnapshot, StatusEffect } from "../types/state";
import { roundTime } from "./time";

// buffs/debuffs の更新と、タイムライン効果帯(effectHistory)への反映指示をまとめて返します。
// "extend" は既存の(現在有効な)同一idエントリの expiresAt だけを延長し、
// "new" は新しい効果帯エントリを追加します(同一idを再付与しても、一度失効した後の再付与は
// 別の帯として扱う=extendではなくnew)。
export type EffectOp = { op: "new"; entry: StatusEffect } | { op: "extend"; id: string; expiresAt: number };

export function isEffectActive(effect: StatusEffect | undefined, elapsedTime: number): boolean {
  return Boolean(effect && effect.expiresAt > elapsedTime);
}
const isActive = isEffectActive;

export function applyEffects(
  skill: Skill<any>,
  snapshot: SimSnapshot,
  elapsedTime: number,
): { buffs: Record<string, StatusEffect>; debuffs: Record<string, StatusEffect>; ops: EffectOp[] } {
  let buffs = snapshot.buffs;
  let debuffs = snapshot.debuffs;
  const ops: EffectOp[] = [];

  for (const effect of skill.effects ?? []) {
    if (effect.type === "buff") {
      const current = buffs[effect.id];
      if (isActive(current, elapsedTime)) {
        const expiresAt = roundTime(elapsedTime + effect.duration);
        buffs = { ...buffs, [effect.id]: { ...current, expiresAt } };
        ops.push({ op: "extend", id: effect.id, expiresAt });
      } else {
        const nextBuff = buildStatusEffect("buff", effect, elapsedTime);
        buffs = { ...buffs, [effect.id]: nextBuff };
        ops.push({ op: "new", entry: nextBuff });
      }
      continue;
    }

    if (effect.type !== "debuff") {
      continue;
    }

    const current = debuffs[effect.id];
    const active = isActive(current, elapsedTime);
    const remaining = active ? current.expiresAt - elapsedTime : 0;
    const nextDuration = Math.min(remaining + effect.duration, effect.maxDuration ?? effect.duration);
    if (active) {
      const expiresAt = roundTime(elapsedTime + nextDuration);
      debuffs = { ...debuffs, [effect.id]: { ...current, expiresAt } };
      ops.push({ op: "extend", id: effect.id, expiresAt });
    } else {
      const nextDebuff = buildStatusEffect("debuff", effect, elapsedTime, nextDuration);
      debuffs = { ...debuffs, [effect.id]: nextDebuff };
      ops.push({ op: "new", entry: nextDebuff });
    }
  }

  return { buffs, debuffs, ops };
}

function buildStatusEffect(type: "buff" | "debuff", effect: Effect, elapsedTime: number, durationOverride?: number): StatusEffect {
  const duration = durationOverride ?? effect.duration;
  return {
    type,
    id: effect.id,
    name: effect.name,
    potencyMultiplier: effect.potencyMultiplier,
    showOnTimeline: Boolean(effect.showOnTimeline),
    appliedAt: elapsedTime,
    expiresAt: roundTime(elapsedTime + duration),
  };
}

// jobEffects側(grantEnshroudReady等)から使う、単純な期限付きバフ生成ヘルパー。
// 既存の有効/無効に関わらず常に新規の効果帯として扱います(旧 applyTimedBuff と同じ挙動)。
export function createTimedBuff(id: string, name: string, duration: number, elapsedTime: number): StatusEffect {
  return {
    type: "buff",
    id,
    name,
    showOnTimeline: false,
    appliedAt: elapsedTime,
    expiresAt: roundTime(elapsedTime + duration),
  };
}

export function applyEffectHistoryOps(effectHistory: StatusEffect[], ops: EffectOp[]): StatusEffect[] {
  let result = effectHistory;
  for (const op of ops) {
    if (op.op === "new") {
      result = [...result, op.entry];
      continue;
    }
    let lastIndex = -1;
    for (let i = result.length - 1; i >= 0; i -= 1) {
      if (result[i].id === op.id) {
        lastIndex = i;
        break;
      }
    }
    if (lastIndex === -1) {
      continue;
    }
    const updated = [...result];
    updated[lastIndex] = { ...updated[lastIndex], expiresAt: op.expiresAt };
    result = updated;
  }
  return result;
}

// 現在有効かつ showOnTimeline な効果帯へ、今回の威力とアクション数を加算した新しい配列を返します。
export function attributePotencyToEffectHistory(
  effectHistory: StatusEffect[],
  elapsedTime: number,
  potency: number,
): StatusEffect[] {
  return effectHistory.map((effect) => {
    const applies = effect.showOnTimeline && effect.appliedAt <= elapsedTime && effect.expiresAt > elapsedTime;
    if (!applies) {
      return effect;
    }
    return { ...effect, potency: (effect.potency ?? 0) + potency, actionCount: (effect.actionCount ?? 0) + 1 };
  });
}
