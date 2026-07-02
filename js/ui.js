// スキルボタンを作成して、画面に配置します。
function renderSkillButtons() {
  const skillButtons = document.getElementById("skillButtons");

  // 再描画してもボタンが重複しないように、一度中身を空にします。
  skillButtons.innerHTML = "";

  // skills オブジェクトに登録されているスキルを順番にボタン化します。
  Object.values(skills).forEach((skill) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill-button";
    button.textContent = `${skill.name} / 威力 ${skill.potency}`;

    // ボタンを押したら、スキルIDを渡して useSkill を呼びます。
    button.addEventListener("click", () => {
      useSkill(skill.id);
    });

    skillButtons.appendChild(button);
  });
}

// 合計威力と現在のコンボstepを画面へ反映します。
function renderStatus() {
  document.getElementById("totalPotency").textContent = state.totalPotency;
  document.getElementById("comboStep").textContent = state.comboStep;
}

// state.history の内容を履歴ログとして画面へ表示します。
function renderHistory() {
  const historyLog = document.getElementById("historyLog");

  // 履歴が増えるたびに、最新の state.history から作り直します。
  historyLog.innerHTML = "";

  state.history.forEach((entry, index) => {
    const item = document.createElement("li");
    item.textContent =
      `${index + 1}. ${entry.skillName} / ` +
      `威力 ${entry.potency} / ` +
      `合計 ${entry.totalPotency} / ` +
      `comboStep ${entry.comboStep}`;

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
  render();
});
