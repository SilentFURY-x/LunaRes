/**
 * All REST endpoint functions — one function per backend route.
 *
 * RULE: This is the ONLY file that knows endpoint paths. Hooks call these
 * functions; components never call fetch directly.
 *
 * @see backend/api/routers/jobs.py
 * @see backend/api/routers/scenes.py
 * @see backend/api/routers/pipeline.py
 */

import { get, post, del, upload, toQuery } from "./client";
import type {
  HealthResponse,
  SceneSummary,
  SceneCreateMeta,
  SceneSearchParams,
  JobCreate,
  JobStatusResponse,
  JobListItem,
  ProductResponse,
  ExportFormat,
  PipelineSearchParams,
  PipelineSearchResult,
  PipelineFetchResult,
  PipelinePushResult,
  AggregateStatsData,
  FeedbackCreate,
} from "./types";

// ─── Health ───────────────────────────────────────────────────────────────────

/** GET /health — backend system health (Postgres, Redis, MinIO) */
export function getHealth(): Promise<HealthResponse> {
  return get<HealthResponse>("/health");
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

/**
 * POST /scenes/upload — upload a file + metadata.
 * Built-in SHA-256 deduplication happens server-side; uploading the same file
 * twice returns the existing Scene ID.
 */
export function uploadScene(
  file: File,
  meta: SceneCreateMeta,
): Promise<SceneSummary> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sensor_profile", meta.sensor_profile);
  if (meta.acquisition_time) {
    formData.append("acquisition_time", meta.acquisition_time);
  }
  return upload<SceneSummary>("/scenes/upload", formData);
}

/**
 * GET /scenes/ — spatial search over ingested scenes.
 * Powers both the catalog-browse map UI and the pipeline adapter's search.
 * Uses PostGIS ST_Intersects on the backend.
 */
export function searchScenes(params: SceneSearchParams): Promise<SceneSummary[]> {
  return get<SceneSummary[]>("/scenes/" + toQuery(params as Record<string, string | undefined>));
}

/** GET /scenes/:id — fetch single scene metadata */
export function getScene(sceneId: string): Promise<SceneSummary> {
  return get<SceneSummary>(`/scenes/${sceneId}`);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

/**
 * POST /jobs/ — submit a job (single or batch).
 * Returns immediately with job_id; poll GET /jobs/:id or subscribe via WS.
 */
export function submitJob(config: JobCreate): Promise<JobStatusResponse> {
  return post<JobStatusResponse>("/jobs/", config);
}

/** GET /jobs/:id — poll job status + tile progress */
export function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return get<JobStatusResponse>(`/jobs/${jobId}`);
}

/** GET /jobs/ — list all jobs (for dashboard) */
export function listJobs(): Promise<JobListItem[]> {
  return get<JobListItem[]>("/jobs/");
}

/**
 * DELETE /jobs/:id — cancel a queued or running job.
 * Backend revokes the Celery task.
 */
export function cancelJob(jobId: string): Promise<void> {
  return del<void>(`/jobs/${jobId}`);
}

/** GET /jobs/stats — aggregate stats for the dashboard header */
export function getAggregateStats(): Promise<AggregateStatsData> {
  return get<AggregateStatsData>("/jobs/stats");
}

// ─── Products ─────────────────────────────────────────────────────────────────

/** GET /products/:id — full product details including metrics + provenance */
export function getProduct(productId: string): Promise<ProductResponse> {
  return get<ProductResponse>(`/products/${productId}`);
}

/**
 * GET /products/:id/download?format=geotiff|png|pdf
 * Returns a time-limited presigned URL for downloading the product.
 */
export function getDownloadUrl(
  productId: string,
  format: ExportFormat,
): Promise<{ url: string }> {
  return get<{ url: string }>(`/products/${productId}/download?format=${format}`);
}

/** Find the product(s) for a given job + scene combination */
export function getProductByJobScene(
  jobId: string,
  sceneId: string,
): Promise<ProductResponse> {
  return get<ProductResponse>(`/products/by-job/${jobId}/scene/${sceneId}`);
}

// ─── Pipeline / ISRO adapter ──────────────────────────────────────────────────

/**
 * GET /pipeline/search — Bhoonidhi-style search by AOI, sensor, date range.
 * Backend routes to mock or live adapter based on BHOONIDHI_ADAPTER_MODE.
 */
export function pipelineSearch(
  params: PipelineSearchParams,
): Promise<PipelineSearchResult> {
  return get<PipelineSearchResult>(
    "/pipeline/search" + toQuery(params as unknown as Record<string, string>),
  );
}

/**
 * POST /pipeline/fetch/:productId — fetch a product from the pipeline catalog,
 * ingest it as a Scene, return the new scene_id.
 */
export function pipelineFetch(productId: string): Promise<PipelineFetchResult> {
  return post<PipelineFetchResult>(`/pipeline/fetch/${productId}`);
}

/**
 * POST /pipeline/push/:productId — egress: push an enhanced product back out
 * in ISRO-pipeline-compatible form (GeoTIFF + metadata sidecar).
 */
export function pipelinePush(productId: string): Promise<PipelinePushResult> {
  return post<PipelinePushResult>(`/pipeline/push/${productId}`);
}

// ─── Feedback (stretch) ───────────────────────────────────────────────────────

/** POST /feedback — flag a bad reconstruction region */
export function submitFeedback(feedback: FeedbackCreate): Promise<{ id: string }> {
  return post<{ id: string }>("/feedback/", feedback);
}
