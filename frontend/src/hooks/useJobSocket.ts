/**
 * Hook: WebSocket-driven real-time job progress.
 *
 * Wraps the JobWebSocket class in a React hook. Returns live tile progress
 * state that updates on every WS message — no polling needed.
 *
 * Falls back gracefully if WS is unavailable (connection status exposed).
 *
 * @see src/api/ws.ts (WebSocket manager)
 * @see src/hooks/useJobs.ts (polling fallback)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { JobWebSocket } from "@/api/ws";
import type { WebSocketJobUpdate, JobStatus, SceneProgress } from "@/api/types";

interface JobSocketState {
  status: JobStatus | null;
  tilesTotal: number;
  tilesComplete: number;
  sceneProgress: SceneProgress[];
  connected: boolean;
  lastUpdate: string | null;
}

export function useJobSocket(jobId: string | undefined) {
  const [state, setState] = useState<JobSocketState>({
    status: null,
    tilesTotal: 0,
    tilesComplete: 0,
    sceneProgress: [],
    connected: false,
    lastUpdate: null,
  });

  const wsRef = useRef<JobWebSocket | null>(null);

  const handleMessage = useCallback((update: WebSocketJobUpdate) => {
    setState({
      status: update.status,
      tilesTotal: update.tiles_total,
      tilesComplete: update.tiles_complete,
      sceneProgress: update.scene_progress ?? [],
      connected: true,
      lastUpdate: update.timestamp,
    });
  }, []);

  const handleStatus = useCallback((connected: boolean) => {
    setState((prev) => ({ ...prev, connected }));
  }, []);

  useEffect(() => {
    if (!jobId) return;

    wsRef.current = new JobWebSocket(jobId, handleMessage, handleStatus);

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [jobId, handleMessage, handleStatus]);

  return state;
}
