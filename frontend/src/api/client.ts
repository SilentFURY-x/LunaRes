/**
 * HTTP client for the LunaRes API.
 *
 * All endpoint functions in endpoints.ts call through this module.
 * Teammates: add auth headers, request interceptors, or error transforms here
 * and every endpoint gets them automatically.
 *
 * @see src/config/env.ts for base URL configuration
 */

import { env } from "@/config/env";

/** Standard API error shape returned to callers */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

/**
 * JSON request helper. Throws {@link ApiError} on non-2xx responses.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${env.API_URL}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, body);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/** GET helper */
export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

/** POST helper (JSON body) */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** DELETE helper */
export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

/**
 * Multipart upload helper — for file uploads that send FormData instead of JSON.
 * Does NOT set Content-Type (browser sets it with boundary automatically).
 */
export async function upload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const url = `${env.API_URL}${path}`;
  const res = await fetch(url, { method: "POST", body: formData });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, body);
  }

  return res.json() as Promise<T>;
}

/**
 * Build a query string from an object, omitting undefined/null values.
 * Example: toQuery({ bbox: "1,2,3,4", sensor: undefined }) → "?bbox=1,2,3,4"
 */
export function toQuery(params: Record<string, string | undefined | null>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] != null,
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}
