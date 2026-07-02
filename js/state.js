// シミュレーター全体で共有する現在状態です。
// MVPでは「合計威力」「現在のコンボstep」「履歴」だけを持ちます。
const state = {
  totalPotency: 0,
  comboStep: 0,
  history: []
};
