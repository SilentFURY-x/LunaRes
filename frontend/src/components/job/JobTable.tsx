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
    return <p className="text-sm text-regolith/50 py-4">Loading jobs…</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-regolith/50 py-4">No jobs yet. Submit an enhancement from the Workspace.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-regolith/50 border-b border-crater">
          <th className="py-2 pr-4">Job ID</th>
          <th className="py-2 pr-4">Mode</th>
          <th className="py-2 pr-4">Scenes</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2 pr-4">Progress</th>
          <th className="py-2 pr-4">Created</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => {
          const isTerminal = ["complete", "failed", "cancelled"].includes(job.status);
          const canCancel = !isTerminal;
          const canView = job.status === "complete";

          return (
            <tr key={job.job_id} className="border-b border-crater/50">
              <td className="py-2 pr-4 font-mono text-xs">{job.job_id.slice(0, 8)}</td>
              <td className="py-2 pr-4 text-xs">{job.sr_model ?? job.inference_mode}</td>
              <td className="py-2 pr-4 text-xs">{job.scene_count}</td>
              <td className="py-2 pr-4">
                <StatusBadge status={job.status} />
              </td>
              <td className="py-2 pr-4 w-48">
                <JobProgressBar
                  tilesComplete={job.tiles_complete}
                  tilesTotal={job.tiles_total}
                />
              </td>
              <td className="py-2 pr-4 text-xs text-regolith/60">
                {new Date(job.created_at).toLocaleString()}
              </td>
              <td className="py-2">
                <div className="flex gap-2">
                  {canView && (
                    <button
                      onClick={() => onViewResult(job.job_id)}
                      className="text-xs text-signal"
                    >
                      View
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => onCancel(job.job_id)}
                      className="text-xs text-flare"
                    >
                      Cancel
                    </button>
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
