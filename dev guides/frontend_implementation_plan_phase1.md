# LunaRes Frontend — Modular, Scalable Architecture Build

## Goal
Replace the current stub pages with a fully modular, production-grade frontend architecture. **Minimum design** (padding/margins only for structure, no fancy visuals). **Maximum architecture** — clean separation of concerns, typed API contracts, reusable hooks, and a module structure your teammates can independently wire to the real backend and ML model without stepping on each other.

## Design Philosophy
- **Zero business logic in pages** — pages compose components and hooks, nothing else
- **API layer is a single source of truth** — all backend contracts live in `src/api/` with typed request/response shapes mirroring `backend/api/schemas.py`
- **Every async operation goes through React Query hooks** in `src/hooks/` — teammates swap mock → real by changing one `fetch` call
- **Components are dumb** — they receive data via props, emit events via callbacks
- **WebSocket is abstracted** — a single `useJobSocket` hook manages WS lifecycle; pages just consume state

---

## Proposed Changes

### Module Structure (new `src/` layout)

```
src/
├── api/                          # ← Backend contract layer
│   ├── client.ts                 # Axios/fetch wrapper, reads VITE_API_URL
│   ├── endpoints.ts              # All REST endpoint functions (typed)
│   ├── types.ts                  # TypeScript mirrors of backend/api/schemas.py
│   └── ws.ts                     # WebSocket connect/reconnect for job progress
│
├── hooks/                        # ← React Query + custom hooks
│   ├── useHealth.ts              # GET /health — drives nav status indicator
│   ├── useScenes.ts              # GET/POST /scenes — search & upload
│   ├── useJobs.ts                # POST /jobs, GET /jobs/:id — submit & poll
│   ├── useJobSocket.ts           # WS /ws/jobs/:id — real-time tile progress
│   ├── useProducts.ts            # GET /products/:id — result + metrics
│   ├── usePipeline.ts            # GET/POST /pipeline/* — ISRO adapter
│   └── useFileUpload.ts          # Client-side SHA-256 + upload via POST /scenes/upload
│
├── components/                   # ← Reusable, dumb UI building blocks
│   ├── layout/
│   │   ├── AppShell.tsx          # Nav bar + status indicator + main slot
│   │   └── NavBar.tsx            # Top nav with links + health dot
│   ├── upload/
│   │   ├── DropZone.tsx          # Drag-and-drop file input
│   │   ├── FormatValidator.ts    # Client-side format/size check
│   │   └── FileHasher.ts        # SHA-256 dedup hash (Web Crypto API)
│   ├── catalog/
│   │   ├── CatalogMap.tsx        # MapLibre map + draw AOI tools
│   │   ├── CatalogFilters.tsx    # Sensor dropdown + date range
│   │   └── SceneResultList.tsx   # Thumbnail list with multi-select
│   ├── job/
│   │   ├── JobConfigForm.tsx     # Model profile, mode, toggles, submit
│   │   ├── JobTable.tsx          # Job list with status badges
│   │   ├── JobProgressBar.tsx    # Tile-by-tile progress bar
│   │   ├── BatchJobRow.tsx       # Expandable row for batch items
│   │   └── AggregateStats.tsx    # Active workers, throughput counters
│   ├── viewer/
│   │   ├── CompareSlider.tsx     # react-compare-slider wrapper (LR vs SR tiles)
│   │   ├── ConfidenceOverlay.tsx # Toggleable heatmap layer + opacity slider
│   │   ├── TileMapView.tsx       # MapLibre tile-based deep zoom/pan
│   │   ├── MetricsPanel.tsx      # PSNR/SSIM/LPIPS or NIQE fallback
│   │   ├── ProvenancePanel.tsx   # Source sensor, date, product ID, model version
│   │   ├── ExportActions.tsx     # Download GeoTIFF/PNG/PDF/Push-to-pipeline
│   │   └── FeedbackTool.tsx      # "Flag this region" bbox drawing (stretch)
│   ├── pipeline/
│   │   ├── ContractDisplay.tsx   # JSON schema / visual contract definition
│   │   ├── DemoRunner.tsx        # Run example button + step log
│   │   ├── ConsoleLog.tsx        # Step-by-step log display
│   │   └── AdapterModeToggle.tsx # Live vs Mock toggle
│   └── shared/
│       ├── StatusBadge.tsx       # Queued/Tiling/Inferring/Complete/Failed
│       ├── Toast.tsx             # Non-blocking notification
│       └── TabSwitcher.tsx       # Generic tab component
│
├── pages/                        # ← Route-level composition only
│   ├── LandingPage.tsx
│   ├── WorkspacePage.tsx         # Combines upload + catalog + job config
│   ├── JobDashboardPage.tsx
│   ├── ResultViewerPage.tsx
│   └── PipelinePage.tsx
│
├── config/
│   └── env.ts                    # Typed env var access (VITE_API_URL etc.)
│
├── App.tsx                       # Routes + AppShell
├── main.tsx                      # Entry point (unchanged)
└── index.css                     # Tailwind directives (unchanged)
```

---

### File-by-File Plan

#### Core Infrastructure

##### [NEW] `src/config/env.ts`
Typed, validated access to `VITE_API_URL` and `VITE_TILE_SERVER_URL`. Single place teammates change URLs.

##### [NEW] `src/api/types.ts`
TypeScript interfaces mirroring every Pydantic model in `backend/api/schemas.py`:
- `SensorProfile`, `InferenceMode`, `JobStatus` (enums)
- `SceneCreate`, `JobCreate`, `JobStatusResponse`, `ProductMetrics`, `ProductResponse`
- `HealthResponse`, `PipelineSearchResult`, `PipelineSearchParams`
- `SceneSearchParams`, `SceneSummary`
- `WebSocketJobUpdate` (tile progress message shape)

##### [NEW] `src/api/client.ts`
Fetch wrapper with base URL from env, JSON headers, error handling. All endpoints call through this.

##### [NEW] `src/api/endpoints.ts`
One exported function per backend endpoint:
- `getHealth()` → `GET /health`
- `uploadScene(file, metadata)` → `POST /scenes/upload`
- `searchScenes(params)` → `GET /scenes/`
- `getScene(id)` → `GET /scenes/:id`
- `submitJob(config)` → `POST /jobs/`
- `getJobStatus(id)` → `GET /jobs/:id`
- `listJobs()` → `GET /jobs/`
- `cancelJob(id)` → `DELETE /jobs/:id`
- `getProduct(id)` → `GET /products/:id`
- `getDownloadUrl(id, format)` → `GET /products/:id/download`
- `pipelineSearch(params)` → `GET /pipeline/search`
- `pipelineFetch(productId)` → `POST /pipeline/fetch/:id`
- `pipelinePush(productId)` → `POST /pipeline/push/:id`

##### [NEW] `src/api/ws.ts`
WebSocket manager class:
- Connects to `WS /ws/jobs/:jobId`
- Auto-reconnect on disconnect (exponential backoff)
- Typed `onMessage` callback with `WebSocketJobUpdate` shape
- `close()` cleanup

---

#### Hooks Layer

##### [NEW] `src/hooks/useHealth.ts`
`useQuery` polling `GET /health` every 30s. Returns `{ isHealthy, services: { postgres, redis, minio } }`.

##### [NEW] `src/hooks/useScenes.ts`
- `useSearchScenes(params)` — `useQuery` wrapping `searchScenes`
- `useScene(id)` — `useQuery` wrapping `getScene`

##### [NEW] `src/hooks/useFileUpload.ts`
- Computes SHA-256 hash client-side (Web Crypto API)
- `useMutation` wrapping `uploadScene`
- Returns `{ upload, isUploading, progress, sceneId }`

##### [NEW] `src/hooks/useJobs.ts`
- `useSubmitJob()` — `useMutation` wrapping `submitJob`
- `useJobStatus(jobId)` — `useQuery` with polling fallback
- `useJobList()` — `useQuery` for the dashboard listing
- `useCancelJob()` — `useMutation` wrapping `cancelJob`

##### [NEW] `src/hooks/useJobSocket.ts`
- Wraps `src/api/ws.ts` in a React hook
- Returns live `{ tilesComplete, tilesTotal, status }` state
- Auto-connects when jobId changes, cleans up on unmount

##### [NEW] `src/hooks/useProducts.ts`
- `useProduct(id)` — `useQuery` wrapping `getProduct`
- `useDownloadUrl(id, format)` — generates presigned download URL

##### [NEW] `src/hooks/usePipeline.ts`
- `usePipelineSearch(params)` — `useQuery` wrapping `pipelineSearch`
- `usePipelineFetch()` — `useMutation` wrapping `pipelineFetch`
- `usePipelinePush()` — `useMutation` wrapping `pipelinePush`

---

#### Components (all dumb — props in, callbacks out)

Each component listed in the module structure above. Key notes:

- **`CatalogMap`** — initializes MapLibre with a base tile layer, exposes `onAoiDrawn(bbox)` callback. Draw tools for polygon/rectangle.
- **`CompareSlider`** — wraps `react-compare-slider`, accepts `lrTileUrl` and `srTileUrl` props (XYZ tile URLs from titiler).
- **`TileMapView`** — MapLibre instance for deep zoom/pan over tile layers. Accepts `tileUrl` + optional `overlayTileUrl` (confidence) + `overlayOpacity`.
- **`JobTable`** — pure table; receives `Job[]` array, renders status badges and progress. `onViewResult(jobId)` and `onCancel(jobId)` callbacks.
- **`AggregateStats`** — receives `{ activeWorkers, totalTilesProcessed, throughput }` as props.
- **`MetricsPanel`** — receives `ProductMetrics`. Conditionally renders reference metrics (PSNR/SSIM/LPIPS) when available, falls back to NIQE when not.
- **`ContractDisplay`** — renders the Bhoonidhi API contract as a formatted JSON/table view.
- **`DemoRunner`** — orchestrates the search→fetch→enhance→push pipeline demo flow, emitting log entries to `ConsoleLog`.

---

#### Pages (composition only)

##### [MODIFY] `src/pages/LandingPage.tsx`
Compose: Hero text, CTA button → `/enhance`, explainer sections (real data, uncertainty, ISRO integration, limitations note).

##### [NEW] `src/pages/WorkspacePage.tsx` (replaces UploadPage)
Compose: `TabSwitcher` with Tab A (`DropZone` + `FormatValidator`) and Tab B (`CatalogMap` + `CatalogFilters` + `SceneResultList`). Below: `JobConfigForm`. Submit calls `useSubmitJob` → navigates to `/jobs`.

##### [MODIFY] `src/pages/JobDashboardPage.tsx`
Compose: `AggregateStats` at top, `JobTable` below. Each row uses `useJobSocket` for live progress. Click completed → navigate to result.

##### [MODIFY] `src/pages/ResultViewerPage.tsx`
Compose: Left main area = `TileMapView` with `CompareSlider` or toggle + `ConfidenceOverlay`. Right sidebar = `ProvenancePanel` + `MetricsPanel` + `ExportActions`. Optional: `FeedbackTool`.

##### [MODIFY] `src/pages/PipelinePage.tsx`
Compose: `AdapterModeToggle` + `ContractDisplay` + `DemoRunner` with `ConsoleLog`.

##### [MODIFY] `src/App.tsx`
Wrap routes in `AppShell` (with `NavBar` + health indicator). Update routes: rename `/enhance` route to use `WorkspacePage`.

---

## Verification Plan

### Automated
```bash
cd frontend && npx tsc --noEmit
```
TypeScript compilation must pass with zero errors — this validates all type contracts are consistent.

### Manual
- `npm run dev` starts without errors
- All routes render their component composition
- No runtime console errors
- Teammate can change a single `fetch` call in `src/api/endpoints.ts` to point at a real backend and everything flows through

> [!IMPORTANT]
> **This plan creates ~40 files.** Every file is typed, documented with JSDoc comments explaining what backend endpoint it maps to, and structured so a teammate can `ctrl+click` from a page → hook → endpoint → type and understand the full data flow without reading any other file.

> [!NOTE]
> **Tailwind is kept** since it's already configured in the project. The styling will be minimal — just structural padding/margins and basic border/bg for panel delineation. No animations, no gradients, no glassmorphism. Pure architecture.
