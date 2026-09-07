import type { JobDefinition } from "../types/job";
import { reaperJobDefinition } from "./reaper/jobDefinition";
import { knightJobDefinition } from "./knight/jobDefinition";

// ジョブ切替UI(App.tsx)が参照する一覧。新しいジョブを追加する際はここに1行足すだけでよい。
export const jobRegistry: JobDefinition<any>[] = [reaperJobDefinition, knightJobDefinition];

export const DEFAULT_JOB_ID = reaperJobDefinition.id;
