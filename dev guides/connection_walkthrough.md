# LunaRes Frontend — Architecture Build Walkthrough

## What Was Built

A fully modular, scalable frontend architecture in **42 files** across 4 clean layers. Every file compiles with zero TypeScript errors. Minimal design (padding/margins/borders only), maximum system design.

## Architecture Layers

```
Page (composition only)
  └─ imports → Component (dumb, props/callbacks)
                └─ imported by Page via → Hook (React Query wrapper)
                                            └─ calls → Endpoint function
                                                         └─ uses → API Client
                                                                     └─ reads → Config (env.ts)
```

### Layer 1: Core Infrastructure (`src/api/` + `src/config/`)

| File | Purpose |
|---|---|
| [`env.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/config/env.ts) | Single place to change API/tile server URLs |
| [`types.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/api/types.ts) | **THE contract** — mirrors every Pydantic model in backend |
| [`client.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/api/client.ts) | Fetch wrapper with error handling, auth header slot |
| [`endpoints.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/api/endpoints.ts) | One function per backend route — the only file that knows URL paths |
| [`ws.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/api/ws.ts) | WebSocket manager with auto-reconnect/backoff |

### Layer 2: Hooks (`src/hooks/`)

| File | Backend Endpoint(s) |
|---|---|
| [`useHealth.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/hooks/useHealth.ts) | `GET /health` (30s polling) |
| [`useScenes.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/hooks/useScenes.ts) | `GET /scenes/`, `GET /scenes/:id` |
| [`useFileUpload.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/hooks/useFileUpload.ts) | `POST /scenes/upload` + client-side SHA-256 |
| [`useJobs.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/hooks/useJobs.ts) | `POST /jobs/`, `GET /jobs/:id`, `GET /jobs/`, `DELETE /jobs/:id`, `GET /jobs/stats` |
| [`useJobSocket.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/hooks/useJobSocket.ts) | `WS /ws/jobs/:jobId` |
| [`useProducts.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/hooks/useProducts.ts) | `GET /products/:id`, `GET /products/:id/download` |
| [`usePipeline.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/hooks/usePipeline.ts) | `GET /pipeline/search`, `POST /pipeline/fetch/:id`, `POST /pipeline/push/:id` |

### Layer 3: Components (`src/components/`)

**27 components** organized by feature area:
- `layout/` — NavBar + AppShell
- `upload/` — DropZone + FileHasher + FormatValidator
- `catalog/` — CatalogMap (MapLibre) + CatalogFilters + SceneResultList
- `job/` — JobConfigForm + AggregateStats + StatusBadge + JobProgressBar + BatchJobRow + JobTable
- `viewer/` — TileMapView + CompareSlider + ConfidenceOverlay + MetricsPanel + ProvenancePanel + ExportActions + FeedbackTool
- `pipeline/` — ContractDisplay + AdapterModeToggle + ConsoleLog + DemoRunner
- `shared/` — TabSwitcher + Toast

### Layer 4: Pages (`src/pages/`)

| Page | Route | Composes |
|---|---|---|
| [`LandingPage`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/pages/LandingPage.tsx) | `/` | Hero, CTA, explainers, limitations, attribution |
| [`WorkspacePage`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/pages/WorkspacePage.tsx) | `/workspace` | TabSwitcher → DropZone / CatalogMap+Filters+ResultList → JobConfigForm |
| [`JobDashboardPage`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/pages/JobDashboardPage.tsx) | `/jobs` | AggregateStats + JobTable |
| [`ResultViewerPage`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/pages/ResultViewerPage.tsx) | `/jobs/:jobId/result/:sceneId` | CompareSlider / TileMapView + ConfidenceOverlay + MetricsPanel + ProvenancePanel + ExportActions + FeedbackTool |
| [`PipelinePage`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/pages/PipelinePage.tsx) | `/pipeline` | AdapterModeToggle + ContractDisplay + DemoRunner |

---

## How Teammates Connect to Backend

### Step 1: Set the URL
Edit [`frontend/.env`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/.env.example):
```
VITE_API_URL=http://localhost:8000
VITE_TILE_SERVER_URL=http://localhost:8001
```

### Step 2: Implement backend endpoints
The frontend expects these endpoints (already defined as stubs in `backend/api/routers/`):
- Scenes: `POST /scenes/upload`, `GET /scenes/`, `GET /scenes/:id`
- Jobs: `POST /jobs/`, `GET /jobs/`, `GET /jobs/:id`, `DELETE /jobs/:id`, `GET /jobs/stats`
- Products: `GET /products/:id`, `GET /products/by-job/:jobId/scene/:sceneId`, `GET /products/:id/download?format=...`
- Pipeline: `GET /pipeline/search`, `POST /pipeline/fetch/:id`, `POST /pipeline/push/:id`
- WebSocket: `WS /ws/jobs/:jobId`
- Health: `GET /health`

The **exact response shapes** are in [`src/api/types.ts`](file:///c:/Users/Aritra%20Ghosh/Desktop/Innohack/LunaRes/frontend/src/api/types.ts).

### Step 3: No frontend changes needed
Once the backend returns the shapes defined in `types.ts`, everything flows through automatically: `endpoint → hook → component → page`.

---

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run dev` | ✅ Running on :5173 |
| All 42 files compile | ✅ |
| Old `UploadPage.tsx` removed | ✅ |
