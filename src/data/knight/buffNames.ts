import { skills } from "./skills";

// jobEffects側(applyJobEffectsのgrantOnComboSuccess)から動的に付与され、スキルの宣言的な
// effects配列には現れないバフの表示名。ここに追記しないとツールチップ等で内部IDのまま
// 表示されてしまう。
const jobEffectBuffNames: Record<string, string> = {
  atonementReady: "ロイエ実行可",
  holyPower: "神聖魔法効果アップ",
  // レクイエスカットは表示名にスタック数を埋め込むため動的だが、基本名はこちらに登録しておく。
  requiescat: "レクイエスカット",
};

// バフ／デバフIDから表示名を引くための一覧です（ツールチップの条件表示に使います）。
export const buffNames: Record<string, string> = {
  ...Object.values(skills).reduce<Record<string, string>>((names, skill) => {
    (skill.effects || []).forEach((effect) => {
      names[effect.id] = effect.name;
    });
    return names;
  }, {}),
  ...jobEffectBuffNames,
};
