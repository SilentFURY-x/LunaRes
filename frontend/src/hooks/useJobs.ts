/**
 * Hooks for job submission, status polling, listing, and cancellation.
 *
 * @see backend/api/routers/jobs.py
 * @see src/hooks/useJobSocket.ts (WebSocket alternative to polling)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  submitJob,
  getJobStatus,
  listJobs,
  cancelJob,
  getAggregateStats,
} from "@/api/endpoints";
import {
  JobStatus,
  type JobCreate,
  type JobStatusResponse,
  type JobListItem,
  type AggregateStatsData,
} from "@/api/types";

/** Submit a new job (single scene or batch). Navigates to dashboard on success. */
export function useSubmitJob() {
  const queryClient = useQueryClient();

  return useMutation<JobStatusResponse, Error, JobCreate>({
    mutationFn: submitJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/**
 * Poll job status by ID.
 * Polls every 3s while the job is active (queued/tiling/inferring/blending).
 * Stops polling once complete/failed/cancelled.
 */
export function useJobStatus(jobId: string | undefined) {
  return useQuery<JobStatusResponse>({
    queryKey: ["jobs", jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3_000;
      const terminal: JobStatus[] = [JobStatus.Complete, JobStatus.Failed, JobStatus.Cancelled];
      return terminal.includes(status) ? false : 3_000;
    },
  });
}

/** List all jobs — for the dashboard table */
export function useJobList() {
  return useQuery<JobListItem[]>({
    queryKey: ["jobs", "list"],
    queryFn: listJobs,
    refetchInterval: 5_000,
  });
}

/** Cancel a queued or running job */
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: cancelJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/** Aggregate stats for the dashboard header — active workers, throughput */
export function useAggregateStats() {
  return useQuery<AggregateStatsData>({
    queryKey: ["jobs", "stats"],
    queryFn: getAggregateStats,
    refetchInterval: 5_000,
  });
}
