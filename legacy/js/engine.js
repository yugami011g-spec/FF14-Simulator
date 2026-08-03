// 指定されたスキルが現在のコンボ状態に合っているか判定します。
function isComboSuccess(skill) {
  // requiredComboStep がないスキルは、コンボ条件なしで使えるスキルです。
  if (skill.requiredComboStep === null || skill.requiredComboStep === undefined) {
    return false;
  }

  // コンボ段階が合っていても、前段階から30秒を超えていたら不成立として扱います。
  return state.comboStep === skill.requiredComboStep && state.elapsedTime <= state.comboExpiresAt;
}

// コンボ成功なら comboPotency、失敗なら potency を返します。
function calculatePotency(skill) {
  const isEnhanced = skill.enhancedBy && state.reapingCombo === skill.enhancedBy;
  let basePotency = isEnhanced
    ? skill.enhancedPotency
    : isComboSuccess(skill)
      ? skill.comboPotency
      : skill.potency;
  if (skill.dynamicPotency === "immortalSacrifice") {
    basePotency = 720 + Math.max(0, state.immortalSacrificeStacks - 1) * 40;
  }
  const enhancementBuff = skill.buffEnhancedBy && state.buffs[skill.buffEnhancedBy];
  if (enhancementBuff?.expiresAt > state.elapsedTime) {
    basePotency = skill.buffEnhancedPotency;
  }
  const deathDesign = state.debuffs.deathDesign;
  const hasDeathDesign = deathDesign && deathDesign.expiresAt > state.elapsedTime;
  const arcaneCircle = state.buffs.arcaneCircle;
  const hasArcaneCircle = arcaneCircle && arcaneCircle.expiresAt > state.elapsedTime;
  const tincture = state.buffs.tincture;
  const hasTincture = tincture && tincture.expiresAt > state.elapsedTime;
  const multiplier = (hasDeathDesign ? 1.1 : 1) * (hasArcaneCircle ? 1.03 : 1) * (hasTincture ? 1.1 : 1);
  return Math.round(basePotency * multiplier);
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStateSnapshot() {
  return cloneValue({
    elapsedTime: state.elapsedTime,
    totalPotency: state.totalPotency,
    comboStep: state.comboStep,
    comboExpiresAt: state.comboExpiresAt,
    soulGauge: state.soulGauge,
    shroudGauge: state.shroudGauge,
    soulReaverStacks: state.soulReaverStacks,
    soulReaverExpiresAt: state.soulReaverExpiresAt,
    executionerStacks: state.executionerStacks,
    executionerExpiresAt: state.executionerExpiresAt,
    lemureStacks: state.lemureStacks,
    voidStacks: state.voidStacks,
    enshroudedUntil: state.enshroudedUntil,
    sacrificiumReady: state.sacrificiumReady,
    reapingCombo: state.reapingCombo,
    immortalSacrificeStacks: state.immortalSacrificeStacks,
    gcdReadyAt: state.gcdReadyAt,
    actionReadyAt: state.actionReadyAt,
    cooldowns: state.cooldowns,
    chargeReadyTimes: state.chargeReadyTimes,
    buffs: state.buffs,
    debuffs: state.debuffs
  });
}

function getSnapshotAt(time) {
  const entry = [...state.history].reverse().find((item) => item.usedAt <= time);
  if (!entry?.snapshot) {
    return { elapsedTime: time, totalPotency: 0, comboStep: 0, comboExpiresAt: 0, soulGauge: 0, shroudGauge: 0,
      lemureStacks: 0, voidStacks: 0, buffs: {}, debuffs: {}, cooldowns: {}, chargeReadyTimes: {},
      gcdReadyAt: -state.leadInDuration, actionReadyAt: -state.leadInDuration, soulReaverStacks: 0, soulReaverExpiresAt: 0,
      executionerStacks: 0, executionerExpiresAt: 0,
      enshroudedUntil: 0, sacrificiumReady: false, immortalSacrificeStacks: 0 };
  }
  return { ...cloneValue(entry.snapshot), elapsedTime: time };
}

// コンボの1段目として扱う comboStep の値です（通常コンボ:1、範囲コンボ:11）。
const COMBO_STARTER_STEPS = new Set([1, 11]);

// スキルがいずれかのコンボ（開始または継続）に属しているかを判定します。
// アビリティや、ジビトゥ／ギャロウズのようなコンボと無関係なウェポンスキルは属しません。
function isComboRelevant(skill) {
  if (skill.type === "ability") {
    return false;
  }
  if (COMBO_STARTER_STEPS.has(skill.comboStep)) {
    return true;
  }
  return skill.requiredComboStep !== null && skill.requiredComboStep !== undefined;
}

// スキル使用後のコンボ段階を決めます。
function getNextComboStep(skill) {
  // アビリティや、コンボと無関係なウェポンスキルはコンボ状態を変更しません。
  if (!isComboRelevant(skill)) {
    return state.comboStep;
  }

  // コンボの1段目はいつ押しても、そのコンボの開始として扱います。
  if (COMBO_STARTER_STEPS.has(skill.comboStep)) {
    return skill.comboStep;
  }

  // 2段目以降は、コンボ成功時だけ次の段階へ進みます。
  if (isComboSuccess(skill)) {
    return skill.comboStep;
  }

  // コンボ失敗時はコンボ状態をリセットします。
  return 0;
}

const DEFAULT_ANIMATION_LOCK = 0.67;

// GCD設定(state.gcdSetting)は通常GCD(2.5s基準)のスキルだけを置き換えます。
// レムール中の固定1.5s等、ゲーム側の仕様でスキル速度の影響を受けない特殊なGCDはそのままの値を使います。
function getEffectiveGcdRecast(skill) {
  const baseRecast = skill.gcdRecast ?? 2.5;
  return baseRecast === 2.5 ? state.gcdSetting : baseRecast;
}

function roundTime(value) {
  return Math.round(value * 100) / 100;
}

function getCooldownRemaining(skill) {
  if (skill.maxCharges) {
    const readyTimes = getPendingChargeReadyTimes(skill);
    return readyTimes.length < skill.maxCharges ? 0 : Math.max(0, roundTime(readyTimes[0] - state.elapsedTime));
  }

  // 未使用スキルの既定値は「絶対時刻0」ではなく助走区間の起点にします。
  // 0固定だと、助走区間中(elapsedTimeが負)は「0 - 負の時刻」で常に残り時間が出てしまうため。
  const readyAt = state.cooldowns[skill.cooldownGroup || skill.id] ?? -state.leadInDuration;
  return Math.max(0, roundTime(readyAt - state.elapsedTime));
}

function getPendingChargeReadyTimes(skill) {
  const chargeGroup = skill.chargeGroup || skill.id;
  const readyTimes = state.chargeReadyTimes[chargeGroup] || [];
  const pending = readyTimes.filter((readyAt) => readyAt > state.elapsedTime);
  state.chargeReadyTimes[chargeGroup] = pending;
  return pending;
}

function getAvailableCharges(skill) {
  if (!skill.maxCharges) {
    return null;
  }

  return skill.maxCharges - getPendingChargeReadyTimes(skill).length;
}

// チャージが1つ以上残っていても、次のチャージが貯まるまでの残り時間を返します（表示用）。
function getNextChargeRemaining(skill) {
  if (!skill.maxCharges) {
    return 0;
  }

  const readyTimes = getPendingChargeReadyTimes(skill);
  return readyTimes.length ? Math.max(0, roundTime(readyTimes[0] - state.elapsedTime)) : 0;
}

function getUnavailableReason(skill) {
  const actionRemaining = roundTime(state.actionReadyAt - state.elapsedTime);
  if (actionRemaining > 0) {
    return `硬直中（あと${actionRemaining.toFixed(2)}秒）`;
  }

  if (skill.gcd) {
    const gcdRemaining = roundTime(state.gcdReadyAt - state.elapsedTime);
    if (gcdRemaining > 0) {
      return `GCD中（あと${gcdRemaining.toFixed(2)}秒）`;
    }
  }

  const cooldownRemaining = getCooldownRemaining(skill);
  if (cooldownRemaining > 0) {
    return `リキャスト中（あと${cooldownRemaining.toFixed(2)}秒）`;
  }

  const resourceReason = getResourceUnavailableReason(skill);
  if (resourceReason) {
    return resourceReason;
  }

  return "";
}

// noTarget が付いていないスキルは、敵対象が必要なものとして扱います。
function requiresTarget(skill) {
  return !skill.noTarget;
}

function getResourceUnavailableReason(skill) {
  normalizeTimedJobState();

  // 戦闘時間(state.combatDuration)を過ぎたら、以降は新規の入力を受け付けません。
  if (state.combatDuration > 0 && state.elapsedTime >= state.combatDuration) {
    return "戦闘時間終了後は使用できません";
  }

  if ((skill.gaugeCost?.soul || 0) > state.soulGauge) {
    return `ソウルゲージ不足（必要${skill.gaugeCost.soul}）`;
  }

  const hasEnshroudReady = skill.id === "enshroud" && state.buffs.enshroudReady?.expiresAt > state.elapsedTime;
  if (!hasEnshroudReady && (skill.gaugeCost?.shroud || 0) > state.shroudGauge) {
    return `シュラウドゲージ不足（必要${skill.gaugeCost.shroud}）`;
  }

  const requirements = skill.requirements || {};
  if (skill.unavailableDuringEnshroud && isEnshrouded()) {
    return "レムール中は実行不可";
  }
  if (requirements.enshrouded && !isEnshrouded()) {
    return "レムール状態が必要";
  }
  if (requirements.notEnshrouded && isEnshrouded()) {
    return "すでにレムール状態です";
  }
  if ((requirements.soulReaver || 0) > state.soulReaverStacks) {
    return "妖異の鎌が必要";
  }
  if ((requirements.executioner || 0) > state.executionerStacks) {
    return "処刑人が必要";
  }
  if ((requirements.lemure || 0) > state.lemureStacks) {
    return `レムールスタック不足（必要${requirements.lemure}）`;
  }
  if ((requirements.void || 0) > state.voidStacks) {
    return `ヴォイドスタック不足（必要${requirements.void}）`;
  }
  if ((requirements.immortalSacrifice || 0) > state.immortalSacrificeStacks) {
    return `死の供物不足（必要${requirements.immortalSacrifice}）`;
  }
  if (requirements.buff) {
    const buff = state.buffs[requirements.buff];
    if (!buff || buff.expiresAt <= state.elapsedTime) {
      return `${skill.name}の実行条件を満たしていません`;
    }
  }
  if (requirements.buffAbsent && state.buffs[requirements.buffAbsent]?.expiresAt > state.elapsedTime) {
    return `${state.buffs[requirements.buffAbsent].name}の効果中は実行不可`;
  }
  if (requirements.sacrificium && !state.sacrificiumReady) {
    return "サクリフィキウム実行不可";
  }

  return "";
}

function isEnshrouded() {
  return state.enshroudedUntil > state.elapsedTime && state.lemureStacks > 0;
}

function matchesSlotCondition(condition) {
  switch (condition) {
    case "enshrouded":
      return isEnshrouded();
    case "executioner":
      return state.executionerStacks > 0;
    case "perfectioReady":
      return state.buffs.perfectioReady?.expiresAt > state.elapsedTime;
    case "soulSow":
      return state.buffs.soulSow?.expiresAt > state.elapsedTime;
    case "enhancedGibbet":
      return state.buffs.enhancedGibbet?.expiresAt > state.elapsedTime;
    case "enhancedGallows":
      return state.buffs.enhancedGallows?.expiresAt > state.elapsedTime;
    default:
      return false;
  }
}

// 枠(base)に対して、現在の状態で表示・実行すべきスキルを返します。
function getActiveSlotSkill(slot) {
  const activeVariant = slot.variants.find((variant) => matchesSlotCondition(variant.condition));
  if (!activeVariant) {
    return skills[slot.base];
  }
  return skills[activeVariant.skillId];
}

function normalizeTimedJobState() {
  if (state.soulReaverExpiresAt && state.soulReaverExpiresAt <= state.elapsedTime) {
    state.soulReaverStacks = 0;
    state.soulReaverExpiresAt = 0;
  }
  if (state.executionerExpiresAt && state.executionerExpiresAt <= state.elapsedTime) {
    state.executionerStacks = 0;
    state.executionerExpiresAt = 0;
  }
  if (state.enshroudedUntil && state.enshroudedUntil <= state.elapsedTime) {
    state.enshroudedUntil = 0;
    state.lemureStacks = 0;
    state.voidStacks = 0;
    state.sacrificiumReady = false;
  }
}

function canUseSkill(skill) {
  return getUnavailableReason(skill) === "";
}

function clampGauge(value) {
  return Math.max(0, Math.min(100, value));
}

function applyGaugeChanges(skill, comboSuccess) {
  if (skill.gaugeCost) {
    state.soulGauge = clampGauge(state.soulGauge - (skill.gaugeCost.soul || 0));
    const hasEnshroudReady = skill.id === "enshroud" && state.buffs.enshroudReady?.expiresAt > state.elapsedTime;
    state.shroudGauge = clampGauge(state.shroudGauge - (hasEnshroudReady ? 0 : skill.gaugeCost.shroud || 0));
  }

  if (skill.gaugeGain && (!skill.gaugeGainOnCombo || comboSuccess)) {
    state.soulGauge = clampGauge(state.soulGauge + (skill.gaugeGain.soul || 0));
    state.shroudGauge = clampGauge(state.shroudGauge + (skill.gaugeGain.shroud || 0));
  }
}

function spendCharge(skill, usedAt) {
  const chargeGroup = skill.chargeGroup || skill.id;
  const readyTimes = getPendingChargeReadyTimes(skill);
  const previousReadyAt = readyTimes.length ? readyTimes[readyTimes.length - 1] : usedAt;
  readyTimes.push(roundTime(Math.max(previousReadyAt, usedAt) + skill.recast));
  state.chargeReadyTimes[chargeGroup] = readyTimes;
}

function applyEffects(skill) {
  skill.effects.forEach((effect) => {
    if (effect.type === "buff") {
      const current = state.buffs[effect.id];
      const isActive = current && current.expiresAt > state.elapsedTime;
      if (isActive) {
        current.expiresAt = roundTime(state.elapsedTime + effect.duration);
      } else {
        const nextBuff = {
          type: "buff",
          id: effect.id,
          name: effect.name,
          potencyMultiplier: effect.potencyMultiplier || 1,
          showOnTimeline: Boolean(effect.showOnTimeline),
          appliedAt: state.elapsedTime,
          expiresAt: roundTime(state.elapsedTime + effect.duration)
        };
        state.buffs[effect.id] = nextBuff;
        state.effectHistory.push(nextBuff);
      }
      return;
    }

    if (effect.type !== "debuff") {
      return;
    }

    const current = state.debuffs[effect.id];
    const isActive = current && current.expiresAt > state.elapsedTime;
    const remaining = isActive ? current.expiresAt - state.elapsedTime : 0;
    const nextDuration = Math.min(remaining + effect.duration, effect.maxDuration || effect.duration);
    if (isActive) {
      current.expiresAt = roundTime(state.elapsedTime + nextDuration);
    } else {
      const nextDebuff = {
        type: "debuff",
        id: effect.id,
        name: effect.name,
        showOnTimeline: Boolean(effect.showOnTimeline),
        appliedAt: state.elapsedTime,
        expiresAt: roundTime(state.elapsedTime + nextDuration)
      };
      state.debuffs[effect.id] = nextDebuff;
      state.effectHistory.push(nextDebuff);
    }
  });
}

function applyJobEffects(skill) {
  const effects = skill.jobEffects || {};
  if (skill.gcd && !effects.soulReaverCost && state.soulReaverStacks > 0) {
    state.soulReaverStacks = 0;
    state.soulReaverExpiresAt = 0;
  }
  if (skill.gcd && !effects.executionerCost && state.executionerStacks > 0) {
    state.executionerStacks = 0;
    state.executionerExpiresAt = 0;
  }
  if (effects.soulReaverSet !== undefined) {
    state.soulReaverStacks = effects.soulReaverSet;
    state.soulReaverExpiresAt = effects.soulReaverSet ? roundTime(state.elapsedTime + 30) : 0;
  }
  if (effects.executionerSet !== undefined) {
    state.executionerStacks = effects.executionerSet;
    state.executionerExpiresAt = effects.executionerSet ? roundTime(state.elapsedTime + 30) : 0;
  }
  state.soulReaverStacks = Math.max(0, state.soulReaverStacks - (effects.soulReaverCost || 0));
  state.executionerStacks = Math.max(0, state.executionerStacks - (effects.executionerCost || 0));
  if (state.soulReaverStacks === 0) {
    state.soulReaverExpiresAt = 0;
  }
  if (state.executionerStacks === 0) {
    state.executionerExpiresAt = 0;
  }
  state.lemureStacks = Math.max(0, state.lemureStacks - (effects.lemureCost || 0));
  state.voidStacks = Math.max(0, Math.min(5, state.voidStacks + (effects.voidGain || 0) - (effects.voidCost || 0)));

  if (effects.enterEnshroud) {
    state.lemureStacks = 5;
    state.voidStacks = 0;
    state.enshroudedUntil = roundTime(state.elapsedTime + 30);
    state.sacrificiumReady = true;
    state.reapingCombo = null;
    delete state.buffs.enshroudReady;
    delete state.buffs.perfectioReady;
  }
  if (effects.reapingComboSet) {
    state.reapingCombo = effects.reapingComboSet;
  }
  if (effects.consumeSacrificium) {
    state.sacrificiumReady = false;
  }
  if (effects.exitEnshroud || state.lemureStacks === 0) {
    state.lemureStacks = 0;
    state.voidStacks = 0;
    state.enshroudedUntil = 0;
    state.sacrificiumReady = false;
    state.reapingCombo = null;
  }
  // reduceCooldown(例: ハルパーによるヘルズイングレス/イーグレスの再使用時間短縮)は、
  // 消費対象のバフ(ハルパー効果アップ)が実際に付与されていた場合だけ適用します
  // (公式ジョブガイドいわく、この短縮は「ハルパー効果アップ」を消費した強化ハルパー限定の効果のため)。
  let hadActiveConsumedBuff = true;
  if (effects.consumeBuff) {
    const consumedBuff = state.buffs[effects.consumeBuff];
    hadActiveConsumedBuff = Boolean(consumedBuff && consumedBuff.expiresAt > state.elapsedTime);
    delete state.buffs[effects.consumeBuff];
  }
  if (effects.reduceCooldown && hadActiveConsumedBuff) {
    const currentReadyAt = state.cooldowns[effects.reduceCooldown.group] ?? -state.leadInDuration;
    state.cooldowns[effects.reduceCooldown.group] = Math.max(
      state.elapsedTime,
      roundTime(currentReadyAt - effects.reduceCooldown.amount)
    );
  }
  if (effects.applyPersistentBuff) {
    state.buffs[effects.applyPersistentBuff.id] = {
      type: "buff",
      id: effects.applyPersistentBuff.id,
      name: effects.applyPersistentBuff.name,
      appliedAt: state.elapsedTime,
      expiresAt: Number.MAX_SAFE_INTEGER
    };
  }
  if (effects.consumeImmortalSacrifice) {
    state.immortalSacrificeStacks = 0;
  }
  if (effects.grantEnshroudReady) {
    applyTimedBuff("enshroudReady", "レムールシュラウド実行可", 30);
  }
  if (effects.grantPerfectioPending) {
    applyTimedBuff("perfectioPending", "ペルフェクティオ待機", 30);
  }
  if (effects.promotePerfectio && state.buffs.perfectioPending?.expiresAt > state.elapsedTime) {
    delete state.buffs.perfectioPending;
    applyTimedBuff("perfectioReady", "ペルフェクティオ実行可", 30);
  }
  const sacrificeCircle = state.buffs.circleOfSacrifice;
  if (skill.type !== "ability" && skill.id !== "plentifulHarvest" && sacrificeCircle?.expiresAt > state.elapsedTime) {
    state.immortalSacrificeStacks = Math.min(8, state.immortalSacrificeStacks + 1);
  }
}

function applyTimedBuff(id, name, duration) {
  const timedBuff = {
    type: "buff",
    id,
    name,
    appliedAt: state.elapsedTime,
    expiresAt: roundTime(state.elapsedTime + duration)
  };
  state.buffs[id] = timedBuff;
  state.effectHistory.push(timedBuff);
}

// 画面のボタンから呼ばれる、スキル使用処理の入口です。
// silent: true のときは一括再生中として render() を呼びません(呼び出し側が最後にまとめて描画します)。
// preserveLanding: true のときは state.elapsedTime を「再現したい着弾時刻」としてそのまま使い、
// 詠唱時間を再度加算しません(rebuildFromHistory の preserveTiming 再生専用)。
function useSkill(skillId, { silent = false, preserveLanding = false } = {}) {
  // 過去確認中でも通常入力は常にタイムライン末尾へ追加します。
  state.displayTime = null;
  // skills から、押されたスキルIDに対応するデータを取得します。
  const skill = skills[skillId];

  // 存在しないスキルIDなら、状態を変えずに処理を終えます。
  if (!skill) {
    return false;
  }

  // ゲージなど時間経過では解消しない条件は、時刻を進める前に判定します。
  const resourceReason = getResourceUnavailableReason(skill);
  if (resourceReason) {
    state.message = `${skill.name}は${resourceReason}`;
    if (!silent) render();
    return false;
  }

  // 共通GCD／アクション硬直だけを考慮した場合の到達時刻です（個別リキャストは含みません）。
  // 「制限なし」の既定値は絶対時刻0ではなく助走区間の起点にします（getSkillReadyAtと同じ理由）。
  const naturalReadyAt = Math.max(state.actionReadyAt, skill.gcd ? state.gcdReadyAt : -state.leadInDuration);
  // 個別リキャスト／チャージも含めた、実際にこのスキルが使える時刻です。
  const readyAt = getSkillReadyAt(skill);

  // 個別リキャストとチャージ切れは入力による自動待機の対象にしません。
  // ただし、共通GCD／硬直の解消を待つ間に個別リキャストも自然に明けるなら、そのまま進めます
  // （例: ソウルスライスの次チャージがGCD中に明ける場合は、続けて押せます）。
  if (readyAt > naturalReadyAt) {
    const cooldownRemaining = roundTime(readyAt - state.elapsedTime);
    state.message = `${skill.name}はリキャスト中（あと${cooldownRemaining.toFixed(2)}秒）`;
    if (!silent) render();
    return false;
  }

  // 共通GCDとアクション硬直だけは、回しを連続入力できるよう自動で進めます。
  // 明示的な待機ボタンは、回しに意図的な空白を作るために使います。
  if (readyAt > state.elapsedTime) {
    state.elapsedTime = roundTime(readyAt);
  }

  const unavailableReason = getUnavailableReason(skill);
  if (unavailableReason) {
    state.message = `${skill.name}は${unavailableReason}`;
    if (!silent) render();
    return false;
  }

  // 詠唱系スキルは、詠唱開始(押した時刻)から詠唱時間(castTime)ぶん後に着弾します。
  // GCDは詠唱開始基準、威力・コンボ・効果判定はすべて着弾時刻(state.elapsedTime)基準にします。
  // castTimeEnhancedBy(例: ハルパー効果アップ)が付与されている間は、詠唱時間無しで詠唱できます
  // (公式ジョブガイドいわく、ヘルズイングレス/イーグレスが付与する「ハルパー効果アップ」の効果)。
  const castTimeEnhancement = skill.castTimeEnhancedBy && state.buffs[skill.castTimeEnhancedBy];
  const hasCastTimeEnhancement = Boolean(castTimeEnhancement && castTimeEnhancement.expiresAt > state.elapsedTime);
  const castTime = hasCastTimeEnhancement ? 0 : (skill.castTime || 0);
  let castStartAt;
  if (preserveLanding) {
    // 再生時: state.elapsedTime は既に「再現したい着弾時刻」なので動かさず、詠唱開始だけ逆算します。
    castStartAt = roundTime(state.elapsedTime - castTime);
  } else {
    // 助走区間中に対象必須のスキルを押した場合、押した時刻に関わらず0秒にちょうど着弾させます
    // （詠唱時間があるスキルは、詠唱開始がそこから詠唱時間ぶん逆算した時刻になります。
    // 詠唱時間が無いスキルはcastTime=0なので、そのまま0秒着弾・0秒硬直開始になります）。
    const isPrePullSnap = requiresTarget(skill) && state.elapsedTime < 0;
    castStartAt = isPrePullSnap ? roundTime(-castTime) : state.elapsedTime;
    state.elapsedTime = isPrePullSnap ? 0 : roundTime(castStartAt + castTime);
  }

  // 現在のコンボ状態をもとに、今回加算する威力を決めます。
  const comboSuccess = isComboSuccess(skill);
  const potency = calculatePotency(skill);

  const activePotencyEffects = state.effectHistory.filter((effect) => (
    effect.showOnTimeline && effect.appliedAt <= state.elapsedTime && effect.expiresAt > state.elapsedTime
  ));

  // 合計威力へ今回の威力を加算します。
  state.totalPotency += potency;
  activePotencyEffects.forEach((effect) => {
    effect.potency = (effect.potency || 0) + potency;
    effect.actionCount = (effect.actionCount || 0) + 1;
  });

  // スキル使用後のコンボ段階へ更新します。
  const nextComboStep = getNextComboStep(skill);
  if (isComboRelevant(skill)) {
    // コンボが開始／継続したら30秒の持続時間をリセットし、途切れたら0に戻します。
    // アビリティや、ジビトゥ等のコンボと無関係なウェポンスキルはここに来ないため変更しません。
    state.comboExpiresAt = nextComboStep === 0 ? 0 : roundTime(state.elapsedTime + 30);
  }
  state.comboStep = nextComboStep;
  applyGaugeChanges(skill, comboSuccess);
  applyEffects(skill);
  applyJobEffects(skill);

  const usedAt = state.elapsedTime; // 着弾時刻
  const animationLock = skill.animationLock ?? DEFAULT_ANIMATION_LOCK;
  // 詠唱系(castTimeあり)のモーション硬直は詠唱中に完了しているとみなし、着弾後に追加の硬直は発生させません。
  // これにより「詠唱＞アビリティ1つ＞次のGCD」がロスなく回ります。
  state.actionReadyAt = castTime > 0 ? usedAt : roundTime(usedAt + animationLock);
  const clipping = skill.type === "ability" && state.gcdReadyAt > usedAt
    ? Math.max(0, roundTime(state.actionReadyAt - state.gcdReadyAt))
    : 0;

  // GCDと個別リキャストは、着弾ではなく詠唱開始(castStartAt)から起算します。
  if (skill.gcd) {
    state.gcdReadyAt = roundTime(castStartAt + getEffectiveGcdRecast(skill));
  }

  if (skill.maxCharges) {
    spendCharge(skill, castStartAt);
  } else if (skill.recast) {
    state.cooldowns[skill.cooldownGroup || skill.id] = roundTime(castStartAt + skill.recast);
  }

  // 画面に表示できるように、使用履歴を保存します。
  const historyEntry = {
    skillName: skill.name,
    skillId: skill.id,
    usedAt: usedAt,
    castStartAt: castStartAt,
    type: skill.type,
    potency: potency,
    comboSuccess: comboSuccess,
    charges: getAvailableCharges(skill),
    soulGauge: state.soulGauge,
    shroudGauge: state.shroudGauge,
    soulReaverStacks: state.soulReaverStacks,
    soulReaverExpiresAt: state.soulReaverExpiresAt,
    executionerStacks: state.executionerStacks,
    executionerExpiresAt: state.executionerExpiresAt,
    lemureStacks: state.lemureStacks,
    voidStacks: state.voidStacks,
    reapingCombo: state.reapingCombo,
    totalPotency: state.totalPotency,
    comboStep: state.comboStep,
    clipping
  };
  historyEntry.snapshot = createStateSnapshot();
  state.history.push(historyEntry);

  state.message = "";

  // 状態が変わったので、画面表示を更新します。
  if (!silent) render();
  return true;
}

// state.history の1エントリ(スキル or 待機)を、rebuildFromHistory が受け取る
// entries 用の形へ変換します。待機には skillId が無いため、kind で分岐します。
function toReplayEntry(entry, preserveTiming) {
  if (entry.kind === "wait") {
    return { kind: "wait", duration: entry.duration, usedAt: entry.usedAt, preserveTiming };
  }
  return { skillId: entry.skillId, usedAt: entry.usedAt, preserveTiming };
}

// entries の各要素は { skillId, usedAt, preserveTiming } または
// { kind: "wait", duration, usedAt, preserveTiming } の形を取ります。
// スキルは preserveTiming: true なら元の使用時刻をそのまま使い、false なら
// 直前までの再生結果をもとに最短の使用可能時刻へ詰め直します。
// 待機には「準備完了時刻」という概念が無いため、preserveTiming に関わらず
// 常にその時点の経過時間へ duration をそのまま加算します(スキップ・詰め直しの対象外)。
// 編集(削除・戻す・読込)によって再生不能になったアクションは戻り値の droppedNames で報告されます。
function rebuildFromHistory(entries, finalElapsedTime = null) {
  resetSimulator(false);
  const droppedNames = [];
  entries.forEach((entry) => {
    if (entry.kind === "wait") {
      const startAt = state.elapsedTime;
      state.elapsedTime = roundTime(startAt + entry.duration);
      recordWait(startAt, entry.duration);
      return;
    }
    state.elapsedTime = entry.preserveTiming
      ? Math.max(state.elapsedTime, entry.usedAt)
      : Math.max(state.elapsedTime, getSkillReadyAt(skills[entry.skillId]));
    // preserveTiming時は entry.usedAt(元の着弾時刻)をそのまま再現したいので、
    // useSkill側で詠唱時間を再度加算させないようにします。
    const succeeded = useSkill(entry.skillId, { silent: true, preserveLanding: entry.preserveTiming });
    if (!succeeded) {
      droppedNames.push(skills[entry.skillId]?.name || entry.skillId);
    }
  });
  if (finalElapsedTime !== null) {
    state.elapsedTime = Math.max(state.elapsedTime, finalElapsedTime);
  }
  state.displayTime = null;
  state.message = droppedNames.length
    ? `編集の影響で実行できなくなり削除されました: ${droppedNames.join("、")}`
    : "";
  render();
  return droppedNames;
}

function undoLastAction() {
  if (!state.history.length) return false;
  const entries = state.history.slice(0, -1).map((entry) => toReplayEntry(entry, true));
  rebuildFromHistory(entries);
  return true;
}

function deleteActionAt(index) {
  if (index < 0 || index >= state.history.length) return false;
  const entries = state.history
    .map((entry, entryIndex) => toReplayEntry(entry, entryIndex < index))
    .filter((_, entryIndex) => entryIndex !== index);
  rebuildFromHistory(entries);
  return true;
}

// others（state.history の時系列配列）へ newEntry を targetTime の位置に挿入した
// rebuildFromHistory 用 entries を組み立てます。
// cutoffTime より前の元の使用時刻はそのまま保持し、それ以降（新規/移動分を含む）は詰め直します。
// インデックスではなく時刻で判定するため、複数件の同時編集にも安全に拡張できます。
function splicePreservingOrder(others, newEntry, targetTime, cutoffTime) {
  const insertBeforeIndex = others.findIndex((entry) => entry.usedAt > targetTime);
  const withPreserve = others.map((entry) => toReplayEntry(entry, entry.usedAt < cutoffTime));
  const insertionEntry = newEntry.kind === "wait"
    ? { kind: "wait", duration: newEntry.duration, usedAt: targetTime, preserveTiming: false }
    : { skillId: newEntry.skillId, usedAt: targetTime, preserveTiming: false };
  if (insertBeforeIndex === -1) {
    withPreserve.push(insertionEntry);
  } else {
    withPreserve.splice(insertBeforeIndex, 0, insertionEntry);
  }
  return withPreserve;
}

// タイムライン上の既存アクション（オブジェクト参照で特定）を targetTime の位置へ移動します。
function moveTimelineAction(movedEntry, targetTime) {
  if (!state.history.includes(movedEntry)) return [];
  const others = state.history.filter((entry) => entry !== movedEntry);
  const cutoffTime = Math.min(movedEntry.usedAt, targetTime);
  const entries = splicePreservingOrder(others, movedEntry, targetTime, cutoffTime);
  return rebuildFromHistory(entries);
}

// 新規スキルを targetTime の位置へ挿入します（末尾追加ではなく、途中への挿入）。
function insertTimelineAction(skillId, targetTime) {
  if (!skills[skillId]) return [];
  const entries = splicePreservingOrder(state.history, { skillId }, targetTime, targetTime);
  return rebuildFromHistory(entries);
}

function getSkillReadyAt(skill) {
  // 「制限なし」の既定値は絶対時刻0ではなく助走区間の起点にします（getCooldownRemainingと同じ理由）。
  const noRestriction = -state.leadInDuration;
  const chargeReadyAt = skill.maxCharges && getAvailableCharges(skill) === 0
    ? getPendingChargeReadyTimes(skill)[0]
    : noRestriction;

  return Math.max(
    state.actionReadyAt,
    skill.gcd ? state.gcdReadyAt : noRestriction,
    skill.maxCharges ? chargeReadyAt : (state.cooldowns[skill.cooldownGroup || skill.id] ?? noRestriction)
  );
}

function getNextReadyTime() {
  const futureTimes = Object.values(skills)
    .map(getSkillReadyAt)
    .filter((time) => time > state.elapsedTime);

  return futureTimes.length ? Math.min(...futureTimes) : null;
}

// いずれかのスキルが次に入力可能になる時刻まで進めます。
function waitUntilNextReady() {
  const nextReadyTime = getNextReadyTime();

  if (nextReadyTime === null) {
    state.message = "待機が必要な状態はありません。";
    render();
    return false;
  }

  state.elapsedTime = roundTime(nextReadyTime);
  state.message = "";
  render();
  return true;
}

// 待機の履歴エントリを組み立てます。state.elapsedTime を進めた「あと」に呼び出してください
// (snapshot が終了時刻の状態を正しく捉えるため)。
function buildWaitEntry(startAt, duration) {
  return {
    kind: "wait",
    usedAt: startAt,
    duration,
    endAt: state.elapsedTime,
    snapshot: createStateSnapshot()
  };
}

// 直前の履歴が切れ目なく連続した待機なら、新規エントリを追加せず合算します
// (連打・編集の結果どちらでも同じタイル1つにまとまるよう、ライブ入力(applyWait)と
// 再生(rebuildFromHistory)の両方から使う共通ヘルパーです)。
// state.elapsedTime は呼び出し前に既に「待機後の時刻」まで進めておいてください。
function recordWait(startAt, duration) {
  const lastEntry = state.history[state.history.length - 1];
  if (lastEntry && lastEntry.kind === "wait" && lastEntry.endAt === startAt) {
    lastEntry.duration = roundTime(lastEntry.duration + duration);
    lastEntry.endAt = state.elapsedTime;
    lastEntry.snapshot = createStateSnapshot();
    return;
  }
  state.history.push(buildWaitEntry(startAt, duration));
}

// 待機をタイムライン末尾に追加します(スキル使用と同様、常にライブの現在時刻から進めます)。
function applyWait(duration, { silent = false } = {}) {
  // 過去確認中でも通常入力は常にタイムライン末尾へ追加します(useSkillと同じ規約)。
  state.displayTime = null;
  const startAt = state.elapsedTime;
  state.elapsedTime = roundTime(startAt + duration);
  recordWait(startAt, duration);
  state.message = "";
  if (!silent) render();
  return true;
}

function waitForDuration(duration) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return false;
  }

  // 戦闘時間を過ぎている場合は、待機の追加も新規入力として受け付けません。
  if (state.combatDuration > 0 && state.elapsedTime >= state.combatDuration) {
    state.message = "戦闘時間終了後は使用できません";
    render();
    return false;
  }

  return applyWait(duration);
}

// シミュレーターの状態を初期値に戻します。
// state.leadInDuration(助走時間の設定値)はここではリセットせず、そのまま引き継ぎます。
function resetSimulator(shouldRender = true) {
  const startTime = roundTime(-state.leadInDuration);
  state.elapsedTime = startTime;
  state.totalPotency = 0;
  state.comboStep = 0;
  state.comboExpiresAt = 0;
  state.soulGauge = 0;
  state.shroudGauge = 0;
  state.soulReaverStacks = 0;
  state.soulReaverExpiresAt = 0;
  state.executionerStacks = 0;
  state.executionerExpiresAt = 0;
  state.lemureStacks = 0;
  state.voidStacks = 0;
  state.enshroudedUntil = 0;
  state.sacrificiumReady = false;
  state.reapingCombo = null;
  state.immortalSacrificeStacks = 0;
  // GCD/硬直の「制限なし」を絶対時刻0ではなく助走区間の起点にすることで、
  // 助走区間中(elapsedTimeが負)でも未使用スキルが常に使用可能な状態から始まります。
  state.gcdReadyAt = startTime;
  state.actionReadyAt = startTime;
  state.cooldowns = {};
  state.chargeReadyTimes = {};
  state.buffs = {};
  state.debuffs = {};
  state.effectHistory = [];
  state.displayTime = null;
  state.message = "";
  state.history = [];

  // リセット後の状態を画面へ反映します。
  if (shouldRender) render();
}
