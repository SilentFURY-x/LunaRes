/**
 * Job Dashboard Page — async job tracking and scalability demonstration.
 *
 * Shows aggregate stats at top (workers, throughput), job list below.
 * This is where "Scalable" becomes visible to a judge.
 *
 * @see docs/AppFlow.md step 4
 * @see docs/frontend_layout.md section 4 — Job Dashboard
 */

import { useNavigate } from "react-router-dom";
import AggregateStats from "@/components/job/AggregateStats";
import JobTable from "@/components/job/JobTable";
import { useJobList, useCancelJob, useAggregateStats } from "@/hooks/useJobs";
import { showToast } from "@/components/shared/Toast";

export default function JobDashboardPage() {
  const navigate = useNavigate();
  const { data: jobs, isLoading: jobsLoading } = useJobList();
  const { data: stats, isLoading: statsLoading } = useAggregateStats();
  const cancelMutation = useCancelJob();

  function handleViewResult(jobId: string) {
    // Navigate to result viewer — uses first scene in the job for now
    // In a full implementation, you'd pick which scene to view
    navigate(`/jobs/${jobId}/result/_`);
  }

  function handleCancel(jobId: string) {
    cancelMutation.mutate(jobId, {
      onSuccess: () => showToast("Job cancelled", "info"),
      onError: (err) => showToast(`Cancel failed: ${err.message}`, "error"),
    });
  }

  return (
    <div className="px-6 py-12 max-w-6xl mx-auto">
      <h2 className="font-display font-extrabold text-2xl uppercase tracking-wider text-primaryText mb-8">
        Job Dashboard
      </h2>

      <AggregateStats stats={stats} isLoading={statsLoading} />

      <JobTable
        jobs={jobs ?? []}
        isLoading={jobsLoading}
        onViewResult={handleViewResult}
        onCancel={handleCancel}
      />
    </div>
  );
}
