/**
 * Job status badge — visual indicator for job lifecycle.
 *
 * Maps JobStatus enum to a colored label. Used in JobTable rows
 * and anywhere job status is shown.
 *
 * @see src/api/types.ts JobStatus
 */

import type { JobStatus } from "@/api/types";

interface StatusBadgeProps {
  status: JobStatus;
}

const STATUS_STYLES: Record<JobStatus, string> = {
  queued: "bg-glassBase text-secondaryText",
  tiling: "bg-glassActive text-primaryText",
  inferring: "bg-glassActive text-primaryText",
  blending: "bg-glassActive text-primaryText",
  complete: "bg-green-900/40 text-green-600 dark:text-green-400",
  failed: "bg-red-900/40 text-red-600 dark:text-red-400",
  cancelled: "bg-glassBase text-secondaryText",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued",
  tiling: "Tiling",
  inferring: "Inferring",
  blending: "Blending",
  complete: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-mono ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
