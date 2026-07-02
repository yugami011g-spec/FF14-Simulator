// スキルIDをキーにして、スキル情報をまとめて管理します。
// 将来ジョブが増えても、このオブジェクトへスキルを追加していく想定です。
const skills = {
  combo1: {
    id: "combo1",
    name: "コンボ1",
    potency: 200,
    comboStep: 1
  },
  combo2: {
    id: "combo2",
    name: "コンボ2",
    potency: 150,
    comboPotency: 300,
    requiredComboStep: 1,
    comboStep: 2
  },
  combo3: {
    id: "combo3",
    name: "コンボ3",
    potency: 180,
    comboPotency: 420,
    requiredComboStep: 2,
    comboStep: 3
  }
};
