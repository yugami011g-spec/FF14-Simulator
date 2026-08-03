const TIMELINE_DURATION = 35;
const TIMELINE_BASE_WIDTH = 1206;
// 末尾のアクション（left:100%付近）がアイコン幅ぶんはみ出さないよう、右側に確保する余白です。
// css/style.css の calc(100% - 48px) と対にして使うため、値を変える場合は両方合わせてください。
const TIMELINE_RIGHT_MARGIN = 48;
// タイムラインが伸びた際、最後のアクションから確保する最低余白（秒）。GCD1回分。
const TIMELINE_TRAILING_SECONDS = 2.5;
// この距離(px)を超えて動いたら「クリック」ではなく「ドラッグ」として扱います。
const DRAG_THRESHOLD_PX = 6;
let lastRenderedHistoryLength = 0;

// 助走区間(助走時間の設定値)の分だけ、タイムラインの表示開始時刻をマイナス側にずらします。
// 助走時間が0(未設定)なら従来通り0秒開始です。
function getTimelineContentStart() {
  return -state.leadInDuration;
}

function getTimelineContentEnd() {
  // 戦闘時間が設定されている場合は、実際のアクション有無に関わらずその長さでTLを固定します
  // (それ以降は入力を受け付けないため、動的に伸ばす必要がありません)。
  if (state.combatDuration > 0) {
    return state.combatDuration;
  }
  // 待機は終了時刻(endAt)まで表示範囲を押し広げる必要があります。
  const latestActionAt = Math.max(0, ...state.history.map((entry) => (entry.kind === "wait" ? entry.endAt : entry.usedAt)));
  // 5秒刻みの丸めだけだと、最後のアクションがちょうど5秒境界に乗ったときに余白が無くなるため、
  // 先に最低余白(TIMELINE_TRAILING_SECONDS)を確保してから丸めます。
  const contentEnd = Math.max(TIMELINE_DURATION, latestActionAt + TIMELINE_TRAILING_SECONDS);
  return Math.ceil(contentEnd / 5) * 5;
}

// 表示区間(開始〜終端)の合計秒数を返します。助走区間ぶんも含みます。
function getTimelineContentDuration() {
  return getTimelineContentEnd() - getTimelineContentStart();
}

// 戦闘時間の入力欄(m:ss形式)を秒数へ変換します。空欄や不正な値は0(無制限)扱いです。
function parseCombatDurationInput(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  const match = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  const asSeconds = Number(trimmed);
  return Number.isFinite(asSeconds) && asSeconds >= 0 ? Math.round(asSeconds) : 0;
}

// 秒数をm:ss形式の表示用文字列へ変換します。0(無制限)は空欄で表します。
function formatCombatDuration(seconds) {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

// ドラッグ中の挿入先目安を、対象トラック内の縦バーで示します（GCD/アビリティ行のどちらか一方だけに表示）。
function updateTimelineDropIndicator(trackEl, leftPx) {
  document.querySelectorAll(".timeline-drop-indicator").forEach((el) => { el.hidden = true; });
  let indicator = trackEl.querySelector(".timeline-drop-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "timeline-drop-indicator";
    trackEl.appendChild(indicator);
  }
  indicator.style.left = `${leftPx}px`;
  indicator.hidden = false;
}

function hideTimelineDropIndicator() {
  document.querySelectorAll(".timeline-drop-indicator").forEach((el) => { el.hidden = true; });
}

// ドロップ位置以降の既存アクションを横へずらし、iOSのアプリ並び替えのように隙間が開いて見えるようにします。
// excludeItem に渡した要素（自分自身をドラッグ中の場合）はずらしません。
function shiftTimelineSiblingsForGap(trackEl, targetTime, gapWidthPx, excludeItem) {
  trackEl.querySelectorAll(".timeline-action").forEach((el) => {
    if (el === excludeItem) return;
    const castStartAt = Number(el.dataset.castStartAt);
    el.style.transform = castStartAt >= targetTime ? `translateX(${gapWidthPx}px)` : "";
  });
}

function clearTimelineSiblingGap(trackEl) {
  if (!trackEl) return;
  trackEl.querySelectorAll(".timeline-action").forEach((el) => { el.style.transform = ""; });
}

function renderSkillButtons() {
  const weaponskillButtons = document.getElementById("weaponskillButtons");
  const abilityButtons = document.getElementById("abilityButtons");
  const roleActionButtons = document.getElementById("roleActionButtons");
  weaponskillButtons.innerHTML = "";
  abilityButtons.innerHTML = "";
  roleActionButtons.innerHTML = "";

  Object.values(skills).forEach((skill) => {
    // 置き換わり先(variant)は base 側のボタンからまとめて表示・実行するため、専用ボタンは作りません。
    if (slotVariantSkillIds.has(skill.id)) return;
    const slot = slotsByBase.get(skill.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-tile skill-button";
    button.dataset.skillId = skill.id;
    button.innerHTML = `<strong><img class="skill-icon" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='';" onload="this.style.display=''; this.nextElementSibling.style.display='none';"><span class="skill-name-fallback">${skill.shortName || skill.name}</span><em class="recast-time"></em><i class="charge-badge"></i></strong>`;
    setupSkillButtonInsertDrag(button, skill, slot);
    button.addEventListener("pointerenter", () => showSkillTooltip(button));
    button.addEventListener("pointerleave", hideSkillTooltip);
    button.addEventListener("focus", () => showSkillTooltip(button));
    button.addEventListener("blur", hideSkillTooltip);
    const container = skill.category === "role"
      ? roleActionButtons
      : skill.type === "ability"
        ? abilityButtons
        : weaponskillButtons;
    container.appendChild(button);
  });
}

// スキル操作欄のボタンを、タイムライン上の任意位置へドラッグして挿入できるようにします。
// 閾値未満の操作はドラッグとみなさず、従来通りクリック=末尾追加として扱います。
function setupSkillButtonInsertDrag(button, skill, slot) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let suppressClick = false;
  let overChart = false;
  let chartEl = null;
  let currentGapRow = null;

  const resolveActiveSkill = () => (slot ? getActiveSlotSkill(slot) : skill);

  const onPointerMove = (event) => {
    if (pointerId === null) return;
    const ghost = document.getElementById("dragGhost");
    if (!dragging) {
      const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
      if (moved < DRAG_THRESHOLD_PX) return;
      dragging = true;
      chartEl = document.querySelector(".timeline-chart");
      hideSkillTooltip();
      button.classList.add("is-dragging");
      const activeSkillAtStart = resolveActiveSkill();
      const ghostImg = ghost.querySelector("img");
      ghostImg.style.display = "";
      ghostImg.src = `assets/icons/${activeSkillAtStart.id}.png`;
      ghost.querySelector(".drag-ghost-fallback").textContent = activeSkillAtStart.shortName || activeSkillAtStart.name;
      ghost.hidden = false;
    }
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;

    const chartRect = chartEl.getBoundingClientRect();
    overChart = event.clientX >= chartRect.left && event.clientX <= chartRect.right
      && event.clientY >= chartRect.top && event.clientY <= chartRect.bottom;
    if (overChart) {
      const activeSkill = resolveActiveSkill();
      const rowEl = document.getElementById(activeSkill.type === "ability" ? "abilityTimeline" : "gcdTimeline");
      const rowRect = rowEl.getBoundingClientRect();
      const targetTime = timeFromPointerX(rowEl, event.clientX);
      const indicatorLeftPx = Math.max(0, Math.min(rowRect.width, ((targetTime - getTimelineContentStart()) / getTimelineContentDuration()) * rowRect.width));
      updateTimelineDropIndicator(rowEl, indicatorLeftPx);
      if (currentGapRow && currentGapRow !== rowEl) clearTimelineSiblingGap(currentGapRow);
      // GCD/アビリティ行のアイコン幅(css/style.cssの .timeline-action / .timeline-row-ability .timeline-action と対)。
      const gapWidthPx = activeSkill.type === "ability" ? 34 : 44;
      shiftTimelineSiblingsForGap(rowEl, targetTime, gapWidthPx, null);
      currentGapRow = rowEl;
    } else {
      hideTimelineDropIndicator();
      if (currentGapRow) {
        clearTimelineSiblingGap(currentGapRow);
        currentGapRow = null;
      }
    }
  };

  const finishDrag = (event, shouldCommit) => {
    if (pointerId === null) return;
    if (button.releasePointerCapture) {
      try { button.releasePointerCapture(pointerId); } catch { /* capture already released */ }
    }
    pointerId = null;
    hideTimelineDropIndicator();
    if (currentGapRow) {
      clearTimelineSiblingGap(currentGapRow);
      currentGapRow = null;
    }
    document.getElementById("dragGhost").hidden = true;
    button.classList.remove("is-dragging");
    if (dragging && shouldCommit && overChart) {
      suppressClick = true;
      const activeSkill = resolveActiveSkill();
      const rowEl = document.getElementById(activeSkill.type === "ability" ? "abilityTimeline" : "gcdTimeline");
      const targetTime = timeFromPointerX(rowEl, event.clientX);
      const droppedNames = insertTimelineAction(activeSkill.id, targetTime);
      if (droppedNames.length) {
        state.message = `編集の影響で実行できなくなり削除されました: ${droppedNames.join("、")}`;
        render();
      }
    } else if (dragging) {
      // タイムライン外でのドロップ、または中断(pointercancel)は挿入しません。
      suppressClick = true;
    }
    dragging = false;
    overChart = false;
  };

  button.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    if (button.setPointerCapture) {
      try { button.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    }
  });
  button.addEventListener("pointermove", onPointerMove);
  button.addEventListener("pointerup", (event) => finishDrag(event, true));
  button.addEventListener("pointercancel", (event) => finishDrag(event, false));
  button.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    useSkill(resolveActiveSkill().id);
  });
}

function setupControls() {
  document.getElementById("resetButton").addEventListener("click", resetSimulator);
  document.getElementById("undoButton").addEventListener("click", undoLastAction);
  document.getElementById("returnLatestButton").addEventListener("click", () => {
    state.displayTime = null;
    render();
  });
  document.getElementById("saveButton").addEventListener("click", saveRotation);
  document.getElementById("loadButton").addEventListener("click", loadRotation);
  document.getElementById("leadInInput").addEventListener("change", (event) => {
    // カウントの起点そのものが変わるため、既存の回しはリセットします。
    const value = Math.min(30, Math.max(0, Math.round(Number(event.target.value) || 0)));
    event.target.value = value;
    state.leadInDuration = value;
    resetSimulator();
  });
  document.getElementById("combatDurationInput").addEventListener("change", (event) => {
    const seconds = parseCombatDurationInput(event.target.value);
    state.combatDuration = seconds;
    event.target.value = formatCombatDuration(seconds);
    render();
  });
  document.getElementById("gcdSettingInput").addEventListener("change", (event) => {
    const value = Math.max(1, Number(event.target.value) || 2.5);
    state.gcdSetting = roundTime(value);
    event.target.value = state.gcdSetting.toFixed(2);
    // 既存のTLアクションにも新しいGCD値を反映するため、全エントリを詰め直して再計算します。
    // 待機(kind: "wait")は元々preserveTimingに関わらず固定長のため、この再計算でも間隔は保たれます。
    const entries = state.history.map((entry) => toReplayEntry(entry, false));
    rebuildFromHistory(entries);
  });
  setupTimelineIndicatorDrag();
  setupTimelinePan();
  document.querySelectorAll("[data-wait]").forEach((button) => {
    button.addEventListener("click", () => waitForDuration(Number(button.dataset.wait)));
  });
}

function saveRotation() {
  localStorage.setItem("ff14-reaper-rotation", JSON.stringify({
    version: 1,
    elapsedTime: state.elapsedTime,
    actions: state.history.map((entry) => (entry.kind === "wait"
      ? { kind: "wait", duration: entry.duration, usedAt: entry.usedAt }
      : { skillId: entry.skillId, usedAt: entry.usedAt }))
  }));
  state.message = "現在の回しを保存しました。";
  render();
}

function loadRotation() {
  try {
    const saved = JSON.parse(localStorage.getItem("ff14-reaper-rotation"));
    if (!saved || !Array.isArray(saved.actions)) throw new Error("empty");
    // kindフィールドの無い旧保存データはスキルとして扱われます(自動的に下の分岐へ落ちます)。
    const entries = saved.actions
      .filter((entry) => (entry.kind === "wait"
        ? Number.isFinite(entry.usedAt) && Number.isFinite(entry.duration) && entry.duration > 0
        : skills[entry.skillId] && Number.isFinite(entry.usedAt)))
      .map((entry) => (entry.kind === "wait"
        ? { kind: "wait", duration: entry.duration, usedAt: entry.usedAt, preserveTiming: true }
        : { skillId: entry.skillId, usedAt: entry.usedAt, preserveTiming: true }));
    const droppedNames = rebuildFromHistory(entries, Number(saved.elapsedTime) || 0);
    state.message = droppedNames.length
      ? `保存した回しを読み込みました(実行できず削除: ${droppedNames.join("、")})。`
      : "保存した回しを読み込みました。";
    render();
  } catch {
    state.message = "読み込める回しがありません。";
    render();
  }
}

// ポインターのX座標を、指定した要素の幅を基準にタイムライン上の時刻へ変換します。
function timeFromPointerX(trackEl, clientX) {
  const rect = trackEl.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return roundTime(getTimelineContentStart() + ratio * getTimelineContentDuration());
}

// タイムインジケーター本体に加えて、目盛り(定規)エリアもクリック・ドラッグで
// プレイヘッドを動かせるようにします（AE/Prの定規エリアのような操作感）。
function setupTimelineIndicatorDrag() {
  const indicator = document.getElementById("timeIndicator");
  const ruler = document.getElementById("timelineTicks");
  let isDragging = false;

  const updateDisplayTime = (event) => {
    if (!isDragging) return;
    const chart = document.querySelector(".timeline-chart");
    state.displayTime = timeFromPointerX(chart, event.clientX);
    render();
  };

  [indicator, ruler].forEach((trigger) => {
    trigger.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      isDragging = true;
      if (trigger.setPointerCapture) {
        try { trigger.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
      }
      indicator.classList.add("is-dragging");
      updateDisplayTime(event);
    });
    trigger.addEventListener("pointermove", updateDisplayTime);
    trigger.addEventListener("pointerup", (event) => {
      isDragging = false;
      if (trigger.releasePointerCapture) {
        try { trigger.releasePointerCapture(event.pointerId); } catch { /* capture already released */ }
      }
      indicator.classList.remove("is-dragging");
    });
    trigger.addEventListener("pointercancel", () => {
      isDragging = false;
      indicator.classList.remove("is-dragging");
    });
  });
}

// タイムラインの空白部分をつかんでドラッグすると、表示領域を左右にパンできるようにします
// （AE/Prのハンドツールのような操作感）。タッチ/ペンはOS標準のスワイプスクロールに任せ、
// マウス操作のときだけ有効にします。
function setupTimelinePan() {
  const scrollEl = document.querySelector(".timeline-scroll");
  const isInteractiveTarget = (target) => target.closest(".timeline-action, #timelineTicks, #timeIndicator");
  let pointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  let panning = false;

  scrollEl.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || isInteractiveTarget(event.target)) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = scrollEl.scrollLeft;
    panning = false;
    if (scrollEl.setPointerCapture) {
      try { scrollEl.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    }
  });

  scrollEl.addEventListener("pointermove", (event) => {
    if (pointerId === null) return;
    const deltaX = event.clientX - startX;
    if (!panning) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
      panning = true;
      scrollEl.classList.add("is-panning");
    }
    scrollEl.scrollLeft = startScrollLeft - deltaX;
  });

  const endPan = () => {
    if (pointerId === null) return;
    if (scrollEl.releasePointerCapture) {
      try { scrollEl.releasePointerCapture(pointerId); } catch { /* capture already released */ }
    }
    pointerId = null;
    panning = false;
    scrollEl.classList.remove("is-panning");
  };
  scrollEl.addEventListener("pointerup", endPan);
  scrollEl.addEventListener("pointercancel", endPan);
}

function formatRemaining(readyAt) {
  return Math.max(0, roundTime(readyAt - state.elapsedTime));
}

function renderStatus() {
  const displayTime = state.displayTime ?? state.elapsedTime;
  const displayState = state.displayTime === null ? state : getSnapshotAt(displayTime);
  document.getElementById("elapsedTime").textContent = `${displayTime.toFixed(2)}s`;
  document.getElementById("totalPotency").textContent = displayState.totalPotency.toLocaleString("ja-JP");
  document.getElementById("actionMessage").textContent = state.message;
  document.getElementById("soulGaugeValue").textContent = `${displayState.soulGauge} / 100`;
  document.getElementById("soulGaugeFill").style.width = `${displayState.soulGauge}%`;
  document.getElementById("shroudGaugeValue").textContent = `${displayState.shroudGauge} / 100`;
  document.getElementById("shroudGaugeFill").style.width = `${displayState.shroudGauge}%`;
  renderShroudStacks(displayState.lemureStacks, displayState.voidStacks);

  const activeBuffs = Object.values(displayState.buffs).filter((buff) => buff.expiresAt > displayTime);
  if (displayState.enshroudedUntil > displayTime && displayState.lemureStacks > 0) {
    activeBuffs.push({ name: "レムール", expiresAt: displayState.enshroudedUntil });
  }
  if (displayState.soulReaverStacks) {
    activeBuffs.push({ name: `妖異の鎌 ×${displayState.soulReaverStacks}`, expiresAt: displayState.soulReaverExpiresAt });
  }
  if (displayState.executionerStacks) {
    activeBuffs.push({ name: `処刑人 ×${displayState.executionerStacks}`, expiresAt: displayState.executionerExpiresAt });
  }
  if (displayState.sacrificiumReady) {
    activeBuffs.push({ name: "サクリフィキウム実行可", expiresAt: displayState.enshroudedUntil });
  }
  if (displayState.immortalSacrificeStacks) {
    activeBuffs.push({ name: `死の供物 ×${displayState.immortalSacrificeStacks}`, expiresAt: Number.MAX_SAFE_INTEGER });
  }
  renderStatusList(document.getElementById("buffList"), activeBuffs, displayTime);

  const activeDebuffs = Object.values(displayState.debuffs).filter((debuff) => debuff.expiresAt > displayTime);
  renderStatusList(document.getElementById("debuffList"), activeDebuffs, displayTime);
  document.getElementById("undoButton").disabled = state.history.length === 0;
  document.getElementById("returnLatestButton").hidden = state.displayTime === null;
}

function renderStatusList(container, statuses, displayTime) {
  container.innerHTML = "";
  if (statuses.length === 0) {
    const empty = document.createElement("div");
    empty.className = "status-row";
    empty.innerHTML = "<span>なし</span><strong>--</strong>";
    container.appendChild(empty);
  } else {
    statuses.forEach((status) => {
      const row = document.createElement("div");
      row.className = "status-row is-active";
      const remaining = status.expiresAt === Number.MAX_SAFE_INTEGER
        ? "--"
        : `${Math.max(0, status.expiresAt - displayTime).toFixed(1)}s`;
      row.innerHTML = `<span>${status.name}</span><strong>${remaining}</strong>`;
      container.appendChild(row);
    });
  }
}

// レムール(残り)とヴォイド(消費済み)は常に合計5になる(ヴォイドリーパー/クロスリーパーが
// レムールを1消費するたびヴォイドを1獲得するため)ので、1本のバーへ統合して表示します。
// 左側から消費済み(ヴォイド)ぶんを塗り、続けて残り(レムール)ぶんを別色で塗ります。
function renderShroudStacks(lemureStacks, voidStacks) {
  const container = document.getElementById("shroudStacks");
  container.setAttribute("aria-label", `シュラウドスタック 残り${lemureStacks} / 消費済み${voidStacks}`);
  container.querySelectorAll("i").forEach((dot, index) => {
    dot.classList.toggle("is-void", index < voidStacks);
    dot.classList.toggle("is-active", index >= voidStacks && index < voidStacks + lemureStacks);
  });
}

function renderSkillAvailability() {
  const displayTime = state.displayTime ?? state.elapsedTime;
  const displayState = state.displayTime === null ? null : getSnapshotAt(displayTime);
  const liveState = displayState ? createStateSnapshot() : null;
  if (displayState) Object.assign(state, displayState);
  document.querySelectorAll(".skill-button").forEach((button) => {
    const baseSkill = skills[button.dataset.skillId];
    const slot = slotsByBase.get(baseSkill.id);
    const skill = slot ? getActiveSlotSkill(slot) : baseSkill;
    const reason = getUnavailableReason(skill);
    const resourceReason = getResourceUnavailableReason(skill);
    const cooldownRemaining = getCooldownRemaining(skill);
    const isPersonallyCooling = cooldownRemaining > 0;
    const charges = getAvailableCharges(skill);
    button.querySelector(".skill-name-fallback").textContent = skill.shortName || skill.name;
    // チャージ制は1つ以上使用可能でも、次チャージが貯まるまでの残り時間を表示します。
    const badgeRemaining = skill.maxCharges ? getNextChargeRemaining(skill) : cooldownRemaining;
    button.querySelector(".recast-time").textContent = badgeRemaining > 0 ? `${badgeRemaining.toFixed(1)}s` : "";
    // アイコン画像は assets/icons/<スキルID>.png を探し、無ければ名前表示のままにします。
    const iconEl = button.querySelector(".skill-icon");
    const iconUrl = `assets/icons/${skill.id}.png`;
    if (iconEl.getAttribute("src") !== iconUrl) {
      iconEl.src = iconUrl;
    }
    // チャージ制スキルだけ、アイコン右下のバッジへ現在の残数を表示します。
    button.querySelector(".charge-badge").textContent = charges === null ? "" : `${charges}`;
    button.disabled = false;
    // 詳細な理由はホバー時の skill-tooltip に表示するため、ネイティブ title は付けません（二重表示防止）。
    // 共通GCDと硬直は入力時に自動で待つため、全ボタンを暗くしません。
    // 個別リキャスト、チャージ切れ、ゲージ不足だけを実行不可の見た目にします。
    button.classList.toggle("is-cooling", isPersonallyCooling || Boolean(resourceReason));
    const isComboAction = isComboSuccess(skill);
    const isEnhancedReaping = skill.enhancedBy && skill.enhancedBy === state.reapingCombo;
    const isReadyJobAction = Boolean(skill.requirements) && !resourceReason;
    button.classList.toggle("is-combo", isComboAction || isEnhancedReaping || isReadyJobAction);
    // 置き換わり後のアクションを表示中であることが分かるよう、専用の見た目を付けます。
    button.classList.toggle("is-replaced", skill.id !== baseSkill.id);
    button.classList.toggle("is-previewing", state.displayTime !== null);
  });
  if (liveState) Object.assign(state, liveState);
}

function formatTimingDetail(skill) {
  const parts = [];
  if (skill.castTime) parts.push(`詠唱${skill.castTime}s`);
  if (skill.castTimeEnhancedBy) parts.push(`${buffNames[skill.castTimeEnhancedBy] || "強化"}中は詠唱なし`);
  if (skill.gcd) parts.push(`GCD ${getEffectiveGcdRecast(skill).toFixed(2)}s`);
  if (skill.recast) {
    parts.push(skill.maxCharges ? `リキャスト${skill.recast}s（チャージ${skill.maxCharges}）` : `リキャスト${skill.recast}s`);
  }
  return parts.join(" / ");
}

function formatPotencyDetail(skill) {
  const parts = [];
  if (skill.potency) parts.push(`威力${skill.potency}`);
  if (skill.comboPotency) parts.push(`コンボ時${skill.comboPotency}`);
  if (skill.enhancedPotency) parts.push(`強化時${skill.enhancedPotency}`);
  if (skill.buffEnhancedPotency) parts.push(`${buffNames[skill.buffEnhancedBy] || "強化"}時${skill.buffEnhancedPotency}`);
  if (skill.dynamicPotency === "immortalSacrifice") parts.push("死の供物のスタック数に応じて変動");
  return parts.join(" / ") || "威力なし";
}

function formatGaugeDetail(skill) {
  const parts = [];
  if (skill.gaugeCost?.soul) parts.push(`ソウル -${skill.gaugeCost.soul}`);
  if (skill.gaugeCost?.shroud) parts.push(`シュラウド -${skill.gaugeCost.shroud}`);
  if (skill.gaugeGain?.soul) parts.push(`ソウル +${skill.gaugeGain.soul}${skill.gaugeGainOnCombo ? "（コンボ時）" : ""}`);
  if (skill.gaugeGain?.shroud) parts.push(`シュラウド +${skill.gaugeGain.shroud}`);
  return parts.join(" / ");
}

function formatRequirementDetail(skill) {
  const requirements = skill.requirements || {};
  const lines = [];
  if (requirements.soulReaver) lines.push(`妖異の鎌${requirements.soulReaver}以上が必要`);
  if (requirements.executioner) lines.push(`処刑人${requirements.executioner}以上が必要`);
  if (requirements.lemure) lines.push(`レムールスタック${requirements.lemure}以上が必要`);
  if (requirements.void) lines.push(`ヴォイドスタック${requirements.void}以上が必要`);
  if (requirements.immortalSacrifice) lines.push(`死の供物${requirements.immortalSacrifice}以上が必要`);
  if (requirements.enshrouded) lines.push("レムール中のみ使用可");
  if (requirements.notEnshrouded) lines.push("レムール外のみ使用可");
  if (requirements.buff) lines.push(`${buffNames[requirements.buff] || requirements.buff}の間のみ使用可`);
  if (requirements.buffAbsent) lines.push(`${buffNames[requirements.buffAbsent] || requirements.buffAbsent}の間は使用不可`);
  if (requirements.sacrificium) lines.push("サクリフィキウム実行可の間のみ使用可");
  return lines;
}

function formatEffectDetail(skill) {
  return (skill.effects || []).map((effect) => `付与: ${effect.name} ${effect.duration}s${effect.maxDuration ? `（最大${effect.maxDuration}s）` : ""}`);
}

function buildSkillTooltipHtml(skill, statusLine) {
  const gaugeLine = formatGaugeDetail(skill);
  const timingLine = formatTimingDetail(skill);
  const lines = [
    `<div class="skill-tooltip-title">${skill.name}</div>`,
    `<div class="skill-tooltip-status ${statusLine === "使用可能" ? "is-ready" : "is-blocked"}">${statusLine}</div>`
  ];
  if (timingLine) lines.push(`<div class="skill-tooltip-line">${timingLine}</div>`);
  lines.push(`<div class="skill-tooltip-line">${formatPotencyDetail(skill)}</div>`);
  if (gaugeLine) lines.push(`<div class="skill-tooltip-line">${gaugeLine}</div>`);
  formatRequirementDetail(skill).forEach((line) => lines.push(`<div class="skill-tooltip-line skill-tooltip-requirement">${line}</div>`));
  formatEffectDetail(skill).forEach((line) => lines.push(`<div class="skill-tooltip-line skill-tooltip-effect">${line}</div>`));
  return lines.join("");
}

// ホバー時のツールチップでは、共通GCD/硬直(押せば自動で待たれるだけの短い遅延)の残り時間は
// ノイズになるため表示しません。実際に足止めされる個別リキャストとゲージ/条件不足だけを表示します
// (見た目上アイコンを暗くする条件 = renderSkillAvailabilityのis-cooling判定と揃えています)。
function getTooltipStatusReason(skill) {
  const cooldownRemaining = getCooldownRemaining(skill);
  if (cooldownRemaining > 0) {
    return `リキャスト中（あと${cooldownRemaining.toFixed(2)}秒）`;
  }
  return getResourceUnavailableReason(skill);
}

function showSkillTooltip(button) {
  const baseSkill = skills[button.dataset.skillId];
  const slot = slotsByBase.get(baseSkill.id);
  const skill = slot ? getActiveSlotSkill(slot) : baseSkill;
  const statusLine = getTooltipStatusReason(skill) || "使用可能";

  const tooltip = document.getElementById("skillTooltip");
  tooltip.innerHTML = buildSkillTooltipHtml(skill, statusLine);
  tooltip.hidden = false;

  const buttonRect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const showAbove = buttonRect.top > tooltipRect.height + 16;
  tooltip.style.left = `${Math.max(4, Math.min(buttonRect.left, window.innerWidth - tooltipRect.width - 8))}px`;
  tooltip.style.top = showAbove
    ? `${buttonRect.top - tooltipRect.height - 8}px`
    : `${buttonRect.bottom + 8}px`;
}

function hideSkillTooltip() {
  document.getElementById("skillTooltip").hidden = true;
}

// 配置済みのタイムラインアクションを、ドラッグで別の時刻へ移動できるようにします。
// 削除はタイル本体のクリックではなく、ホバー時に現れる×ボタンから行います。
function setupTimelineActionMoveDrag(item, entry) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let grabOffsetPx = 0;
  let dragging = false;
  let trackEl = null;
  let lastTargetTime = entry.usedAt;

  const onPointerMove = (event) => {
    if (pointerId === null) return;
    if (!dragging) {
      const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
      if (moved < DRAG_THRESHOLD_PX) return;
      dragging = true;
      item.classList.add("is-dragging");
    }
    const trackRect = trackEl.getBoundingClientRect();
    const maxLeft = Math.max(0, trackRect.width - item.offsetWidth);
    const leftPx = Math.max(0, Math.min(maxLeft, event.clientX - trackRect.left - grabOffsetPx));
    item.style.left = `${leftPx}px`;
    lastTargetTime = timeFromPointerX(trackEl, trackRect.left + leftPx);
    const indicatorLeftPx = Math.max(0, Math.min(trackRect.width, ((lastTargetTime - getTimelineContentStart()) / getTimelineContentDuration()) * trackRect.width));
    updateTimelineDropIndicator(trackEl, indicatorLeftPx);
    shiftTimelineSiblingsForGap(trackEl, lastTargetTime, item.offsetWidth, item);
  };

  const finishDrag = (shouldCommit) => {
    if (pointerId === null) return;
    if (item.releasePointerCapture) {
      try { item.releasePointerCapture(pointerId); } catch { /* capture already released */ }
    }
    pointerId = null;
    hideTimelineDropIndicator();
    item.classList.remove("is-dragging");
    if (dragging) {
      if (shouldCommit) {
        const droppedNames = moveTimelineAction(entry, lastTargetTime);
        if (droppedNames.length) {
          state.message = `編集の影響で実行できなくなり削除されました: ${droppedNames.join("、")}`;
          render();
        }
      } else {
        // 中断(pointercancel)時は元の位置へ戻すため、再描画だけ行います。
        render();
      }
    }
    dragging = false;
  };

  item.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    trackEl = item.parentElement;
    grabOffsetPx = event.clientX - item.getBoundingClientRect().left;
    dragging = false;
    if (item.setPointerCapture) {
      try { item.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    }
  });
  item.addEventListener("pointermove", onPointerMove);
  item.addEventListener("pointerup", () => finishDrag(true));
  item.addEventListener("pointercancel", () => finishDrag(false));

  // つまんで動かそうとした際の誤クリック削除を防ぐため、削除操作はホバー時に現れる
  // 右上の×ボタンからのみ行います(タイル本体のクリックでは削除しません)。
  const deleteButton = document.createElement("span");
  deleteButton.className = "timeline-action-delete";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("role", "button");
  deleteButton.setAttribute("aria-label", "削除");
  deleteButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteActionAt(state.history.indexOf(entry));
  });
  item.appendChild(deleteButton);
}

function renderTimelineTicks() {
  const ticks = document.getElementById("timelineTicks");
  const contentStart = getTimelineContentStart();
  const contentEnd = getTimelineContentEnd();
  const contentDuration = getTimelineContentDuration();
  ticks.innerHTML = "";
  const firstTick = Math.ceil(contentStart / 5) * 5;
  for (let seconds = firstTick; seconds <= contentEnd; seconds += 5) {
    const tick = document.createElement("span");
    tick.className = "timeline-tick";
    tick.style.left = `${((seconds - contentStart) / contentDuration) * 100}%`;
    tick.textContent = `${seconds}s`;
    ticks.appendChild(tick);
  }
}

// 効果(バフ/デバフ)の帯を、時間的に重ならない範囲でできるだけ同じレーンへ詰め込みます
// (種別ごとに専用の行を用意するのではなく、実際に同時発生する最大数ぶんだけレーンを作るため)。
// 戻り値: 各effectが使うレーン番号を保持するMapと、必要な総レーン数。
function assignEffectLanes(effects) {
  const sorted = [...effects].sort((a, b) => a.appliedAt - b.appliedAt);
  const laneEnds = [];
  const lanes = new Map();
  sorted.forEach((effect) => {
    let laneIndex = laneEnds.findIndex((endAt) => endAt <= effect.appliedAt);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(effect.expiresAt);
    } else {
      laneEnds[laneIndex] = effect.expiresAt;
    }
    lanes.set(effect, laneIndex);
  });
  return { lanes, laneCount: laneEnds.length };
}

// 助走時間が設定されているときだけ、戦闘開始(0秒)の位置に目印を表示します。
function renderCombatStartMarker(contentStart, contentDuration, trackWidth) {
  const marker = document.getElementById("combatStartMarker");
  if (!marker) return;
  if (state.leadInDuration <= 0) {
    marker.hidden = true;
    return;
  }
  const ratio = Math.max(0, Math.min((0 - contentStart) / contentDuration, 1));
  marker.style.left = `${ratio * trackWidth}px`;
  marker.hidden = false;
}

function renderTimeline() {
  const contentStart = getTimelineContentStart();
  const contentEnd = getTimelineContentEnd();
  const contentDuration = getTimelineContentDuration();
  const hasNewAction = state.history.length > lastRenderedHistoryLength;
  lastRenderedHistoryLength = state.history.length;
  const timelineChart = document.querySelector(".timeline-chart");
  const trackWidth = TIMELINE_BASE_WIDTH * (contentDuration / TIMELINE_DURATION);
  timelineChart.style.width = `${trackWidth + TIMELINE_RIGHT_MARGIN}px`;
  renderTimelineTicks();
  const gcdTimeline = document.getElementById("gcdTimeline");
  const abilityTimeline = document.getElementById("abilityTimeline");
  gcdTimeline.innerHTML = "";
  abilityTimeline.innerHTML = "";
  const effectTimeline = document.getElementById("effectTimeline");
  effectTimeline.innerHTML = "";

  state.history.forEach((entry) => {
    if (entry.kind === "wait") {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "timeline-action is-wait";
      item.style.left = `${((entry.usedAt - contentStart) / contentDuration) * 100}%`;
      item.style.width = `${(entry.duration / contentDuration) * 100}%`;
      item.dataset.castStartAt = entry.usedAt;
      item.textContent = `待機 ${entry.duration.toFixed(1)}s`;
      item.title = `${entry.usedAt.toFixed(2)}s → ${entry.endAt.toFixed(2)}s（待機${entry.duration.toFixed(1)}秒） / ドラッグで移動・ホバーの×で削除`;
      setupTimelineActionMoveDrag(item, entry);
      gcdTimeline.appendChild(item);
      return;
    }
    const item = document.createElement("button");
    item.type = "button";
    item.className = "timeline-action";
    // アイコンの左端は詠唱開始(castStartAt)を表します。詠唱時間が無いスキルは着弾時刻と同じです。
    item.style.left = `${((entry.castStartAt - contentStart) / contentDuration) * 100}%`;
    item.dataset.castStartAt = entry.castStartAt;
    const shortName = skills[entry.skillId]?.shortName || entry.skillName;
    // スキル操作欄のボタンと同じ規約(assets/icons/<スキルID>.png)でアイコンを表示し、
    // 画像が無い/読み込めない場合はテキスト名へ自動フォールバックします。
    item.innerHTML = `<img class="skill-icon" src="assets/icons/${entry.skillId}.png" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='';" onload="this.style.display=''; this.nextElementSibling.style.display='none';"><span class="skill-name-fallback">${shortName}</span>`;
    const castLabel = entry.castStartAt !== entry.usedAt
      ? `詠唱開始${entry.castStartAt.toFixed(2)}s → 着弾${entry.usedAt.toFixed(2)}s`
      : `${entry.usedAt.toFixed(2)}s`;
    item.title = `${castLabel} / 威力 ${entry.potency}${entry.clipping ? ` / 食い込み ${entry.clipping.toFixed(2)}s` : ""} / ドラッグで移動・ホバーの×で削除`;
    item.classList.toggle("has-clipping", entry.clipping > 0);
    setupTimelineActionMoveDrag(item, entry);
    (entry.type === "ability" ? abilityTimeline : gcdTimeline).appendChild(item);
  });

  const timelineEffects = state.effectHistory.filter((effect) => (
    effect.showOnTimeline && effect.appliedAt < contentEnd
  ));
  effectTimeline.classList.toggle("has-effects", timelineEffects.length > 0);
  // 種別(バフ/デバフ)ごとに専用の行を固定で用意するのではなく、実際に同時に発生している
  // 最大数ぶんだけレーンを動的に作ります。行の高さもレーン数に応じて伸縮させます。
  const EFFECT_LANE_HEIGHT = 20;
  const EFFECT_ROW_MIN_HEIGHT = 76;
  const { lanes, laneCount } = assignEffectLanes(timelineEffects);
  const effectRowHeight = Math.max(EFFECT_ROW_MIN_HEIGHT, laneCount * EFFECT_LANE_HEIGHT + 16);
  document.querySelector(".timeline-row-effect").style.height = `${effectRowHeight}px`;
  document.querySelector(".timeline-row-label-effect").style.height = `${effectRowHeight}px`;
  timelineEffects.forEach((effect) => {
    const band = document.createElement("span");
    const start = (effect.appliedAt - contentStart) / contentDuration;
    const end = (Math.min(effect.expiresAt, contentEnd) - contentStart) / contentDuration;
    band.className = `timeline-effect timeline-effect-${effect.type}`;
    band.style.left = `${start * 100}%`;
    band.style.width = `${Math.max(0, end - start) * 100}%`;
    band.style.top = `${8 + lanes.get(effect) * EFFECT_LANE_HEIGHT}px`;
    band.textContent = `${effect.name}${effect.potency ? ` ${effect.potency}` : ""}`;
    band.title = `${effect.name}内：${effect.actionCount || 0}アクション / 威力${effect.potency || 0}`;
    effectTimeline.appendChild(band);
  });

  const indicator = document.getElementById("timeIndicator");
  const indicatorTime = state.displayTime ?? state.elapsedTime;
  const indicatorRatio = Math.max(0, Math.min((indicatorTime - contentStart) / contentDuration, 1));
  // ％ではなくpxで置くことで、トラック側の右余白(TIMELINE_RIGHT_MARGIN)とズレないようにします。
  indicator.style.left = `${indicatorRatio * trackWidth}px`;
  indicator.querySelector("span").textContent = `${indicatorTime.toFixed(2)}s`;
  indicator.classList.toggle("is-previewing", state.displayTime !== null);

  renderCombatStartMarker(contentStart, contentDuration, trackWidth);

  // contentDuration(区間の合計秒数)は助走区間ぶんも含むため、この判定には使えません。
  // 実際にアクションでタイムラインが伸びたかどうかは contentEnd だけで判断します。
  if (hasNewAction && contentEnd > TIMELINE_DURATION) {
    const timelineScroll = document.querySelector(".timeline-scroll");
    requestAnimationFrame(() => {
      timelineScroll.scrollLeft = timelineScroll.scrollWidth - timelineScroll.clientWidth;
    });
  }
}

function render() {
  renderStatus();
  renderSkillAvailability();
  renderTimeline();
}

document.addEventListener("DOMContentLoaded", () => {
  renderSkillButtons();
  setupControls();
  render();
});
