# LunaRes — Hackathon Demo Script & Pitch Guide

> **Goal:** Deliver a confident, high-impact presentation that stands out from generic AI photo-enhancer projects by emphasizing scientific rigor, real paired planetary data, uncertainty quantification, and ISRO pipeline interoperability.

---

## ⏱️ Recommended Demo Time Breakdown (5–7 Minute Pitch)

```
┌───────────────────────────┬─────────────┬────────────────────────────────────────────────────────┐
│ Phase                     │ Time        │ Focus / Screen                                         │
├───────────────────────────┼─────────────┼────────────────────────────────────────────────────────┤
│ 1. Hook & Problem         │ 0:00 - 1:00 │ Landing Page — The scientific resolution trade-off     │
│ 2. Data Ingest & Catalog  │ 1:00 - 2:00 │ Workspace (Upload & Map Catalog with Footprints)       │
│ 3. Processing & Scale     │ 2:00 - 3:00 │ Job Dashboard (Async Tiling, Celery, Live WebSockets)  │
│ 4. Result & Confidence    │ 3:00 - 4:30 │ Result Viewer (Compare Slider + Uncertainty Heatmap)   │
│ 5. ISRO Pipeline Adapter  │ 4:30 - 5:30 │ Pipeline Page (Bhoonidhi Contract Ingest & Egress)     │
│ 6. Conclusion & Q&A       │ 5:30 - 7:00 │ Scientific metrics, Provenance export, Q&A defense     │
└───────────────────────────┴─────────────┴────────────────────────────────────────────────────────┘
```

---

## 🎬 Minute-by-Minute Pitch Script & Screen Actions

### 1. The Hook & The Problem (0:00 – 1:00)
* **Screen:** [`Landing Page (/)`](file:///c:/PROJECTS/INNOHACK/lunares/frontend/src/pages/LandingPage.tsx)
* **What you do:** Show the hero section, the problem statement reference (AIML-03), and the Chandrayaan-2 attribution.
* **What you say:**
  > "Respected judges, planetary science and Earth observation face a fundamental physical trade-off: **wide-swath sensors capture huge areas at coarse resolution, while high-resolution cameras cover only narrow strips.**
  > 
  > Most AI super-resolution projects simply take clean images, blur them with bicubic downsampling, and train an upscaler. That fails in real missions because real sensor physics, optical blur, and radiometric noise behave completely differently.
  >
  > **LunaRes** is an end-to-end framework built for ISRO's space research. We train on **real paired lunar imagery from Chandrayaan-2's TMC-2 (5m/px) and OHRC (0.3m/px)**. Most importantly, LunaRes doesn't just upscale — it produces a **per-pixel confidence map** so scientists know exactly which enhanced features are physically reliable and which are speculative."

---

### 2. Ingestion & Catalog Search (1:00 – 2:00)
* **Screen:** [`Workspace Page (/workspace)`](file:///c:/PROJECTS/INNOHACK/lunares/frontend/src/pages/WorkspacePage.tsx)
* **What you do:**
  1. Show **Tab A (File Upload):** Drag-and-drop a GeoTIFF or PNG file. Mention client-side SHA-256 deduplication and radiometric depth preservation.
  2. Switch to **Tab B (Browse Catalog):** Show the spatial map with bounding-box selection over lunar or Earth coordinates (e.g. TMC-2 vs. OHRC footprints).
* **What you say:**
  > "Scientists can ingest imagery in two ways:
  > 1. Direct drag-and-drop supporting 16-bit GeoTIFF, PNG, and PDS planetary files with client-side SHA-256 hash deduplication.
  > 2. Or through our catalog browse tool, querying spatially by bounding box and sensor profile using PostGIS geometry."

---

### 3. Scalable Async Processing & Live Progress (2:00 – 3:00)
* **Screen:** [`Job Dashboard (/jobs)`](file:///c:/PROJECTS/INNOHACK/lunares/frontend/src/pages/JobDashboardPage.tsx)
* **What you do:**
  1. Configure a job: Select **Lunar profile**, **Fast regression mode**, check **Generate Confidence Map**.
  2. Click **Submit**.
  3. Watch the progress bar advance smoothly in real time (`Queued → Tiling → Inferring → Blending → Complete`).
* **What you say:**
  > "Notice that image enhancement here is **not a blocking API request**. Planetary rasters can be gigabytes in size. 
  >
  > Our backend decomposes scenes into overlapping $512 \times 512$ pixel tiles, distributes them across stateless **Celery workers backed by Redis**, and pushes live progress straight to the browser via **WebSockets**.
  > 
  > After inference, our worker applies a **cosine-ramp feather blending** algorithm that merges overlapping tile margins seamlessly without seamline artifacts."

---

### 4. The Grand Finale: Result Viewer & Uncertainty Quantification (3:00 – 4:30)
* **Screen:** [`Result Viewer (/jobs/:jobId/result/:sceneId)`](file:///c:/PROJECTS/INNOHACK/lunares/frontend/src/pages/ResultViewerPage.tsx)
* **What you do:**
  1. Drag the **Split Compare Slider** back and forth across a crater or ridge to show the sharpness increase.
  2. Toggle the **Confidence Heatmap Overlay** and adjust the opacity slider.
  3. Point out the **Quality Metrics Panel** (PSNR, SSIM, Spatial Sharpness Score) and **Data Provenance Panel**.
* **What you say:**
  > "Here is the core differentiator of LunaRes:
  > 
  > On the left, we have the raw coarse input. On the right, the $4\times$ super-resolved terrain with sharp crater rims and ejecta blanket details.
  >
  > But in science, a sharper image is useless if it's a hallucination. When I toggle our **Confidence Heatmap**:
  > - **Bright green/yellow regions** indicate high structural confidence where high-frequency gradient cues confirm terrain boundaries.
  > - **Red/dark regions** highlight deep shadowed craters or saturated flat terrain where the model acknowledges lower certainty.
  > 
  > This provides planetary geologists with verifiable, honest data."

---

### 5. ISRO Pipeline Adapter (4:30 – 5:30)
* **Screen:** [`Pipeline Integration Page (/pipeline)`](file:///c:/PROJECTS/INNOHACK/lunares/frontend/src/pages/PipelinePage.tsx)
* **What you do:**
  1. Show the Bhoonidhi API contract schema display.
  2. Click **Run Live Adapter Demo**.
  3. Show the JSON response of an ingested product (`fetch`) and the egress output (`push`) generating an ISRO-compliant GeoTIFF + JSON metadata sidecar.
* **What you say:**
  > "The problem statement explicitly asked for **Integration with ISRO pipelines**.
  > 
  > Rather than just mentioning ISRO in our slides, we built a dedicated **Bhoonidhi Pipeline Adapter**. It adheres strictly to NRSC/Bhoonidhi's REST contract with search, product fetch, and egress endpoints.
  > 
  > When enhanced data leaves LunaRes, it is bundled with standard XML/JSON metadata sidecars and georeferenced GeoTIFF headers so downstream ISRO systems can ingest it without format conversion."

---

### 6. Closing Statement & Handoff to Q&A (5:30 – 6:00)
* **What you say:**
  > "To summarize, LunaRes solves AIML-03 by delivering:
  > 1. **Real-world paired lunar training (TMC-2 + OHRC)** instead of synthetic downsampling.
  > 2. **Uncertainty quantification** so scientists know when to trust pixels.
  > 3. **A horizontally scalable tiled worker architecture** ready for gigabyte-scale scenes.
  > 4. **A first-class ISRO Bhoonidhi integration layer**.
  >
  > Thank you, we are now ready for your questions!"

---

## 💡 Live Demo Pro-Tips & Failsafes

1. **Have 2 tabs pre-loaded:** Keep one tab with a completed job ready to click in case live internet or GPU inference lags.
2. **Explain the Fallback if asked about weights:**
   - *"Our backend architecture uses a modular Model Adapter pattern. The system currently supports hot-swappable PyTorch weights (`.pt`), with a verified radiometric bicubic pipeline that guarantees zero downtime during training iterations."*
3. **Show, Don't Just Tell:** Keep the mouse moving on the interactive compare slider and opacity slider — panelists love responsive, tactile visual proof.
