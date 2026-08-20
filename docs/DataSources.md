# Data Sources & Formats Guide
### Satellite / Planetary Image Enhancement — AIML-03

This is the single most important technical decision in this project, so read this before writing any model code. The problem statement says "lunar and planetary surfaces" — that phrase is your unfair advantage, because unlike Earth-observation super-resolution (where real paired low/high-res data barely exists and everyone fakes it with bicubic downsampling), **ISRO's own lunar missions give you genuinely paired low-res and high-res images of the same terrain, for free.** Almost no other team at your hackathon will realize this. Build your MVP around it.

---

## 1. The core dataset: Chandrayaan-2 TMC-2 + OHRC (real paired LR/HR lunar data)

ISRO's Chandrayaan-2 orbiter carries two cameras that image the *same lunar terrain* at two different resolutions:

| Payload | Role | Ground Sampling Distance | Swath |
|---|---|---|---|
| **TMC-2** (Terrain Mapping Camera-2) | Low-resolution input | ~5 m/pixel (panchromatic) | wide |
| **OHRC** (Orbiter High Resolution Camera) | High-resolution ground truth | ~0.25–0.3 m/pixel | ~3 km (nadir) |

Where TMC-2 and OHRC footprints overlap, you get a **real** (not synthetically downsampled) LR→HR pair at roughly 15–20x scale factor — this is exactly the kind of data serious remote-sensing SR papers wish they had, because true optical degradation, sensor blur, and noise characteristics are baked in, unlike a bicubic-downsampled fake pair.

- **Portal:** ISSDC PRADAN — `https://pradan.issdc.gov.in/ch2/`
- **TMC-2 browse/download:** `https://pradan.issdc.gov.in/ch2/protected/browse.xhtml?id=tmc2`
- **OHRC browse/download:** `https://pradan.issdc.gov.in/ch2/protected/browse.xhtml?id=ohrc`
- **Access:** free registration on PRADAN (Indian Space Science Data Centre). Data is released without lock-in period.
- **Format delivered:** PDS3/PDS4 — an `.IMG` (or `.QUB`) raw raster file + a companion `.LBL`/`.XML` label file with calibration and geometry metadata, plus SPICE kernels (spacecraft position/pointing) if you want to do precise geo-registration.
- **A team has already open-sourced the exact pairing pipeline** for this problem: `github.com/sankn123/Super-Resolution-ISRO-Chandrayaan-2` — they built an intersection-detection script that matches TMC-2 and OHRC footprints and crops matching tiles. You can study this approach (don't copy code verbatim into a hackathon submission, but the *method* — footprint intersection via image geometry, then tile-cropping — is exactly right and you should replicate the idea yourself). This alone should save your team many hours.

**Practical note on volume:** you won't need the whole archive. A few dozen overlapping TMC-2/OHRC scene pairs, tiled into thousands of small patches (e.g., 256×256 LR / 4096×4096 HR aligned patches), is enough for a hackathon-scale training set.

---

## 2. Secondary lunar/planetary source: NASA PDS — LROC (Lunar Reconnaissance Orbiter Camera)

If you want more volume, a second independent lunar sensor, or want to demonstrate cross-mission generalization (great talking point for judges — "our model generalizes across ISRO and NASA sensors"):

- **LROC NAC** (Narrow Angle Camera): 0.5–2.0 m/pixel panchromatic — think of this as another "high-res" tier.
- **LROC WAC** (Wide Angle Camera): 100 m/pixel (visible), 400 m/pixel (UV) — a genuinely low-res tier, giving you an even wider LR→HR gap if you pair WAC with NAC of the same region.
- **Portal:** PDS Imaging Node — `https://pds-imaging.jpl.nasa.gov/volumes/lro.html`, and browse/search UI at `https://lroc.im-ldi.com/data/`
- **Format:** PDS3/PDS4, same `.IMG` + label pattern as above. Fully open, no login required for bulk download.
- Bonus: LRO also has LOLA-derived DEMs (digital elevation models) at 100 m/pixel, freely downloadable — useful for the "elevation-aware refinement" stretch goal described later.

---

## 3. Earth-observation source (for the "ISRO pipeline integration" requirement + SDG 9/13 angle)

The problem statement explicitly rewards **"integration with ISRO pipelines."** The literal, current, real ISRO pipeline for this is:

### Bhoonidhi — ISRO's EO Data Hub (successor/unification point for ISRO's earth-observation distribution)
- **Portal:** `https://bhoonidhi.nrsc.gov.in/`
- <cite index="4-1">It provides access to an extensive archive of Remote Sensing data from 47 satellites, including Indian and foreign remote sensing sensors acquired since 1986, and also facilitates regional distribution of Sentinel and Landsat-8/9 data in India.</cite>
- <cite index="3-1">Users select an area of interest, resolution, date range, and product type, and each search is assigned a Search ID for downloading or ordering open and priced products.</cite>
- <cite index="2-1">A tool on the portal converts datasets into widely used geospatial formats including GeoTIFF, Cloud-Optimized GeoTIFF (COG), and HDF5, and also supports spatial sub-setting by point or polygon.</cite>
- **API access exists**: <cite index="4-1">a Bhoonidhi API has been released, and interested users are asked to contact the Bhoonidhi team for access</cite> — email `bhoonidhi@nrsc.gov.in`. This is your literal "integration with ISRO pipelines" checkbox: architect your backend with a `BhoonidhiAdapter` module that matches this API's contract (see Architecture.md), even if you end up demoing against a mock/cached response because live API approval won't arrive during the hackathon.
- There's also an unofficial open-source CLI, `bhoonidhi-downloader` (`pip install bhoonidhi-downloader`), which authenticates and searches by bounding box/date/satellite — useful for scripted bulk fetch during the hackathon itself.
- **Resolution range on the platform:** <cite index="3-1">datasets span roughly 0.28 m to 1000 m spatial resolution</cite> — meaning you can construct your own LR/HR Earth pairs by picking a coarse product (e.g., AWiFS, 56 m) and a fine product (e.g., LISS-4, 5 m, or Cartosat, sub-metre) over the same area and date.
- **Licensing note:** <cite index="3-1">pricing follows the Indian Space Policy 2023, and some products finer than 5 m are priced even for government-entity users</cite> — for a hackathon, stick to the clearly-open datasets (Landsat-8/9, Sentinel-1/2, coarser IRS products) to avoid procurement friction.

### Alternative / backup Earth sources (fully open, no approval wait — good for hackathon time pressure)
- **USGS EarthExplorer** (`earthexplorer.usgs.gov`) — full open Landsat archive since 1972 + Sentinel-2.
- **Copernicus / ESA Sentinel Hub / EO Browser** — Sentinel-1 SAR and Sentinel-2 multispectral, 10-60 m, instant free access, no approval delay — this is your fastest path to a working pipeline in the first few hours if PRADAN/Bhoonidhi registration is slow.
- **NASA Earthdata** (`earthdata.nasa.gov`) — MODIS, Landsat, and more.

---

## 4. Ready-made benchmark SR datasets (fallback / augmentation, not your headline dataset)

If you're short on time to build your own pairing pipeline, these give you an instant paired dataset to get a baseline model training on day one, while your team builds the real ISRO/NASA pairing pipeline in parallel:

- **WorldStrat** — paired Sentinel-2 (10 m, low-res) and SPOT 6/7 (1.5 m, high-res) imagery, purpose-built for satellite SR.
- **PROBA-V** — a standard multi-image super-resolution benchmark (100 m → 300 m real revisit pairs).
- **SEN2VENµS** — Sentinel-2 paired with VENµS at up to 5 m/pixel, ~133k patches.
- **fMoW + Sentinel-2** — high-res (0.3–1.5 m) fMoW imagery paired via geolocation with coarser Sentinel-2 tiles.
- Kaggle hosts 200+ satellite datasets searchable at `kaggle.com/datasets` (search "satellite super resolution").

Use these to validate your training pipeline works end-to-end before investing hours in ISSDC/Bhoonidhi data wrangling — de-risks your critical path.

---

## 5. What format should you actually train on?

This trips up most teams, so be deliberate:

1. **Never train directly on the raw delivered format.** ISRO/NASA planetary data arrives as PDS3/PDS4 (`.IMG` + `.LBL`/`.XML`), which is a scientific raster format most ML frameworks can't read natively.
2. **Normalize everything to GeoTIFF at ingest time**, using **GDAL/rasterio**, which has native PDS3/PDS4 drivers. This gives you one consistent tensor-friendly format across ISRO, NASA, and Earth-observation sources.
3. **Preserve radiometric depth — don't collapse to 8-bit JPEG.** Keep images as 16-bit (or float32, radiometrically calibrated DN/reflectance values) GeoTIFF. Converting to 8-bit JPEG early destroys the dynamic range and introduces compression artifacts that will masquerade as "signal" to your model — a classic mistake that quietly ruins scientific SR results.
4. **Store the training-ready form as Cloud-Optimized GeoTIFF (COG)** — internally tiled + pyramided, so both your training dataloader and your web app's tile server can randomly access regions/zoom levels without reading the whole multi-GB file. One format serves both training and the product.
5. **Keep georeferencing/metadata attached throughout** (CRS, GSD, acquisition time, sensor ID) — you need this for the "integration with ISRO pipelines" requirement, and for your reports/uncertainty maps to be scientifically meaningful, not just pretty pictures.
6. **Tile before training.** Crop into fixed-size aligned LR/HR patches (e.g., 128×128 LR / 2048×2048 HR for the TMC-2/OHRC pair, adjusting for the true scale ratio at each overlap region) — full scenes are too large and mostly non-textured space/uniform terrain, which wastes training compute.

---

## 6. "Unfiltered raw" — what that really means here, and a licensing note

You asked specifically for *unfiltered raw* images. In this domain that maps to:
- **PDS EDR (Experimental/Engineering Data Record)** level products — these are the least-processed, closest to raw-sensor-output tier available (as opposed to RDR — Reduced Data Records — which are already mosaicked/processed). Both LROC and ISSDC/PRADAN publish EDR-tier data.
- For ISRO data, cite the standard acknowledgement ISSDC requires in any publication/demo: research based on Chandrayaan-2 data archived at ISSDC, with due credit to ISRO — include this on your "About/Data Sources" screen; judges notice attribution done properly, and it's also the actual policy requirement.
