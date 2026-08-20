/**
 * TypeScript types mirroring backend/api/schemas.py.
 *
 * RULE: If the backend schema changes, update HERE first — every hook and
 * component downstream will get compile-time errors pointing to what broke.
 *
 * @see backend/api/schemas.py
 * @see backend/db/models.py
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum SensorProfile {
  Lunar = "lunar",
  EarthOptical = "earth_optical",
  SAR = "sar",
}

export enum InferenceMode {
  Fast = "fast",
  HighFidelity = "high_fidelity",
}

export enum JobStatus {
  Queued = "queued",
  Tiling = "tiling",
  Inferring = "inferring",
  Blending = "blending",
  Complete = "complete",
  Failed = "failed",
  Cancelled = "cancelled",
}

// ─── Scene ────────────────────────────────────────────────────────────────────

/** POST /scenes/upload request body metadata (file sent as multipart) */
export interface SceneCreateMeta {
  sensor_profile: SensorProfile;
  acquisition_time?: string | null;
}

/** Scene summary returned from GET /scenes/ search */
export interface SceneSummary {
  id: string;
  source_uri: string;
  sensor_profile: SensorProfile;
  gsd_meters: number | null;
  acquisition_time: string | null;
  product_id: string | null;
  thumbnail_url: string | null;
  /** GeoJSON polygon — the scene footprint */
  footprint: GeoJSONPolygon | null;
}

/** Minimal GeoJSON polygon for footprints */
export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

// ─── Scene search ─────────────────────────────────────────────────────────────

export interface SceneSearchParams {
  bbox?: string;         // "minLon,minLat,maxLon,maxLat"
  sensor?: SensorProfile;
  start_date?: string;   // ISO date
  end_date?: string;     // ISO date
}

// ─── Job ──────────────────────────────────────────────────────────────────────

/** POST /jobs/ request body — mirrors backend JobCreate */
export interface JobCreate {
  scene_ids: string[];
  inference_mode: InferenceMode;
  generate_confidence_map: boolean;
  run_downstream_task_comparison: boolean;
}

/** GET /jobs/:id response — mirrors backend JobStatusResponse */
export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  tiles_total: number;
  tiles_complete: number;
  created_at: string;
  updated_at: string;
  /** Only present for batch jobs — per-scene breakdown */
  scene_progress?: SceneProgress[];
}

export interface SceneProgress {
  scene_id: string;
  status: JobStatus;
  tiles_total: number;
  tiles_complete: number;
}

/** GET /jobs/ list response */
export interface JobListItem {
  job_id: string;
  status: JobStatus;
  inference_mode: InferenceMode;
  tiles_total: number;
  tiles_complete: number;
  scene_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductMetrics {
  /** Present when HR ground truth was available */
  psnr: number | null;
  ssim: number | null;
  lpips: number | null;
  /** Present when no ground truth — e.g. NIQE */
  no_reference_quality: number | null;
}

export interface ProductResponse {
  product_id: string;
  scene_id: string;
  job_id: string;
  sr_output_uri: string;
  confidence_map_uri: string | null;
  metrics: ProductMetrics;
  model_version: string;
  /** Provenance metadata */
  source_sensor: string;
  acquisition_date: string | null;
  product_source_id: string | null;
  /** Downstream task comparison (stretch) */
  downstream_delta: DownstreamDelta | null;
}

export interface DownstreamDelta {
  task_name: string;
  before_count: number;
  after_count: number;
  description: string;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  services?: {
    postgres: boolean;
    redis: boolean;
    minio: boolean;
  };
  latency_ms?: number;
}

// ─── Pipeline / ISRO adapter ──────────────────────────────────────────────────

export interface PipelineSearchParams {
  bbox: string;
  sensor: string;
  start_date: string;
  end_date: string;
}

export interface PipelineCatalogEntry {
  product_id: string;
  sensor: string;
  acquisition_date: string;
  resolution_m: number;
  thumbnail_url: string | null;
  footprint: GeoJSONPolygon | null;
}

export interface PipelineSearchResult {
  adapter_mode: "live" | "mock";
  results: PipelineCatalogEntry[];
}

export interface PipelineFetchResult {
  scene_id: string;
  product_id: string;
  message: string;
}

export interface PipelinePushResult {
  product_id: string;
  status: "pushed" | "failed";
  message: string;
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

/** Shape of each message received from WS /ws/jobs/:jobId */
export interface WebSocketJobUpdate {
  job_id: string;
  status: JobStatus;
  tiles_total: number;
  tiles_complete: number;
  /** Per-scene breakdown for batch jobs */
  scene_progress?: SceneProgress[];
  /** ISO timestamp of this update */
  timestamp: string;
}

// ─── Aggregate stats (dashboard) ──────────────────────────────────────────────

export interface AggregateStatsData {
  active_workers: number;
  total_tiles_processed: number;
  throughput_tiles_per_minute: number;
}

// ─── Export / download ────────────────────────────────────────────────────────

export type ExportFormat = "geotiff" | "png" | "pdf";

// ─── Feedback (stretch) ───────────────────────────────────────────────────────

export interface FeedbackCreate {
  product_id: string;
  region: GeoJSONPolygon;
  note: string;
}
