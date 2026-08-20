/**
 * Export/download actions — GeoTIFF, PNG, PDF report, push to pipeline.
 *
 * All downloads use time-limited presigned URLs via GET /products/:id/download.
 *
 * @see docs/frontend_layout.md section 5 — "Export Actions"
 * @see docs/PRD.md FR5 — download enhanced output
 */

import { useState } from "react";
import { getDownloadUrl } from "@/api/endpoints";
import { pipelinePush } from "@/api/endpoints";
import type { ExportFormat } from "@/api/types";

interface ExportActionsProps {
  productId: string;
}

export default function ExportActions({ productId }: ExportActionsProps) {
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  async function handleDownload(format: ExportFormat) {
    setDownloading(format);
    try {
      const { url } = await getDownloadUrl(productId, format);
      window.open(url, "_blank");
    } catch {
      // Error handling delegated to global error boundary or toast
    } finally {
      setDownloading(null);
    }
  }

  async function handlePush() {
    setPushing(true);
    setPushStatus(null);
    try {
      const result = await pipelinePush(productId);
      setPushStatus(result.status === "pushed" ? "Pushed successfully" : result.message);
    } catch {
      setPushStatus("Push failed");
    } finally {
      setPushing(false);
    }
  }

  const DOWNLOADS: Array<{ format: ExportFormat; label: string }> = [
    { format: "geotiff", label: "Download GeoTIFF" },
    { format: "png", label: "Download PNG" },
    { format: "pdf", label: "Download PDF Report" },
  ];

  return (
    <div className="border border-crater p-3">
      <h4 className="text-xs text-regolith/50 mb-2 font-display">Export</h4>

      <div className="flex flex-col gap-1">
        {DOWNLOADS.map(({ format, label }) => (
          <button
            key={format}
            onClick={() => handleDownload(format)}
            disabled={downloading === format}
            className="text-left text-sm text-signal px-2 py-1 border border-crater"
          >
            {downloading === format ? "Preparing…" : label}
          </button>
        ))}

        <button
          onClick={handlePush}
          disabled={pushing}
          className="text-left text-sm text-flare px-2 py-1 border border-crater mt-1"
        >
          {pushing ? "Pushing…" : "Push to ISRO Pipeline"}
        </button>

        {pushStatus && (
          <p className="text-xs text-regolith/60 mt-1">{pushStatus}</p>
        )}
      </div>
    </div>
  );
}
