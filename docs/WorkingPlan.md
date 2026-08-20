# Working Plan.md
## LunaRes — Implementation Roadmap & Winning Strategy

---

## 1. Team Role Split (assuming 4–5 people, adjust as needed)

| Role | Owns |
|---|---|
| ML Lead | Model architecture, training loop, uncertainty module, evaluation |
| Data/Geospatial Engineer | PDS→COG normalization, TMC-2/OHRC pairing & registration, catalog integration |
| Backend Engineer | FastAPI, job queue/workers, DB, storage, ISRO pipeline adapter |
| Frontend Engineer | React app, map/AOI picker, tile viewer, dashboard, comparison UI |
| PM / Storyteller (can be doubled up with any of the above) | Demo script, pitch deck, report design, judge Q&A prep |

If you're a smaller team, collapse Data Engineer into ML Lead, and Frontend/Backend can share one person if the frontend stays simple (skip the map picker, keep upload-only for MVP).

---

## 2. Phased Plan (phase-based, not clock-locked — map onto your actual hackathon duration)

### Phase 0 — Setup (do this in the first hour, no exceptions)
- Register for PRADAN/ISSDC access immediately (approval can take time — start the clock now, not later)
- Stand up the repo skeleton + Docker Compose (Postgres, Redis, MinIO) so everyone can start in parallel
- Pull a fallback open dataset (Sentinel-2/Landsat, or a Kaggle SR benchmark) so the ML track isn't blocked waiting on ISRO account approval

### Phase 1 — Data Pipeline (parallel with Phase 2)
- Write the PDS3/PDS4 → COG normalization script (GDAL/rasterio)
- Implement TMC-2/OHRC footprint-intersection + tile-cropping (this is your core differentiator — don't skip or shortcut it)
- Registration/alignment step for imperfectly co-located pairs (feature matching + warp)
- Output: a clean, versioned LR/HR tile dataset ready for training

### Phase 2 — Baseline Model (parallel with Phase 1, using fallback data until Phase 1 lands)
- Stand up training loop with the Real-ESRGAN/SwinIR-style baseline
- Get a model training end-to-end on fallback data first — validate the loop works before your real dataset is ready
- Swap in real TMC-2/OHRC tiles as soon as Phase 1 delivers them; retrain
- Add the uncertainty/confidence head — treat this as MVP scope, not stretch, given how central it is to your differentiation story

### Phase 3 — Backend
- FastAPI skeleton: job submission, status, scene/product endpoints
- Celery worker: tiling → inference → feather-blend mosaic → storage write
- Postgres/PostGIS schema + migrations
- Bhoonidhi-contract adapter — mock implementation first (unblocks frontend + demo regardless of API approval), live implementation if/when access comes through

### Phase 4 — Frontend
- Upload flow first (simplest, unblocks early testing against the real backend)
- Job dashboard with polling
- Tile-based result viewer + before/after slider + confidence overlay toggle
- Map/AOI catalog browse (can be simplified/deferred if time-constrained — upload-only is an acceptable MVP fallback)
- Report/download screen

### Phase 5 — Integration & Metrics
- Wire full flow end-to-end: upload → job → result → download, no mocked joints left in the critical demo path
- Compute and surface PSNR/SSIM/LPIPS on real held-out TMC-2/OHRC pairs — this is your strongest, rarest evidence
- If time allows: downstream feature-detection delta demo (S1) — high judge-impact for moderate effort, prioritize this over further model tuning once results are "good enough"

### Phase 6 — Stretch Features (only after Phase 5's critical path is fully working end-to-end)
Ranked by impact-per-hour — do them in this order if time is limited:
1. Downstream task delta (S1) — cheap to build if you already have a pretrained detector/edge model, very high judge impact
2. Elevation-aware refinement (S3) — novel, but scope tightly (even a simple DEM-as-extra-channel conditioning counts as a demonstrated idea)
3. Distilled lightweight model + latency benchmark (S5) — strong, concrete "Scalable" evidence with real numbers
4. Diffusion high-fidelity mode (S2) — visually impressive but highest implementation risk; only attempt if Phases 1–5 are solid with time to spare
5. Human-in-the-loop feedback (S4) — nice framework narrative, lowest urgency
6. Auto-generated PDF report (S6) — pure polish, do last

### Phase 7 — Demo Prep (reserve real time for this, don't let it get squeezed to zero)
- Rehearse against a real, non-cherry-picked example
- Prepare one clearly-labeled failure case — showing the confidence map correctly flagging it as low-confidence is more persuasive to technical judges than only showing wins
- Prepare a fallback path (pre-recorded video / cached results) in case live GPU inference is slow or the venue wifi is bad — never let your demo depend entirely on a live network call to an external GPU under Wi-Fi you don't control
- One-line answers ready for the two questions judges will definitely ask: "how do you know it's not hallucinating detail?" (→ the confidence map, explain the self-supervised uncertainty approach) and "how does this actually integrate with ISRO?" (→ walk the Bhoonidhi-contract adapter, show the OpenAPI docs)

---

## 3. What Will Actually Make You Stand Out

Ranked by how rare each idea is likely to be among competing teams, and why it matters:

1. **Real paired training data (TMC-2 + OHRC), not synthetic bicubic pairs.** Almost every other SR hackathon project trains on artificially downsampled images because they don't know real paired planetary data exists. This alone is a credible technical edge — say it explicitly in your pitch.
2. **Uncertainty/confidence mapping shipped as a core feature, not an add-on.** Judges (especially any with a science/research background) know that GAN and diffusion super-resolution can hallucinate plausible-looking but false detail — this is a well-known, actively-researched failure mode. A team that visibly addresses it, rather than ignoring it, reads as scientifically mature rather than a generic "AI photo enhancer" clone.
3. **A downstream-task usefulness proof, not just visual comparison.** "Sharper-looking" is subjective; "the model detects 20% more candidate features after enhancement" is a number. Recent remote-sensing SR research explicitly argues the field has over-indexed on visual fidelity and under-indexed on downstream task performance — building this in puts you ahead of the literature's own stated gap.
4. **A real ISRO-pipeline-shaped integration, architected honestly.** Don't fake this — build the actual adapter interface against Bhoonidhi's documented contract, with a mock implementation clearly labeled as such if live access doesn't come through in time. Judges can tell the difference between "we thought about integration" and "we put the word ISRO on a slide."
5. **Elevation-aware / multi-modal refinement**, if you have time — almost nobody will attempt fusing DEM data into single-image SR in a hackathon window, so even a modest version is a genuine novelty point.
6. **Honesty about limitations in the demo.** Showing one real failure case, correctly flagged by your own confidence map, is counter-intuitively one of the strongest trust signals you can give technical judges — it proves the confidence system actually works, rather than being decorative.

---

## 4. Things That Will Quietly Sink You (avoid these)

- Training only on synthetic bicubic-downsampled pairs and calling it "trained on real satellite data" — technical judges will ask, and this is an easy credibility loss.
- Loading a full-resolution multi-gigabyte raster directly in the browser — this will visibly crash or freeze during a live demo. Use the tile server from day one.
- Converting imagery to 8-bit JPEG early in the pipeline — silently caps your achievable quality and shows up as a rookie mistake if a judge inspects your data pipeline.
- Claiming "scalable" with no evidence — have the queue/worker throughput numbers ready to show, even on a small scale.
- Skipping data provenance/acknowledgement — ISSDC has a stated citation requirement for published/derived work; including it correctly is a small thing that signals attention to real-world constraints.
