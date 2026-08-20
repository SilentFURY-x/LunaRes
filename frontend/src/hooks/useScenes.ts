/**
 * Hooks for scene search and lookup.
 *
 * - useSearchScenes: spatial search (PostGIS) for catalog browse map
 * - useScene: fetch single scene metadata
 *
 * @see backend/api/routers/scenes.py
 */

import { useQuery } from "@tanstack/react-query";
import { searchScenes, getScene } from "@/api/endpoints";
import type { SceneSearchParams, SceneSummary } from "@/api/types";

/**
 * Search scenes by bounding box, sensor, date range.
 * Enabled only when at least one search param is provided.
 */
export function useSearchScenes(params: SceneSearchParams) {
  const hasParams = Object.values(params).some((v) => v != null);

  return useQuery<SceneSummary[]>({
    queryKey: ["scenes", "search", params],
    queryFn: () => searchScenes(params),
    enabled: hasParams,
  });
}

/** Fetch a single scene by ID */
export function useScene(sceneId: string | undefined) {
  return useQuery<SceneSummary>({
    queryKey: ["scenes", sceneId],
    queryFn: () => getScene(sceneId!),
    enabled: !!sceneId,
  });
}
