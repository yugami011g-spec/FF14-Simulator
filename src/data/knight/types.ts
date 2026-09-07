// ナイト固有の jobEffects 宣言的バッグ(reaperのReaperJobEffectsと同じ設計方針)。
export interface KnightJobEffects {
  // comboSuccess(通常コンボ成立)時のみ付与するバフID一覧(ロイヤルアソリティ/プロミネンスの
  // コンボボーナス用)。
  grantOnComboSuccess?: string[];
  // 常に(コンボ成立可否に関わらず)付与するバフID一覧。
  grantBuffs?: string[];
  // このスキル使用時に消費(除去)するバフID一覧。アトーンメントコンボ(ロイエ→ゲベート→
  // グラブカッマー)は各段階が独立した「実行可」バフのため、次の段階へ進んだら前段階の
  // バフを消しておかないと、同じ枠を連打したときに枠替え判定が古いバフを拾って足踏みする
  // (例: ゲベート使用後もsupplicationReadyが残っていると、次のクリックでもゲベートの
  // 枠替え条件が真のままになり、グラブカッマーへ進めない)。
  consumeBuffs?: string[];
}
