/**
 * WebSocket manager for real-time job progress updates.
 *
 * Connects to WS /ws/jobs/:jobId on the backend. Auto-reconnects with
 * exponential backoff on disconnect. Pages consume this through the
 * useJobSocket hook — they never instantiate this class directly.
 *
 * @see backend/api/routers/jobs.py (WebSocket endpoint)
 * @see src/hooks/useJobSocket.ts
 */

import { env } from "@/config/env";
import type { WebSocketJobUpdate } from "./types";

export type OnMessageCallback = (update: WebSocketJobUpdate) => void;
export type OnStatusCallback = (connected: boolean) => void;

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

export class JobWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(
    private jobId: string,
    private onMessage: OnMessageCallback,
    private onStatus?: OnStatusCallback,
  ) {
    this.connect();
  }

  private connect(): void {
    if (this.disposed) return;

    const url = `${env.WS_URL}/ws/jobs/${this.jobId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.onStatus?.(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as WebSocketJobUpdate;
        this.onMessage(update);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.onStatus?.(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onerror always fires before onclose — close handler does the reconnect
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  /** Clean up — call on component unmount */
  close(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
    }
  }
}
