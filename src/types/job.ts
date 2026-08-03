import type { ActionSlot, Skill } from "./skill";
import type { JobStateEntry, SimSnapshot } from "./state";

export interface GaugeDef {
  key: string;
  label: string;
  max: number;
}

export interface StackDef {
  key: string;
  label: string;
  maxDots: number;
}

export interface JobDefinition<TJobEffects = Record<string, unknown>> {
  id: string;
  skills: Record<string, Skill<TJobEffects>>;
  actionSlots: ActionSlot[];
  gaugeDefs: GaugeDef[];
  stackDefs: StackDef[];
  // バフ/デバフIDから表示名を引く一覧(ツールチップの条件表示に使う)。
  buffNames: Record<string, string>;
  initialJobState: Record<string, JobStateEntry>;
  matchesSlotCondition: (condition: string, snapshot: SimSnapshot, elapsedTime: number) => boolean;
  // combatDuration超過以外の、ゲージ/スタック/バフ条件等ジョブ固有のゲート判定。理由文字列 or ""。
  isResourceUnavailable: (skill: Skill<TJobEffects>, snapshot: SimSnapshot, elapsedTime: number) => string;
  // ゲージ消費/獲得、スタック増減、シュラウド突入/離脱などジョブ固有の状態遷移を一括適用し、
  // 新しいSimSnapshotを返す(引数のsnapshotは変更しない)。
  applyJobEffects: (
    skill: Skill<TJobEffects>,
    snapshot: SimSnapshot,
    elapsedTime: number,
    comboSuccess: boolean,
    leadInDuration: number,
  ) => SimSnapshot;
  // skill.dynamicPotency のタグ(例: "immortalSacrifice")から実威力を計算する。
  // ジョブ固有の数式(スタック数依存など)をコアのpotency計算から切り離すためのフック。
  resolveDynamicPotency?: (tag: string, snapshot: SimSnapshot, elapsedTime: number) => number;
  // 時限式のジョブ固有スタック/状態(例: 妖異の鎌30秒、レムール30秒)が期限切れなら
  // 0/falseへ戻した新しいsnapshotを返す。ゲート判定・スロット条件判定の前に毎回呼び出す。
  normalizeTimedState?: (snapshot: SimSnapshot, elapsedTime: number) => SimSnapshot;
}
