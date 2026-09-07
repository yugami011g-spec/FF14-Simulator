import type { ActionSlot } from "../../types/skill";

// 公式ジョブガイドが示す、同一ホットバー枠内でのアクション置き換わりです(リーパーの
// actionSlots.tsと同じ設計)。
export const actionSlots: ActionSlot[] = [
  // ロイエ実行可→ゲベート実行可→グラブカッマー実行可の順にバフで枠が置き換わる
  // (アトーンメントコンボ)。
  {
    base: "atonement",
    variants: [
      { skillId: "supplication", condition: "supplicationReady" },
      { skillId: "sepulchre", condition: "sepulchreReady" },
    ],
  },
  // コンフィテオル以降は、コア側のコンボ機構(comboStep 21〜24)で枠が置き換わる
  // (バフではなく通常コンボと同じ仕組み。バフゲート自体はコンフィテオル本体のみ)。
  {
    base: "confiteor",
    variants: [
      { skillId: "bladeOfFaith", condition: "bladeOfFaith" },
      { skillId: "bladeOfTruth", condition: "bladeOfTruth" },
      { skillId: "bladeOfValor", condition: "bladeOfValor" },
    ],
  },
  // インペラトル使用後、ブレード・オブ・オナー実行可の間だけ枠が置き換わる
  // (インペラトル自体はリキャスト中のため、その枠を一時的に再利用する形)。
  { base: "imperator", variants: [{ skillId: "bladeOfHonor", condition: "bladeOfHonorReady" }] },
];
