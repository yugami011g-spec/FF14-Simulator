// legacy/js の実装をNode vmで読み込み、指定の回しを実行して最終状態を出力する。
// M3移植の数値検証用の使い捨てスクリプト(本番コードには含めない)。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const legacyDir = path.join(__dirname, "..", "legacy", "js");
const sandbox = {};
vm.createContext(sandbox);

for (const file of ["skills.js", "state.js", "engine.js"]) {
  const code = fs.readFileSync(path.join(legacyDir, file), "utf8");
  vm.runInContext(code, sandbox, { filename: file });
}
// render()はui.js側なので未定義。engine.jsのuseSkill等がrender()を呼ぶためスタブを注入する。
sandbox.render = () => {};
vm.runInContext("function render(){}", sandbox);

const rotation = JSON.parse(process.argv[2]);
const results = [];
for (const skillId of rotation) {
  const ok = vm.runInContext(`useSkill(${JSON.stringify(skillId)}, { silent: true })`, sandbox);
  results.push({ skillId, ok });
}

const state = vm.runInContext("state", sandbox);
console.log(
  JSON.stringify(
    {
      totalPotency: state.totalPotency,
      soulGauge: state.soulGauge,
      shroudGauge: state.shroudGauge,
      soulReaverStacks: state.soulReaverStacks,
      executionerStacks: state.executionerStacks,
      lemureStacks: state.lemureStacks,
      voidStacks: state.voidStacks,
      enshroudedUntil: state.enshroudedUntil,
      reapingCombo: state.reapingCombo,
      comboStep: state.comboStep,
      historyCount: state.history.length,
      results,
    },
    null,
    2,
  ),
);
