/**
 * Job list table — the main dashboard view.
 *
 * Pure presentational: receives job array, renders status badges and progress.
 * Emits callbacks for view/cancel actions.
 *
 * @see docs/frontend_layout.md section 4 — "Job List/Table"
 * @see docs/AppFlow.md step 4 — Job dashboard
 */

import type { JobListItem } from "@/api/types";
import StatusBadge from "./StatusBadge";
import JobProgressBar from "./JobProgressBar";
import { RippleButton } from '@/components/ui/ripple-button';

interface JobTableProps {
  jobs: JobListItem[];
  isLoading?: boolean;
  onViewResult: (jobId: string) => void;
  onCancel: (jobId: string) => void;
}

export default function JobTable({
  jobs,
  isLoading,
  onViewResult,
  onCancel,
}: JobTableProps) {
  if (isLoading) {
    return <p className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText py-4">Loading jobs…</p>;
  }

  if (jobs.length === 0) {
    return <p className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText py-4">No jobs yet. Submit an enhancement from the Workspace.</p>;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-divider font-mono font-medium text-xs uppercase tracking-widest text-secondaryText">
          <th className="py-4 pr-4 font-normal">Job ID</th>
          <th className="py-4 pr-4 font-normal">Mode</th>
          <th className="py-4 pr-4 font-normal">Scenes</th>
          <th className="py-4 pr-4 font-normal">Status</th>
          <th className="py-4 pr-4 font-normal">Progress</th>
          <th className="py-4 pr-4 font-normal">Created</th>
          <th className="py-4 font-normal">Actions</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => {
          const isTerminal = ["complete", "failed", "cancelled"].includes(job.status);
          const canCancel = !isTerminal;
          const canView = job.status === "complete";

          return (
            <tr key={job.job_id} className="border-b border-divider font-medium text-sm tracking-tight text-secondaryText">
              <td className="py-4 pr-4">{job.job_id.slice(0, 8)}</td>
              <td className="py-4 pr-4">{job.inference_mode}</td>
              <td className="py-4 pr-4">{job.scene_count}</td>
              <td className="py-4 pr-4">
                <StatusBadge status={job.status} />
              </td>
              <td className="py-4 pr-4 w-48">
                <JobProgressBar
                  tilesComplete={job.tiles_complete}
                  tilesTotal={job.tiles_total}
                />
              </td>
              <td className="py-4 pr-4 font-mono text-xs uppercase tracking-widest text-secondaryText">
                {new Date(job.created_at).toLocaleString()}
              </td>
              <td className="py-4">
                <div className="flex gap-4">
                  {canView && (
                    <RippleButton
                      onClick={() => onViewResult(job.job_id)}
                      className="text-primaryText hover:text-secondaryText transition-colors uppercase font-mono text-xs tracking-widest"
                    >
                      View
                    </RippleButton>
                  )}
                  {canCancel && (
                    <RippleButton
                      onClick={() => onCancel(job.job_id)}
                      className="text-primaryText hover:text-secondaryText transition-colors uppercase font-mono text-xs tracking-widest"
                    >
                      Cancel
                    </RippleButton>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
