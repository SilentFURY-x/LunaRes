# ml/data

Dataset preparation. Nothing here trains a model — this is purely: raw source
files in, clean aligned LR/HR tile pairs out, in Cloud-Optimized GeoTIFF.

## Scripts

- `pds_to_cog.py` — normalize any PDS3/PDS4 (`.IMG` + `.LBL`/`.XML`) or raw
  GeoTIFF input into a consistent, radiometrically-preserved (16-bit/float32)
  Cloud-Optimized GeoTIFF. Run this on every raw download before anything else
  touches it.
- `pair_tmc_ohrc.py` — find overlapping footprints between TMC-2 (low-res) and
  OHRC (high-res) scenes, co-register them, and crop into aligned LR/HR tile
  pairs. This produces the real (not synthetic) training pairs that are this
  project's core differentiator — see docs/DataSources.md section 1.
- `synthetic_pairs.py` — for sensors without a natural high-res counterpart
  (e.g., most Earth-observation sources), generate realistic LR/HR pairs via
  randomized degradation (blur + noise + resize + compression) applied to a
  single high-res source, following the Real-ESRGAN practical degradation
  approach. Use only as a supplement to real pairs, not a replacement.

## Data locations (see docs/DataSources.md for full detail)

- Raw downloads: `ml/data/raw/` (gitignored — never commit imagery)
- Normalized COGs: `ml/data/processed/cog/` (gitignored)
- Final aligned tile pairs: `ml/data/processed/tiles/{lr,hr}/` (gitignored)
