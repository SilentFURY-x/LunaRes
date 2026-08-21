# App Flow.md
## LunaRes — User & System Flows

---

## 1. Primary User Journey: Scientist Enhances a Scene

```
1. Landing page
   → "Enhance an image" CTA
   → Quick explainer: what the tool does, what data it was trained on,
     and an honest note on limitations (builds credibility with judges/scientists)

2. Input selection screen (two tabs)
   Tab A: "Upload file" — drag-and-drop GeoTIFF/PNG/JPEG/PDS .IMG
   Tab B: "Browse catalog" — map view, draw/select AOI, filter by sensor
          (Lunar TMC-2 / OHRC · Landsat · Sentinel), date range → results
          list with thumbnails pulled via the ISRO pipeline adapter or
          cached catalog

3. Job configuration screen
   - Select model profile: Lunar / Earth-optical / SAR (auto-suggested
     from input metadata, user can override)
   - Select mode: Fast (regression model) vs High-fidelity (diffusion,
     stretch) — with a one-line tradeoff explanation shown inline
   - Toggle: generate confidence map (default ON)
   - Toggle: run downstream feature-detection comparison (stretch)
   - "Submit" → job created, user routed to dashboard

4. Job dashboard
   - List of jobs with status: Queued → Tiling → Inferring → Blending →
     Complete / Failed / Cancelled
   - Live progress via WebSocket (WS /ws/jobs/{job_id}) — streams
     tile completion count in real-time, no polling needed
   - Tiles completed / total shown as a progress bar with percentage
   - Click a completed job → Result viewer

5. Result viewer (the centerpiece screen)
   - Split-pane / swipe-slider: Low-res input ↔ Enhanced output
   - Layer toggle: Confidence heatmap overlay (opacity slider)
   - Zoom/pan is tile-based — smooth even on large scenes
   - Side panel: metrics (PSNR/SSIM/LPIPS if ground truth available,
     no-reference quality score otherwise), model version, source
     provenance (sensor, acquisition date, ISRO/NASA product ID)
   - If downstream-task comparison was enabled: a small before/after
     count or accuracy delta ("14 additional candidate boulders
     detected post-enhancement," for example)
   - Actions: Download GeoTIFF · Download PNG quicklook · Download PDF
     report · Send to pipeline adapter (egress demo)

6. Report screen / download
   - Auto-generated PDF: thumbnails, metrics, provenance, confidence
     summary, model + data-source acknowledgement text
```

---

## 2. Secondary Flow: ISRO Pipeline Integration Demo

```
1. "Pipeline" tab (separate from the main scientist-facing UI — this
   screen is aimed at the judge/pipeline-operator persona)
2. Shows the adapter's documented request contract (search / fetch /
   order shape matching Bhoonidhi's own API)
3. "Run live example" button:
   - Calls the adapter (live if API access was granted, mock otherwise
     — clearly labeled either way, don't pretend a mock is live)
   - Displays the fetched product, then the job triggered automatically
   - Displays the enhanced product pushed back out in ISRO-compatible
     format (GeoTIFF + metadata sidecar)
4. This flow exists specifically to make "Integration with ISRO
   pipelines" a demonstrated capability rather than a claim in a slide
```

---

## 3. Secondary Flow: Batch Processing (Scalability Demo)

```
1. From catalog browse (2B above), multi-select several scenes/tiles
   instead of one
2. Single job configuration applies to the whole batch
3. Dashboard shows per-item progress within the batch and an
   aggregate throughput stat (tiles/minute) — worth literally showing
   this number increase live if you spin up a second worker during
   the demo
4. Batch results downloadable as a single zip or individually
```

---

## 4. Secondary Flow: Human-in-the-Loop Feedback (Stretch)

```
1. In the Result viewer, a "Flag this region" tool lets the scientist
   draw a box over a reconstruction they don't trust and leave a note
2. Flag is stored (linked to scene + job + region) in the feedback table
3. Admin/ML screen lists flagged regions — framed as the seed of a
   continual-improvement loop, i.e., evidence this is a framework, not
   a one-off script
```

---

## 5. Screen Inventory Summary

| Screen | Purpose | Priority |
|---|---|---|
| Landing | Orient the user, set expectations, credibility | MVP |
| Input selection (upload / catalog) | Get an image into the system | MVP |
| Job configuration | Choose model/mode/options | MVP |
| Job dashboard | Track async processing, prove scalability | MVP |
| Result viewer | Core value delivery — before/after + confidence | MVP |
| Report / download | Deliverable artifact, professional polish | MVP |
| Pipeline integration demo | Prove ISRO-pipeline claim | MVP (simplified) / Stretch (polished) |
| Batch multi-select | Prove scale | MVP (basic) / Stretch (rich dashboard) |
| Feedback / flagging | Framework-not-script narrative | Stretch |
| Admin/model dashboard (metrics over time, active model versions) | Ops maturity narrative | Stretch |

---

## 6. Demo Script Recommendation (for the pitch itself)

Given how this is judged, sequence your live demo to match the flow above but weight time like this: **30% on the result viewer with confidence overlay toggled live** (this is your differentiator, dwell on it), **20% on showing a genuine failure case with honest confidence-map commentary** (scientific credibility beats a cherry-picked perfect result), **20% on the batch/scalability dashboard**, **20% on the pipeline adapter contract**, **10% on the downstream-task delta if built**. Do not spend the majority of your demo time narrating architecture slides — show the running system.
