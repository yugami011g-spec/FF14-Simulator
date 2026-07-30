// シミュレーター全体で共有する現在状態です。
// MVPでは合計威力、コンボ段階、履歴だけを持ちます。
const state = {
  totalPotency: 0,
  comboStep: 0,
  history: []
};
