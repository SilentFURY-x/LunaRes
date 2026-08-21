# LunaRes — Master Technical Defense & Study Guide

This guide contains everything you need to understand, explain, and defend every component of the **LunaRes** project in front of hackathon judges and technical panelists.

---

## 📑 Table of Contents
1. [Executive Overview & Problem Context](#1-executive-overview--problem-context)
2. [Understanding "The Model & Adding Weights"](#2-understanding-the-model--adding-weights)
3. [End-to-End Data Processing Pipeline (Step-by-Step)](#3-end-to-end-data-processing-pipeline-step-by-step)
4. [Deep-Dive into the Tech Stack & Architectural Decisions](#4-deep-dive-into-the-tech-stack--architectural-decisions)
5. [The Core Differentiators](#5-the-core-differentiators)
6. [ISRO Pipeline Integration (Bhoonidhi Adapter)](#6-isro-pipeline-integration-bhoonidhi-adapter)
7. [Mathematical & Algorithmic Concepts](#7-mathematical--algorithmic-concepts)
8. [Panelist Q&A Defense Battlecard (Tough Questions & Model Answers)](#8-panelist-qa-defense-battlecard)

---

## 1. Executive Overview & Problem Context

* **Problem Statement Reference:** AIML-03 (Satellite Image Enhancement for Space Research).
* **Core Mandate:** Create an AI framework to enhance low-resolution satellite and planetary imagery with improved resolution, scalability, and ISRO pipeline integration.
* **The Fundamental Remote Sensing Dilemma:**
  - **Wide-swath sensors** (e.g. TMC-2 at $5\text{ m/px}$, AWiFS at $56\text{ m/px}$) cover huge geographical areas but lack fine surface detail.
  - **High-resolution sensors** (e.g. OHRC at $0.25\text{–}0.3\text{ m/px}$, Cartosat) cover only narrow, targeted swaths ($3\text{ km}$ nadir).
  - **LunaRes Solution:** A scientific super-resolution framework that transforms coarse imagery into high-resolution products paired with **per-pixel uncertainty maps** so scientists know when to trust enhanced features.

---

## 2. Understanding "The Model & Adding Weights"

### What does "Adding the Weights" mean?
In Deep Learning, a model architecture (the Python code defining neural layers) is just an empty skeleton until it is populated with **trained weights** (the learned mathematical parameters saved as a `.pt` or `.pth` file via PyTorch).

1. **How ML Training Works (`ml/train/train_sr.py`):**
   - The ML model (such as a Real-ESRGAN / SwinIR / RRDBNet backbone) is trained on paired tiles of low-res input (TMC-2) and ground-truth high-res (OHRC).
   - Training minimizes a combined loss function:
     $$\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{L1}} + \lambda_{\text{adv}}\mathcal{L}_{\text{adversarial}} + \lambda_{\text{percep}}\mathcal{L}_{\text{perceptual}}$$
   - When training achieves optimal PSNR/SSIM on the validation set, PyTorch saves the model state dictionary:
     `torch.save(model.state_dict(), "sr_fast_v1.pt")`

2. **How the Backend Uses the Weights (`backend/models/sr_model.py`):**
   - In `backend/api/config.py`, the setting `SR_MODEL_WEIGHTS_PATH` points to the file location (e.g., `/models/sr_fast_v1.pt`).
   - When the backend initializes:
     ```python
     if self.weights_path and self.weights_path.exists():
         self.model = torch.load(self.weights_path, map_location="cpu")
         self.model.eval()
         self.using_fallback = False
     ```
   - **The Graceful Fallback System:**
     If weights haven't been copied to the disk yet, the backend **does not crash**. It automatically activates a high-precision, radiometric bicubic upscale engine and gradient-texture confidence estimator. This allows the full end-to-end frontend/backend/worker stack to run seamlessly during development.
   - **Hot-Swapping Weights:**
     As soon as the ML team finishes training and drops `sr_fast_v1.pt` into the path, the backend immediately loads it with zero code refactoring needed.

---

## 3. End-to-End Data Processing Pipeline (Step-by-Step)

Here is exactly how an image moves through the system from raw upload to finished product:

```
[User / Bhoonidhi] ──► Upload GeoTIFF/PNG
                             │
                             ▼
                    [FastAPI Gateway]
                             │ 1. Compute SHA-256 Hash (Deduplication)
                             │ 2. Extract Geospatial Metadata (Rasterio)
                             │ 3. Store raw raster in MinIO/S3
                             │ 4. Register Scene in PostGIS DB
                             ▼
                    [Job Dispatcher] ──► Enqueue task to Redis
                             │
                             ▼
                    [Celery Inference Worker]
                             │
                             ├─► Stage 1: Download raster from MinIO
                             ├─► Stage 2: Tiling Engine (compute 512x512 grid + 64px overlap)
                             ├─► Stage 3: Batch Inference (SR Model on each tile)
                             ├─► Stage 4: Uncertainty Estimation (Confidence Heatmap)
                             ├─► Stage 5: Feather Blending (Cosine-ramp mosaic assembly)
                             ├─► Stage 6: Quality Metrics (PSNR, SSIM, Spatial Sharpness)
                             ├─► Stage 7: Save GeoTIFFs & JSON Report to MinIO/S3
                             └─► Stage 8: Create Product record & mark Job Complete
                             │
                             ▼
                    [WebSocket Streamer] ──► Live progress pushed to React Dashboard
                             │
                             ▼
                    [Result Viewer] ──► Tiled before/after slider + Confidence Overlay
```

---

## 4. Deep-Dive into the Tech Stack & Architectural Decisions

| Layer | Technology | Why We Chose It (Panelist Justification) |
|---|---|---|
| **API Gateway** | **FastAPI (Python 3.11)** | Native async performance, same language as PyTorch/Rasterio (zero serialization friction), automatic OpenAPI/Swagger interactive docs to showcase the ISRO contract. |
| **Task Queue** | **Celery + Redis** | Heavy geospatial rasters (100MB–2GB) cannot be processed in HTTP request/response loops. Celery decouples ingestion from compute, enabling horizontal worker scaling across GPUs. |
| **Spatial DB** | **PostgreSQL 16 + PostGIS 3.4** | Enables real spatial queries (`ST_Intersects`) over planetary coordinate polygons and bounding boxes. Essential for catalog search and Bhoonidhi AOI queries. |
| **Object Storage** | **MinIO (Local) / AWS S3 (Cloud)** | Industry-standard S3 API with pre-signed, time-limited URLs for secure artifact delivery. Centralized through `StorageService` for seamless cloud migration. |
| **Tile Server** | **Titiler (Dynamic COG Server)** | Serves multi-gigabyte GeoTIFFs as standard XYZ map tiles on-the-fly. Prevents browser memory overflow. |
| **Geospatial Engine** | **Rasterio + GDAL + PyProj** | Direct support for PDS3/PDS4 planetary labels (`.IMG`/`.LBL`), 16-bit radiometric preservation, and CRS coordinate reprojection. |
| **Frontend** | **React + TypeScript + Vite + Tailwind + MapLibre** | Strict type-safety mirroring backend Pydantic models, MapLibre for lunar/Earth map rendering, and smooth before/after comparison sliders. |

---

## 5. The Core Differentiators (Why LunaRes Wins)

### Differentiator 1: Real Paired Planetary Data (ISRO Chandrayaan-2)
* **What competitors do:** Take high-res images, apply synthetic bicubic downsampling, and train standard models.
* **Why that fails:** Real sensor degradation includes point-spread function (PSF) blur, electronic sensor noise, line-jitter, and shadow contrast variations.
* **What LunaRes does:** Exploits overlapping footprints from Chandrayaan-2's **TMC-2 (5m/px)** and **OHRC (0.3m/px)**. This provides true optical pairs with a realistic $\approx 16\times$ resolution delta.

### Differentiator 2: Per-Pixel Uncertainty / Confidence Mapping
* **The Scientific Problem:** Deep neural networks (especially GANs and Diffusion models) can "hallucinate" high-frequency textures (e.g. inventing small craters or rocks that don't exist).
* **The LunaRes Solution:** Every enhanced output ships with an aligned **Confidence Map**:
  - Highlights regions of high confidence (sharp structural edges supported by input gradients).
  - Flags low-confidence regions (e.g., deep shadows, saturated terrain, or ambiguous low-texture patches).
  - Uses MC-Dropout variance / gradient-texture heuristics to quantify uncertainty without needing ground truth at inference time.

### Differentiator 3: Radiometric Depth Preservation
* Standard consumer upscalers convert imagery to 8-bit RGB (values 0–255), destroying dynamic range.
* LunaRes keeps imagery in **16-bit integer or Float32 calibrated radiance/reflectance** throughout the processing pipeline.

---

## 6. ISRO Pipeline Integration (Bhoonidhi Adapter)

The problem statement explicitly requires **Integration with ISRO pipelines**. 

### How Bhoonidhi Works:
ISRO distributes Earth and planetary observation data via the **Bhoonidhi Portal (NRSC)** and **PRADAN (ISSDC)**:
1. **Search:** Queries by Area of Interest (AOI Bounding Box), Date Range, and Sensor (TMC-2, LISS-4, AWiFS).
2. **Fetch:** Orders and downloads standardized data products in PDS or Cloud-Optimized GeoTIFF (COG) format.
3. **Egress:** Enhanced products are packaged with an **XML/JSON metadata sidecar** defining sensor provenance, processing level (Level-2 SR), and spatial CRS.

### How LunaRes Implements This (`backend/adapters/bhoonidhi/`):
* We created an abstract base interface `BhoonidhiAdapter` with two implementations:
  1. `LiveBhoonidhiAdapter`: Connects to Bhoonidhi's REST API using API bearer keys.
  2. `MockBhoonidhiAdapter`: Pre-loaded with realistic Chandrayaan-2 (TMC-2/OHRC) and Resourcesat-2 (LISS-4/AWiFS) catalog footprints.
* The API endpoints (`GET /pipeline/search`, `POST /pipeline/fetch`, `POST /pipeline/push`) mirror Bhoonidhi's schema exactly, proving enterprise-grade interoperability to judges.

---

## 7. Mathematical & Algorithmic Concepts

### A. Cosine-Ramp Feather Blending (`backend/workers/tiling.py`)
To prevent visible grid seams between independently enhanced $512 \times 512$ tiles:
* Adjacent tiles overlap by $64\text{ pixels}$.
* A 2D weighting mask $W(x, y)$ is computed using a 1D cosine ramp:
  $$w(d) = \frac{1}{2}\left(1 - \cos\left(\frac{\pi d}{\text{overlap}}\right)\right)$$
* In overlapping regions, pixel values are normalized by the sum of intersecting weights:
  $$I_{\text{mosaic}}(x, y) = \frac{\sum_k I_k(x, y) \cdot W_k(x, y)}{\sum_k W_k(x, y)}$$

### B. Image Quality Metrics (`backend/workers/metrics.py`)
1. **PSNR (Peak Signal-to-Noise Ratio):**
   $$\text{PSNR} = 10 \cdot \log_{10}\left(\frac{\text{MAX}_I^2}{\text{MSE}}\right)$$
   Measures pixel-level reconstruction accuracy (in dB). Higher is better ($>30\text{ dB}$ is high quality).
2. **SSIM (Structural Similarity Index):**
   $$\text{SSIM}(x, y) = \frac{(2\mu_x\mu_y + C_1)(2\sigma_{xy} + C_2)}{(\mu_x^2 + \mu_y^2 + C_1)(\sigma_x^2 + \sigma_y^2 + C_2)}$$
   Measures luminance, contrast, and structural preservation ($0$ to $1$, $>0.85$ is high fidelity).
3. **No-Reference Spatial Sharpness:**
   Evaluates average gradient magnitude ($\sqrt{\nabla_x^2 + \nabla_y^2}$) across the image when ground-truth HR is unavailable in live deployments.

---

## 8. Panelist Q&A Defense Battlecard

### Q1: "How do you know your AI model isn't hallucinating fake craters or features?"
> **Answer:** *"That is exactly why we built the **Uncertainty Quantification Head**. Super-resolution models inherently carry hallucination risk in low-texture or shadowed zones. LunaRes outputs a synchronized per-pixel confidence map. If the model is guessing in a dark crater floor, the confidence drops to red/low values, alerting geologists not to base navigation or hazard analysis on those specific pixels. Furthermore, our training loss penalizes structural divergence rather than purely optimizing for perceptual sharpness."*

### Q2: "How is your project scalable? What happens if I upload a 10 GB satellite scene?"
> **Answer:** *"Our architecture never loads a raw 10 GB raster into browser memory or a single API process. The FastAPI gateway stores the raw COG in MinIO, while a Celery worker decomposes the scene into a grid of overlapping $512 \times 512$ patches. These patches can be distributed across multiple GPU workers in parallel. The results are assembled via cosine-ramp feather blending into Cloud-Optimized GeoTIFFs (COGs), which our dynamic tile server (Titiler) serves to the web client via on-demand XYZ tiles."*

### Q3: "How does this actually integrate with ISRO? What is Bhoonidhi?"
> **Answer:** *"Bhoonidhi is ISRO NRSC's official geospatial data hub. Rather than building a closed system, we implemented the `BhoonidhiAdapter` pattern matching Bhoonidhi's search, fetch, and order API contracts. When an image is enhanced, our system generates an ISRO-compliant GeoTIFF accompanied by an XML/JSON metadata sidecar specifying the sensor provenance, processing tier (Level-2 SR), and spatial CRS, allowing downstream ISRO mission tools to ingest our outputs without translation."*

### Q4: "Why did you use Chandrayaan-2 TMC-2 and OHRC data?"
> **Answer:** *"In Earth observation, true paired low- and high-resolution data taken at the exact same orbital pass is extremely rare. But Chandrayaan-2 carries both the TMC-2 wide camera (5m/px) and the OHRC narrow camera (0.3m/px). Where their footprints overlap on the lunar surface, ISRO provides genuine optical pairs with true planetary sensor physics, optical aberrations, and illumination conditions. Training on real optical pairs rather than synthetic downsampled images is what makes our model scientifically robust."*

### Q5: "What is the difference between your Fast mode and High-Fidelity mode?"
> **Answer:** *"Fast Mode uses a feedforward regression architecture (like SwinIR / RRDBNet) that processes tiles in sub-second speeds with deterministic outputs and zero stochastic hallucination. High-Fidelity Mode is our stretch diffusion-based refinement path designed for high-value regions of interest where subtle texture restoration is prioritized at the cost of additional compute passes."*
