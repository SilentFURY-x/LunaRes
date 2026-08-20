/**
 * ISRO Pipeline Integration Page — demo tab for judges.
 *
 * Shows the Bhoonidhi API contract, adapter mode, and a "Run Example"
 * button that walks through the full pipeline flow.
 *
 * @see docs/AppFlow.md secondary flow 2
 * @see docs/frontend_layout.md section 6 — ISRO Pipeline Integration
 */

import { useState } from "react";
import ContractDisplay from "@/components/pipeline/ContractDisplay";
import AdapterModeToggle from "@/components/pipeline/AdapterModeToggle";
import DemoRunner from "@/components/pipeline/DemoRunner";
import { usePipelineSearch } from "@/hooks/usePipeline";

export default function PipelinePage() {
  // Run a lightweight search to detect which adapter mode the backend is using
  const [detectMode, setDetectMode] = useState(false);
  const { data: searchResult } = usePipelineSearch(
    detectMode
      ? { bbox: "0,0,1,1", sensor: "TMC-2", start_date: "2024-01-01", end_date: "2024-12-31" }
      : null,
  );

  // Trigger mode detection on mount
  if (!detectMode) {
    setDetectMode(true);
  }

  return (
    <div className="px-6 py-6">
      <h2 className="font-display text-xl mb-2">ISRO Pipeline Integration</h2>
      <p className="text-sm text-regolith/60 mb-4">
        This tab demonstrates the Bhoonidhi-compatible pipeline adapter.
        The same API contract works with both a live ISRO API connection
        and a mock adapter for demo purposes.
      </p>

      <AdapterModeToggle
        currentMode={searchResult?.adapter_mode ?? null}
      />

      <ContractDisplay />

      <DemoRunner />
    </div>
  );
}
