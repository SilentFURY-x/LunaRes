# Product Requirements Document (PRD)
## LunaRes — AI Framework for Satellite & Planetary Image Enhancement
**Problem Statement Reference:** AIML-03 · Satellite Image Enhancement for Space Research
**SDG Alignment:** SDG 9 (Industry, Innovation & Infrastructure) · SDG 13 (Climate Action)

---

## 1. Executive Summary

Low-resolution satellite and planetary imagery is the norm, not the exception — wide-swath sensors trade spatial detail for coverage, and high-resolution sensors trade coverage for detail. Scientists analyzing lunar terrain, landing-site hazards, glacier retreat, or land-use change are routinely stuck interpreting coarse pixels because the fine-resolution sensor never imaged that exact spot at that exact time.

**LunaRes** is an end-to-end AI framework that takes a low-resolution satellite/planetary image and reconstructs a scientifically-trustworthy high-resolution version of it — not just a sharper-looking one. The system is built around three things most hackathon SR projects skip: (1) training on **real** paired low/high-resolution imagery from ISRO's own Chandrayaan-2 mission rather than synthetic bicubic fakes, (2) an **uncertainty/confidence map** shipped alongside every output so a scientist knows which enhanced pixels to trust, and (3) an architecture that speaks the same data language (GeoTIFF/COG, ISRO's Bhoonidhi API contract) as ISRO's actual distribution pipeline, so "integration" is a real design decision, not a slide.

---

## 2. Problem Statement (as given)

> Create an AI framework to enhance low-resolution satellite images for better analysis of lunar and planetary surfaces.
> **Expectations:** Integration with ISRO pipelines · Improved resolution · Scalable.

## 3. Goals

| # | Goal | Why it matters for judging |
|---|---|---|
| G1 | Reconstruct high-resolution imagery from low-resolution lunar/planetary/Earth-observation input | Core deliverable, directly answers "Improved resolution" |
| G2 | Quantify and visualize *where the model is guessing* vs. *where it's confident* | Distinguishes a scientific tool from a generic photo-upscaler — this is the single biggest technical differentiator available |
| G3 | Provide an ISRO-pipeline-compatible ingestion/egress layer (Bhoonidhi API contract, GeoTIFF/COG in and out) | Directly answers "Integration with ISRO pipelines" |
| G4 | Design for horizontal scale — batch processing of scenes, not just single-image demos | Directly answers "Scalable" |
| G5 | Ship a usable, map-based web interface a non-ML scientist could operate | Judges are scored on demo usability as much as model metrics |
| G6 | Prove the enhancement is *useful*, not just prettier, via a downstream task (e.g., crater/feature detection accuracy before vs. after) | Strongest possible evidence of real-world value; most competing teams will stop at "looks sharper" |

## 4. Non-Goals (explicitly out of scope for the hackathon build)

- Operational, ISRO-approved production deployment (we build the *adapter/contract*, not a live government integration)
- Full-globe, all-sensor coverage — MVP targets 2–3 sensor pairs (see Data Sources doc), architecture generalizes to more
- Real-time video/streaming satellite feeds
- Full radiometric/atmospheric correction pipeline (we assume reasonably calibrated input; note this as a documented limitation, not silently ignore it)

## 5. Target Users / Personas

1. **Planetary/remote-sensing scientist** — wants higher-resolution imagery of a region to identify features (craters, landslides, potential landing hazards, coastline change) without waiting for a high-res sensor tasking.
2. **ISRO/NRSC pipeline operator** — wants a service that accepts standard data products and returns enhanced products in the same standard format, batch-callable.
3. **Disaster-response / policy analyst** (SDG 13 angle) — wants to see glacier, coastline, or flood-extent change more clearly from archival coarse imagery.
4. **Hackathon judge** — wants to see technical depth, a working demo, and evidence the team understood the *real* constraints of the domain (this persona matters as much as the other three — design the demo for them explicitly).

## 6. Key Features

### MVP (must-have, demoable in the hackathon window)
- **F1 — Upload/select input image**: file upload (GeoTIFF/PNG/JPEG/PDS `.IMG`) or map-based AOI selection against a connected catalog.
- **F2 — Super-resolution inference**: 4x (minimum) resolution enhancement via a trained model, selectable sensor/domain profile (lunar / Earth-optical / SAR).
- **F3 — Before/after comparison viewer**: synchronized pan/zoom slider comparison, tile-based so large images don't crash the browser.
- **F4 — Confidence/uncertainty overlay**: heatmap layer showing per-pixel reconstruction confidence, toggleable over the output.
- **F5 — Export**: download enhanced output as GeoTIFF (georeferenced) and PNG (quicklook), plus a metadata/report file (source, model version, quality metrics).
- **F6 — Batch job mode**: submit multiple scenes/tiles as one job, track progress, retrieve as a set — this is what makes G4 (scalable) demonstrable rather than asserted.
- **F7 — ISRO pipeline adapter demo**: a documented API endpoint matching Bhoonidhi's request/response contract, with a live or recorded example of pulling a product in and pushing an enhanced product out.

### Stretch (build if time remains, ranked by judge-impact per hour of effort)
- **S1 — Downstream task delta demo**: run a simple crater/edge/feature detector on the LR image vs. the SR output and show the accuracy/count improvement — turns "looks better" into "measurably better."
- **S2 — Diffusion-based refinement mode**: swap in a diffusion-based upscaler (e.g., a ResShift/one-step-diffusion-style model) as a "high fidelity, slower" mode alongside the fast GAN-based mode — shows breadth of technical understanding, and pairs naturally with S3.
- **S3 — Elevation-aware refinement**: fuse LOLA/LRO DEM data as an auxiliary input so shadow/relief cues stay physically consistent in the enhanced output — a genuinely novel angle almost no other team will have time to attempt.
- **S4 — Human-in-the-loop correction**: let a scientist flag a bad reconstruction region; log it for future fine-tuning — demonstrates you're building a *framework*, not a one-shot script.
- **S5 — Lightweight/distilled edge model**: a distilled, low-latency variant of the model for resource-constrained/on-orbit-adjacent scenarios, benchmarked against the full model — directly evidences "Scalable" with numbers.
- **S6 — Auto-generated PDF report** per enhanced product with quality metrics, provenance, and confidence summary — professional geospatial-deliverable feel.

## 7. Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | System shall accept input images in GeoTIFF, PNG/JPEG, and PDS3/PDS4 (`.IMG`+label) formats |
| FR2 | System shall run inference asynchronously via a job queue and expose job status |
| FR3 | System shall tile large inputs before inference and seamlessly re-mosaic outputs (feather-blended at tile boundaries) |
| FR4 | System shall output a per-pixel or per-tile confidence/uncertainty map alongside every enhanced image |
| FR5 | System shall preserve and propagate georeferencing metadata (CRS, GSD, acquisition time, sensor ID) from input to output |
| FR6 | System shall expose a REST API mirroring Bhoonidhi's search/fetch/order pattern for pipeline integration |
| FR7 | System shall compute and display reference-based metrics (PSNR/SSIM/LPIPS) when ground truth is available, and no-reference quality metrics (e.g., NIQE) when it is not |
| FR8 | System shall support batch submission of N scenes as a single trackable job |
| FR9 | Web UI shall render large rasters via tiled zoom/pan (not full-resolution client-side load) |

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Single-tile (512×512) inference under ~3s on GPU for the fast model path; batch throughput logged and reported |
| Scalability | Inference workers horizontally scalable behind a queue; stateless API layer |
| Reliability | Failed tiles/jobs retry with backoff; partial batch failure doesn't lose completed tiles |
| Data integrity | Never silently discard radiometric precision (no premature 8-bit conversion) |
| Explainability | Every output ships with model version, training-data provenance, and confidence metrics — no black-box output |
| Security | API keys/auth for pipeline integration endpoints; signed URLs for object storage access |
| Accessibility | Web UI usable by a non-ML domain scientist with no training |

## 9. Success Metrics (how you'll defend this to judges)

- Quantitative: PSNR/SSIM/LPIPS on held-out real TMC-2/OHRC pairs (not just synthetic pairs) — real-pair metrics are more credible and rarer.
- Quantitative: downstream task metric delta (e.g., feature-detection recall before/after enhancement).
- Qualitative: confidence map correctly flags known-hard regions (shadows, saturated/low-texture terrain) as low-confidence — a calibration sanity check you can show live.
- System: demonstrated batch job of 5+ tiles processed end-to-end through the pipeline adapter in the live demo.

## 10. Risks & Assumptions

| Risk | Mitigation |
|---|---|
| PRADAN/Bhoonidhi account approval delayed during hackathon | Start registration on Day 0/Hour 0; fall back to open Sentinel/Landsat/Kaggle benchmark data (see Data Sources doc) for pipeline development in parallel |
| Large raw files (multi-GB) blow up hackathon compute/storage | Work with cropped tiles from the start; use COG format; don't download full mission archives |
| Real LR/HR pairs are imperfectly co-registered (parallax, time-gap) | Budget time for a registration/alignment step (feature-matching + warp) before training; treat this as a first-class pipeline stage, not an afterthought |
| Diffusion-based refinement (stretch) hallucinates plausible-but-wrong detail | This is exactly why G2 (uncertainty quantification) exists — ship it as a first-class feature, not a footnote, and be explicit in the demo about the model's known failure modes |
| Team underestimates frontend tiling complexity for large rasters | Scope F3/F9 early; use an existing library (OpenLayers/Leaflet + COG tile endpoint) rather than building a custom viewer |

## 11. Suggested Milestones (map to your actual hackathon duration — see WorkingPlan.md for an hour-by-hour version)

1. Data pipeline: fetch + register + tile a real TMC-2/OHRC pair → working LR/HR dataset
2. Baseline model trained and producing visibly improved output on held-out tiles
3. Backend API + job queue + storage wired to the model
4. Frontend: upload/AOI select → job status → before/after viewer
5. Confidence map integrated end-to-end
6. ISRO pipeline adapter endpoint + documented contract
7. Stretch features, polish, metrics dashboard, report generation
8. Demo script rehearsed against a real (not cherry-picked-only) example, plus one clearly-labeled failure case to show scientific honesty
