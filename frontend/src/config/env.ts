/// <reference types="vite/client" />
/**
 * Typed access to Vite environment variables.
 * Teammates: change URLs here (or in .env) — every API call reads from this module.
 *
 * @see frontend/.env.example for the expected variables
 */

export const env = {
  /** Base URL for the FastAPI backend (e.g. http://localhost:8000) */
  API_URL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",

  /** Base URL for the titiler tile server (e.g. http://localhost:8001) */
  TILE_SERVER_URL: import.meta.env.VITE_TILE_SERVER_URL ?? "http://localhost:8001",

  /**
   * Derive WebSocket URL from API_URL.
   * Replaces http(s):// with ws(s):// automatically.
   */
  get WS_URL(): string {
    return this.API_URL.replace(/^http/, "ws");
  },
} as const;
