// スキルIDをキーにして、スキル情報を管理します。
// 将来ジョブが増えたら、このデータを拡張します。
const skills = {
  combo1: {
    id: "combo1",
    name: "コンボ1",
    type: "weaponskill",
    potency: 200,
    comboPotency: null,
    requiredComboStep: null,
    comboStep: 1,
    recast: 2.5,
    gcd: true,
    effects: []
  },
  combo2: {
    id: "combo2",
    name: "コンボ2",
    type: "weaponskill",
    potency: 150,
    comboPotency: 300,
    requiredComboStep: 1,
    comboStep: 2,
    recast: 2.5,
    gcd: true,
    effects: []
  },
  combo3: {
    id: "combo3",
    name: "コンボ3",
    type: "weaponskill",
    potency: 180,
    comboPotency: 420,
    requiredComboStep: 2,
    comboStep: 3,
    recast: 2.5,
    gcd: true,
    effects: []
  }
};
