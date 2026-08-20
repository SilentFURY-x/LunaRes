/**
 * Hooks for the ISRO Pipeline Integration tab.
 *
 * Wraps the Bhoonidhi-contract adapter endpoints: search, fetch, push.
 * Backend switches between live and mock adapter based on config — the
 * frontend doesn't need to know which is active.
 *
 * @see backend/api/routers/pipeline.py
 * @see backend/adapters/bhoonidhi/
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { pipelineSearch, pipelineFetch, pipelinePush } from "@/api/endpoints";
import type {
  PipelineSearchParams,
  PipelineSearchResult,
  PipelineFetchResult,
  PipelinePushResult,
} from "@/api/types";

/** Search the Bhoonidhi catalog (or mock catalog) */
export function usePipelineSearch(
  params: PipelineSearchParams | null,
) {
  return useQuery<PipelineSearchResult>({
    queryKey: ["pipeline", "search", params],
    queryFn: () => pipelineSearch(params!),
    enabled: !!params,
  });
}

/** Fetch a product from the pipeline catalog → ingest as a Scene */
export function usePipelineFetch() {
  return useMutation<PipelineFetchResult, Error, string>({
    mutationFn: pipelineFetch,
  });
}

/** Push an enhanced product back to the pipeline (egress) */
export function usePipelinePush() {
  return useMutation<PipelinePushResult, Error, string>({
    mutationFn: pipelinePush,
  });
}
