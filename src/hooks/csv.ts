import type { HistoryEntry, ReplayEntry } from "../types/history";
import type { JobDefinition } from "../types/job";
import { generateEntryId } from "../engine/editOps";

const CSV_HEADER = ["order", "kind", "skillId", "skillName", "duration", "usedAt", "potency"];

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// 現在のタイムライン(history)をCSVへ書き出す。usedAt/potencyは確認用の付加情報で、
// 再読込時に使うのはkind/skillId/durationのみ(自然な再生タイミングで再構築するため)。
export function historyToCsv(history: HistoryEntry[]): string {
  const rows = [CSV_HEADER];
  history.forEach((entry, index) => {
    if (entry.kind === "wait") {
      rows.push([String(index + 1), "wait", "", "待機", String(entry.duration), String(entry.usedAt), ""]);
    } else {
      rows.push([
        String(index + 1),
        "skill",
        entry.skillId,
        entry.skillName,
        "",
        String(entry.usedAt),
        String(entry.potency),
      ]);
    }
  });
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

export interface CsvImportResult {
  entries: ReplayEntry[];
  skippedRows: number;
}

// CSVをReplayEntry[]へ変換する。現在のジョブに存在しないskillId、不正なdurationの行は
// 黙って除外しskippedRowsで件数を返す(persistence.tsのloadPersistedStateと同じ方針)。
// 生成するエントリは常にusedAt:0/preserveTiming:falseとし、行の並び順どおりに
// 自然な再生タイミング(通常のスキルボタン押下と同じ規約)で再構築する。
export function csvToEntries(csvText: string, job: JobDefinition<any>): CsvImportResult {
  const lines = csvText.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
  if (lines.length === 0) return { entries: [], skippedRows: 0 };

  const [headerLine, ...rows] = lines;
  const columns = parseCsvLine(headerLine).map((c) => c.trim().toLowerCase());
  const kindIndex = columns.indexOf("kind");
  const skillIdIndex = columns.indexOf("skillid");
  const durationIndex = columns.indexOf("duration");
  if (kindIndex === -1) return { entries: [], skippedRows: rows.length };

  const entries: ReplayEntry[] = [];
  let skippedRows = 0;
  for (const line of rows) {
    const fields = parseCsvLine(line);
    const kind = fields[kindIndex]?.trim();
    if (kind === "skill") {
      const skillId = skillIdIndex === -1 ? "" : fields[skillIdIndex]?.trim();
      if (!skillId || !job.skills[skillId]) {
        skippedRows += 1;
        continue;
      }
      entries.push({ id: generateEntryId(), kind: "skill", skillId, usedAt: 0, preserveTiming: false });
    } else if (kind === "wait") {
      const duration = durationIndex === -1 ? NaN : Number(fields[durationIndex]);
      if (!Number.isFinite(duration) || duration <= 0) {
        skippedRows += 1;
        continue;
      }
      entries.push({ id: generateEntryId(), kind: "wait", duration, usedAt: 0, preserveTiming: false });
    } else {
      skippedRows += 1;
    }
  }
  return { entries, skippedRows };
}
