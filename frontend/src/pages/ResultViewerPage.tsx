/**
 * Result Viewer Page — the centerpiece screen.
 *
 * Core value delivery: before/after comparison, confidence overlay,
 * metrics, provenance, export actions, feedback tool.
 *
 * Layout: main viewport (left) + sidebar (right).
 *
 * @see docs/AppFlow.md step 5
 * @see docs/frontend_layout.md section 5 — Result Viewer
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import CompareSlider from "@/components/viewer/CompareSlider";
import TileMapView from "@/components/viewer/TileMapView";
import ConfidenceOverlay from "@/components/viewer/ConfidenceOverlay";
import MetricsPanel from "@/components/viewer/MetricsPanel";
import ProvenancePanel from "@/components/viewer/ProvenancePanel";
import ExportActions from "@/components/viewer/ExportActions";
import FeedbackTool from "@/components/viewer/FeedbackTool";
import TabSwitcher from "@/components/shared/TabSwitcher";
import { useProductByJobScene } from "@/hooks/useProducts";
import { env } from "@/config/env";

const VIEW_TABS = [
  { id: "compare", label: "Compare (LR ↔ SR)" },
  { id: "map", label: "Deep Zoom (Tile Map)" },
];

export default function ResultViewerPage() {
  const { jobId, sceneId } = useParams<{ jobId: string; sceneId: string }>();
  const { data: product, isLoading, isError } = useProductByJobScene(jobId, sceneId);

  // Confidence overlay state
  const [confidenceEnabled, setConfidenceEnabled] = useState(false);
  const [confidenceOpacity, setConfidenceOpacity] = useState(0.5);

  if (isLoading) {
    return (
      <div className="px-6 py-12">
        <p className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText">Loading result…</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="px-6 py-12">
        <p className="font-medium text-sm tracking-tight text-red-600 dark:text-red-400">
          Failed to load product. The job may still be processing.
        </p>
      </div>
    );
  }

  // Build tile URLs from product URIs
  const lrTileUrl = `${env.TILE_SERVER_URL}/cog/tiles/{z}/{x}/{y}?url=${encodeURIComponent(product.sr_output_uri)}`;
  const srTileUrl = lrTileUrl; // SR output tiles
  const confidenceTileUrl = product.confidence_map_uri
    ? `${env.TILE_SERVER_URL}/cog/tiles/{z}/{x}/{y}?url=${encodeURIComponent(product.confidence_map_uri)}`
    : undefined;

  return (
    <div className="px-6 py-12 max-w-[1400px] mx-auto">
      <h2 className="font-display font-extrabold text-2xl uppercase tracking-wider text-primaryText mb-8">
        Result
      </h2>

      <div className="flex gap-8">
        {/* Main viewport */}
        <div className="flex-1 min-w-0">
          <TabSwitcher tabs={VIEW_TABS} defaultTab="compare">
            {(activeTab) => (
              <div className="py-6">
                {activeTab === "compare" && (
                  <CompareSlider
                    lrImageUrl={lrTileUrl}
                    srImageUrl={srTileUrl}
                  />
                )}
                {activeTab === "map" && (
                  <TileMapView
                    tileUrl={srTileUrl}
                    overlayTileUrl={
                      confidenceEnabled ? confidenceTileUrl : undefined
                    }
                    overlayOpacity={confidenceOpacity}
                  />
                )}
              </div>
            )}
          </TabSwitcher>

          {/* Confidence controls — floating below viewport */}
          <div className="mt-6 border-t border-divider pt-6">
            <ConfidenceOverlay
              enabled={confidenceEnabled}
              onToggle={setConfidenceEnabled}
              opacity={confidenceOpacity}
              onOpacityChange={setConfidenceOpacity}
              unavailable={!product.confidence_map_uri}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-6">
          <ProvenancePanel product={product} />
          <MetricsPanel metrics={product.metrics} />
          <ExportActions productId={product.product_id} />
          <FeedbackTool productId={product.product_id} />
        </div>
      </div>
    </div>
  );
}
