import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { jobRegistry, DEFAULT_JOB_ID } from "./data/jobRegistry";
import { useSimulator } from "./hooks/useSimulator";
import { useTooltipController } from "./hooks/useTooltipController";
import { useDragGhost } from "./hooks/useDragGhost";
import { getActiveSkillByBaseId } from "./engine/gating";
import { buildSkillTooltipData } from "./engine/tooltipText";
import { historyToCsv, csvToEntries } from "./hooks/csv";
import { exportTimelineImage } from "./hooks/exportImage";
import { Header } from "./components/Header";
import { TimelinePanel } from "./components/TimelinePanel";
import { GaugePanel } from "./components/GaugePanel";
import { SkillPanel } from "./components/SkillPanel";
import { StatusPanel } from "./components/StatusPanel";
import { SkillTooltip } from "./components/SkillTooltip";
import { DragGhost } from "./components/DragGhost";

function App() {
  const [activeJobId, setActiveJobId] = useState(DEFAULT_JOB_ID);
  const job = jobRegistry.find((candidate) => candidate.id === activeJobId) ?? jobRegistry[0];
  // job.id が変わった直後の1レンダーだけ entries が旧ジョブのものになりうるが、replay() は
  // 未知のskillIdを黙ってドロップするだけで例外にはならず、直後に useSimulator 内のeffectが
  // 新ジョブの永続化状態へ入れ替えるため実害はない(詳細: hooks/useSimulator.ts)。
  const sim = useSimulator(job);
  const tooltip = useTooltipController();
  const dragGhost = useDragGhost();

  const chartRef = useRef<HTMLDivElement>(null);
  const gcdTrackRef = useRef<HTMLDivElement>(null);
  const abilityTrackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  function handleExportCsv() {
    const csv = historyToCsv(sim.history);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ff14-skill-rotation-${job.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    csvFileInputRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const { entries, skippedRows } = csvToEntries(text, job);
    sim.dispatch.loadEntries(entries, skippedRows);
  }

  async function handleExportImage() {
    if (!chartRef.current) return;
    await exportTimelineImage(chartRef.current, `ff14-timeline-${job.id}`);
  }

  // ホバー中のアクション枠(base skill id)から、毎レンダー最新状態でツールチップ内容を組み立て
  // 直す。枠替え(コムニオ→ペルフェクティオ等)後もホバーを外し入れし直さず追従させるため、
  // 計算済みの内容をstateとして持ち越さない(useTooltipControllerはどの枠を見ているかだけを保持)。
  const tooltipRequest = tooltip.hover
    ? {
        anchorRect: tooltip.hover.anchorEl.getBoundingClientRect(),
        data: buildSkillTooltipData(
          getActiveSkillByBaseId(job, tooltip.hover.baseSkillId, sim.displaySnapshot, sim.displayTime),
          sim.settings,
        ),
      }
    : null;

  return (
    <main className="app">
      <Header
        jobs={jobRegistry}
        activeJobId={job.id}
        onSelectJob={setActiveJobId}
        onSave={handleExportCsv}
        onLoad={handleImportClick}
        onExportImage={handleExportImage}
        onReset={sim.dispatch.reset}
      />
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />
      <TimelinePanel
        settings={sim.settings}
        history={sim.history}
        effectHistory={sim.effectHistory}
        skills={job.skills}
        displayTime={sim.displayTime}
        totalPotency={sim.displaySnapshot.totalPotency}
        isPreviewing={sim.isPreviewing}
        chartRef={chartRef}
        gcdTrackRef={gcdTrackRef}
        abilityTrackRef={abilityTrackRef}
        scrollRef={scrollRef}
        onReturnToLatest={() => sim.dispatch.setDisplayTime(null)}
        onLeadInChange={sim.dispatch.updateLeadInDuration}
        onCombatDurationChange={sim.dispatch.updateCombatDuration}
        onSetDisplayTime={sim.dispatch.setDisplayTime}
        onDeleteEntry={sim.dispatch.deleteAt}
      />
      <div className="dashboard-grid">
        <GaugePanel job={job} snapshot={sim.displaySnapshot} />
        <SkillPanel
          job={job}
          snapshot={sim.displaySnapshot}
          elapsedTime={sim.displayTime}
          settings={sim.settings}
          history={sim.history}
          isPreviewing={sim.isPreviewing}
          canUndo={sim.history.length > 0}
          message={sim.message}
          onUseSkill={sim.dispatch.useSkill}
          onWait={sim.dispatch.wait}
          onUndo={sim.dispatch.undo}
          onGcdSettingChange={sim.dispatch.updateGcdSetting}
          onShowTooltip={tooltip.show}
          onHideTooltip={tooltip.hide}
          onInsertSkill={sim.dispatch.insertSkillAt}
          chartRef={chartRef}
          gcdTrackRef={gcdTrackRef}
          abilityTrackRef={abilityTrackRef}
          showGhost={dragGhost.showGhost}
          moveGhost={dragGhost.moveGhost}
          hideGhost={dragGhost.hideGhost}
        />
        <StatusPanel job={job} snapshot={sim.displaySnapshot} displayTime={sim.displayTime} />
      </div>
      <SkillTooltip request={tooltipRequest} />
      <DragGhost ghost={dragGhost.ghost} />
    </main>
  );
}

export default App;
