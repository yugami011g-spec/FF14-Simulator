import type { SimSettings } from "../../types/state";

// オウスゲージはオートアタック間隔(装備している武器のディレイ依存)を知らないと蓄積速度を
// 計算できないため、ユーザーが直接調整できる設定値としてゲージパネル内に表示する
// (job.renderCustomGaugeExtrasフック経由でGaugePanelに差し込む)。
export function KnightGaugeExtras({
  settings,
  onSettingsChange,
}: {
  settings: SimSettings;
  onSettingsChange: (patch: Partial<SimSettings>) => void;
}) {
  return (
    <div className="gauge-setting">
      <label>
        攻撃間隔
        <input
          type="number"
          min={1}
          step={0.01}
          defaultValue={settings.autoAttackInterval.toFixed(2)}
          onChange={(event) => {
            const next = Number(event.target.value);
            onSettingsChange({ autoAttackInterval: Number.isFinite(next) && next > 0 ? next : 2.08 });
          }}
        />
        秒
      </label>
      <p className="gauge-setting-hint">
        オートアタックの間隔(秒)。武器のディレイにより変わるため、実際の値に合わせて調整してください。
      </p>
    </div>
  );
}
