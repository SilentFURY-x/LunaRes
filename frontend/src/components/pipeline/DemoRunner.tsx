/**
 * Pipeline demo runner — orchestrates search → fetch → enhance → push flow.
 *
 * "Run Example" button walks through the full pipeline integration
 * and emits log entries to the ConsoleLog component.
 *
 * @see docs/frontend_layout.md section 6 — "Live Demo Runner"
 * @see docs/AppFlow.md secondary flow 2 — ISRO Pipeline Integration Demo
 */

import { useState, useCallback } from "react";
import { pipelineSearch, pipelineFetch, pipelinePush } from "@/api/endpoints";
import { submitJob } from "@/api/endpoints";
import { SRModelName } from "@/api/types";
import ConsoleLog from "./ConsoleLog";
import type { LogEntry } from "./ConsoleLog";
import { RippleButton } from '@/components/ui/ripple-button';

// Pre-configured demo search params (Bhoonidhi mock catalog)
const DEMO_SEARCH_PARAMS = {
  bbox: "78.0,12.0,79.0,13.0",
  sensor: "TMC-2",
  start_date: "2019-01-01",
  end_date: "2024-12-31",
};

export default function DemoRunner() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = useCallback(
    (message: string, status: LogEntry["status"] = "done") => {
      const timestamp = new Date().toLocaleTimeString();
      setEntries((prev) => [...prev, { timestamp, message, status }]);
    },
    [],
  );

  const updateLastLog = useCallback(
    (status: LogEntry["status"], message?: string) => {
      setEntries((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) {
          copy[copy.length - 1] = {
            ...last,
            status,
            message: message ?? last.message,
          };
        }
        return copy;
      });
    },
    [],
  );

  async function runDemo() {
    setEntries([]);
    setRunning(true);

    try {
      // Step 1: Search catalog
      addLog("Searching Bhoonidhi catalog…", "running");
      const searchResult = await pipelineSearch(DEMO_SEARCH_PARAMS);
      updateLastLog(
        "done",
        `Found ${searchResult.results.length} products (adapter: ${searchResult.adapter_mode})`,
      );

      if (searchResult.results.length === 0) {
        addLog("No products found — demo cannot continue", "error");
        return;
      }

      const product = searchResult.results[0];

      // Step 2: Fetch product
      addLog(`Fetching product ${product.product_id}…`, "running");
      const fetchResult = await pipelineFetch(product.product_id);
      updateLastLog("done", `Ingested as scene ${fetchResult.scene_id.slice(0, 8)}`);

      // Step 3: Run enhancement
      addLog("Submitting enhancement job…", "running");
      const jobResult = await submitJob({
        scene_ids: [fetchResult.scene_id],
        sr_model: SRModelName.LunaFormerLunar,
        generate_confidence_map: true,
        run_downstream_comparison: false,
      });
      updateLastLog(
        "done",
        `Job ${jobResult.job_id.slice(0, 8)} created (status: ${jobResult.status})`,
      );

      // Step 4: Push output (in a real flow, you'd wait for job completion first)
      addLog("Pushing enhanced output to pipeline…", "running");
      try {
        const pushResult = await pipelinePush(product.product_id);
        updateLastLog("done", `Push status: ${pushResult.status}`);
      } catch {
        updateLastLog(
          "done",
          "Push skipped — job not yet complete (expected in async flow)",
        );
      }

      addLog("Demo flow complete ✓", "done");
    } catch (err) {
      updateLastLog(
        "error",
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-4">
      <RippleButton
        onClick={runDemo}
        disabled={running}
        className={`px-4 py-2 text-sm font-display font-extrabold uppercase tracking-wider text-primaryText mb-3 ${
          running
            ? "bg-glassBase text-secondaryText cursor-not-allowed"
            : "bg-glassActive text-black"
        }`}
      >
        {running ? "Running…" : "Run Example"}
      </RippleButton>

      <ConsoleLog entries={entries} />
    </div>
  );
}
