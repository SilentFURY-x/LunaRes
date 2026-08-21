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
import { RippleButton } from '@/components/ui/ripple-button';

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
    <div className="border border-divider p-3">
      <h4 className="text-xs text-secondaryText mb-2 font-display font-extrabold uppercase tracking-wider text-primaryText">Export</h4>

      <div className="flex flex-col gap-1">
        {DOWNLOADS.map(({ format, label }) => (
          <RippleButton
            key={format}
            onClick={() => handleDownload(format)}
            disabled={downloading === format}
            className="text-left text-sm text-primaryText px-2 py-1 border border-divider"
          >
            {downloading === format ? "Preparing…" : label}
          </RippleButton>
        ))}

        <RippleButton
          onClick={handlePush}
          disabled={pushing}
          className="text-left text-sm text-red-600 dark:text-red-400 px-2 py-1 border border-divider mt-1"
        >
          {pushing ? "Pushing…" : "Push to ISRO Pipeline"}
        </RippleButton>

        {pushStatus && (
          <p className="text-xs text-secondaryText mt-1">{pushStatus}</p>
        )}
      </div>
    </div>
  );
}
