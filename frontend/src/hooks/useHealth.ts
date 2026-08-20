/**
 * Hook: backend system health — drives the nav bar status indicator.
 * Polls GET /health every 30 seconds.
 *
 * @see backend/api/main.py health endpoint
 * @see src/components/layout/NavBar.tsx (consumer)
 */

import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/api/endpoints";
import type { HealthResponse } from "@/api/types";

export function useHealth() {
  const query = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: 1,
    /** Don't refetch on window focus for health — scheduled polling is enough */
    refetchOnWindowFocus: false,
  });

  return {
    health: query.data,
    isHealthy: query.data?.status === "ok",
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
