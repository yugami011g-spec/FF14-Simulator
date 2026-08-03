import { skills } from "./skills";

// バフ／デバフIDから表示名を引くための一覧です（ツールチップの条件表示に使います）。
export const buffNames: Record<string, string> = Object.values(skills).reduce<Record<string, string>>((names, skill) => {
  (skill.effects || []).forEach((effect) => {
    names[effect.id] = effect.name;
  });
  return names;
}, {});
