// 指定されたスキルが現在のコンボ状態に合っているかを判定します。
function isComboSuccess(skill) {
  // requiredComboStep がないスキルは、コンボ条件なしで使えるスキルです。
  if (skill.requiredComboStep === undefined) {
    return false;
  }

  return state.comboStep === skill.requiredComboStep;
}

// コンボ成功なら comboPotency、失敗なら potency を返します。
function calculatePotency(skill) {
  if (isComboSuccess(skill)) {
    return skill.comboPotency;
  }

  return skill.potency;
}

// スキル使用後のコンボstepを決めます。
function getNextComboStep(skill) {
  // 1段目はいつ押してもコンボ開始として扱います。
  if (skill.comboStep === 1) {
    return 1;
  }

  // 2段目以降は、コンボ成功時だけ次のstepへ進みます。
  if (isComboSuccess(skill)) {
    return skill.comboStep;
  }

  // コンボ失敗時はコンボ状態をリセットします。
  return 0;
}

// 画面のボタンから呼ばれる、スキル使用処理の入口です。
function useSkill(skillId) {
  // skills オブジェクトから、押されたスキルIDに対応するデータを取得します。
  const skill = skills[skillId];

  // 存在しないスキルIDが渡された場合は、何もせずに処理を終えます。
  if (!skill) {
    return;
  }

  // 現在のコンボ状態をもとに、今回加算する威力を決めます。
  const potency = calculatePotency(skill);

  // 合計威力へ今回の威力を加算します。
  state.totalPotency += potency;

  // スキル使用後のコンボstepへ更新します。
  state.comboStep = getNextComboStep(skill);

  // 後から画面に表示できるように、使用履歴を保存します。
  state.history.push({
    skillName: skill.name,
    potency: potency,
    totalPotency: state.totalPotency,
    comboStep: state.comboStep
  });

  // 状態が変わったので、画面表示を最新の状態に更新します。
  render();
}
