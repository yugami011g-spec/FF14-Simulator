import type { ReactNode } from "react";
import type { ActionSlot, Skill } from "./skill";
import type { DisplayStatus, JobStateEntry, SimSnapshot, StatusEffect } from "./state";

export interface GaugeDef {
  key: string;
  label: string;
  max: number;
  // ゲージバーの色(CSSカスタムプロパティ参照、例 "var(--red)")。未指定ならデフォルト色を使う。
  color?: string;
}

export interface StackDef {
  key: string;
  label: string;
  maxDots: number;
  // スタックドットの色(CSSカスタムプロパティ参照、例 "var(--cyan)")。未指定ならデフォルト色を使う。
  color?: string;
}

export interface JobDefinition<TJobEffects = Record<string, unknown>> {
  id: string;
  // ジョブ切替UI(タブ)に表示する日本語ジョブ名。
  label: string;
  skills: Record<string, Skill<TJobEffects>>;
  actionSlots: ActionSlot[];
  gaugeDefs: GaugeDef[];
  stackDefs: StackDef[];
  // バフ/デバフIDから表示名を引く一覧(ツールチップの条件表示に使う)。
  buffNames: Record<string, string>;
  initialJobState: Record<string, JobStateEntry>;
  // シミュレーション開始時点ですでに付与されているものとして扱うバフ(例: ソウルソウは常時
  // 得ている前提のため)。未指定なら空({})として扱う。
  initialBuffs?: Record<string, StatusEffect>;
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
  // スキルの「実行可否」とは別に、「今使うと得か(実機の推奨アクション強調表示)」を判定する。
  // ジョブが未実装ならUI側は既存のヒューリスティック(requirements有無)にフォールバックする。
  // resourceReasonは呼び出し側がgetResourceUnavailableReasonで既に計算済みの場合に渡せる
  // (実装側は渡されればisResourceUnavailableの再実行を省略できる。省略時は内部で計算する)。
  isRecommended?: (skill: Skill<TJobEffects>, snapshot: SimSnapshot, elapsedTime: number, resourceReason?: string) => boolean;
  // ジョブゲージパネルの、汎用StackDefドット描画では表現できない専用ビジュアル(例: リーパーの
  // レムール+ヴォイド合成バー)を差し込むフック。未指定ならstackDefsから汎用ドット列を自動生成する。
  renderCustomGaugeExtras?: (snapshot: SimSnapshot) => ReactNode;
  // jobState由来の派生ステータス(スタック数・タイマー等)をStatusPanelのバフ欄に表示する形へ
  // 変換するフック。戻り値はsnapshot.buffsの生データに追加される。未指定なら追加なし。
  getDisplayStatuses?: (snapshot: SimSnapshot, elapsedTime: number) => DisplayStatus[];
}
