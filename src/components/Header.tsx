import type { JobDefinition } from "../types/job";

interface HeaderProps {
  jobs: JobDefinition<any>[];
  activeJobId: string;
  onSelectJob?: (jobId: string) => void;
  onSave?: () => void;
  onLoad?: () => void;
  onExportImage?: () => void;
  onReset?: () => void;
}

export function Header({ jobs, activeJobId, onSelectJob, onSave, onLoad, onExportImage, onReset }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-title">
        <h1>スキル回しシミュレーター</h1>
        {jobs.length > 1 && (
          <nav className="job-tabs">
            {jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                className={`job-tab${job.id === activeJobId ? " is-active" : ""}`}
                onClick={() => onSelectJob?.(job.id)}
              >
                {job.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className="header-actions">
        <button className="button button-small" type="button" onClick={onSave}>
          CSV書き出し
        </button>
        <button className="button button-small" type="button" onClick={onLoad}>
          CSV読込
        </button>
        <button className="button button-small" type="button" onClick={onExportImage}>
          画像出力
        </button>
        <button className="button button-danger" type="button" onClick={onReset}>
          リセット
        </button>
      </div>
    </header>
  );
}
