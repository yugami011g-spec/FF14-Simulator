import { skills } from "./skills";

// スキルの宣言的なeffects配列を持たず、reaperJobEffects.ts側でcreateTimedBuff/
// applyPersistentBuffにより動的に付与されるバフの表示名。effects配列からは拾えないため、
// ここに追記しないとツールチップ等で英語の内部IDがそのまま表示されてしまう。
const jobEffectBuffNames: Record<string, string> = {
  enshroudReady: "レムールシュラウド実行可",
  perfectioPending: "ペルフェクティオ待機",
  perfectioReady: "ペルフェクティオ実行可",
  soulSow: "ソウルソウ",
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
