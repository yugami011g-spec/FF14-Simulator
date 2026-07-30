// スキルボタンを作成して、画面に配置します。
function renderSkillButtons() {
  const skillButtons = document.getElementById("skillButtons");

  // 再描画してもボタンが重複しないように、一度中身を空にします。
  skillButtons.innerHTML = "";

  // skills に登録されているスキルを順番にボタン化します。
  Object.values(skills).forEach((skill) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill-button";
    button.textContent = `${skill.name} / 通常威力 ${skill.potency}`;

    // ボタンを押したら、スキルIDを渡して useSkill を呼びます。
    button.addEventListener("click", () => {
      useSkill(skill.id);
    });

    skillButtons.appendChild(button);
  });
}

// リセットボタンを押したときの処理を登録します。
function setupResetButton() {
  const resetButton = document.getElementById("resetButton");

  resetButton.addEventListener("click", () => {
    resetSimulator();
  });
}

// 合計威力と現在のコンボ段階を画面へ反映します。
function renderStatus() {
  document.getElementById("totalPotency").textContent = state.totalPotency;
  document.getElementById("comboStep").textContent = state.comboStep;
}

// state.history の内容を履歴ログとして画面へ表示します。
function renderHistory() {
  const historyLog = document.getElementById("historyLog");

  // 履歴が増えるたびに、最新の state.history から作り直します。
  historyLog.innerHTML = "";

  // まだスキルを使っていないときは、空の状態を表示します。
  if (state.history.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "history-empty";
    emptyItem.textContent = "まだスキルを使用していません。";
    historyLog.appendChild(emptyItem);
    return;
  }

  state.history.forEach((entry, index) => {
    const item = document.createElement("li");
    const count = document.createElement("span");
    const skillName = document.createElement("strong");
    const potency = document.createElement("span");
    const totalPotency = document.createElement("span");
    const comboStep = document.createElement("span");

    count.className = "history-count";
    count.textContent = `${index + 1}手目`;
    skillName.textContent = entry.skillName;
    potency.textContent = `威力: ${entry.potency}`;
    totalPotency.textContent = `合計: ${entry.totalPotency}`;
    comboStep.textContent = `コンボ段階: ${entry.comboStep}`;

    item.append(count, skillName, potency, totalPotency, comboStep);

    historyLog.appendChild(item);
  });
}

// 画面全体を現在の state に合わせて更新します。
function render() {
  renderStatus();
  renderHistory();
}

// HTMLの読み込みが完了してから、初期表示を作ります。
document.addEventListener("DOMContentLoaded", () => {
  renderSkillButtons();
  setupResetButton();
  render();
});
