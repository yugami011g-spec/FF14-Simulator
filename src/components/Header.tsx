interface HeaderProps {
  onSave?: () => void;
  onLoad?: () => void;
  onReset?: () => void;
}

export function Header({ onSave, onLoad, onReset }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>リーパー時間軸シミュレーター</h1>
      <div className="header-actions">
        <button className="button button-small" type="button" onClick={onSave}>
          CSV書き出し
        </button>
        <button className="button button-small" type="button" onClick={onLoad}>
          CSV読込
        </button>
        <button className="button button-danger" type="button" onClick={onReset}>
          リセット
        </button>
      </div>
    </header>
  );
}
