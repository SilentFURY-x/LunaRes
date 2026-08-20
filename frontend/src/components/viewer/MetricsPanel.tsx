/**
 * Metrics panel — displays quality metrics for the enhanced product.
 *
 * Dynamically switches between reference-based metrics (PSNR/SSIM/LPIPS)
 * when ground truth was available, and no-reference metrics (NIQE) when not.
 *
 * @see docs/frontend_layout.md section 5 — "Metrics Panel"
 * @see docs/PRD.md FR7 — reference-based and no-reference metrics
 */

import type { ProductMetrics } from "@/api/types";

interface MetricsPanelProps {
  metrics: ProductMetrics;
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  const hasReference = metrics.psnr != null || metrics.ssim != null || metrics.lpips != null;
  const hasNoReference = metrics.no_reference_quality != null;

  return (
    <div className="border border-crater p-3">
      <h4 className="text-xs text-regolith/50 mb-2 font-display">Quality Metrics</h4>

      {hasReference && (
        <div className="flex flex-col gap-1 mb-2">
          <span className="text-xs text-regolith/40">Reference-based (ground truth available)</span>
          {metrics.psnr != null && (
            <MetricRow label="PSNR" value={`${metrics.psnr.toFixed(2)} dB`} />
          )}
          {metrics.ssim != null && (
            <MetricRow label="SSIM" value={metrics.ssim.toFixed(4)} />
          )}
          {metrics.lpips != null && (
            <MetricRow label="LPIPS" value={metrics.lpips.toFixed(4)} />
          )}
        </div>
      )}

      {hasNoReference && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-regolith/40">
            {hasReference ? "Additional" : "No-reference (no ground truth)"}
          </span>
          <MetricRow label="NIQE" value={metrics.no_reference_quality!.toFixed(2)} />
        </div>
      )}

      {!hasReference && !hasNoReference && (
        <p className="text-xs text-regolith/40">No metrics available</p>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-regolith/70">{label}</span>
      <span className="font-mono text-regolith">{value}</span>
    </div>
  );
}
