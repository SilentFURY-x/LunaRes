"""
Find overlapping TMC-2 (low-res, ~5m/px) and OHRC (high-res, ~0.25m/px) scene
footprints, co-register them, and crop matching LR/HR tile pairs.

This is the highest-leverage script in the whole project — see
docs/DataSources.md section 1 for why real paired data matters, and
docs/WorkingPlan.md phase 1 for where this sits in the build order.

Approach (fill in each step):
  1. Read footprint geometry for each candidate TMC-2 and OHRC scene
     (from PDS4 label/XML metadata — bounding polygon in lunar body-fixed coords).
  2. Compute geometric intersection between TMC-2 and OHRC footprints
     (shapely) to find overlapping pairs.
  3. For each overlapping pair, co-register precisely: either use SPICE
     kernels for exact geometric reprojection, or a feature-matching +
     homography/warp approach (e.g., ORB/SIFT keypoints + RANSAC) if SPICE
     tooling isn't feasible in the hackathon window.
  4. Crop matching tiles at a fixed LR size (e.g., 128x128) and the
     corresponding HR region at the true scale ratio (~15-20x for TMC-2/OHRC).
  5. Write tile pairs to ml/data/processed/tiles/{lr,hr}/ as COG.

Reference approach for step 1-2 (footprint intersection): see the open-source
prior art at github.com/sankn123/Super-Resolution-ISRO-Chandrayaan-2 — study
the method, write your own implementation.
"""
import argparse


def find_overlapping_pairs(tmc2_dir: str, ohrc_dir: str):
    raise NotImplementedError("Implement footprint intersection — see module docstring")


def coregister_and_crop(tmc2_scene_path: str, ohrc_scene_path: str, output_dir: str):
    raise NotImplementedError("Implement co-registration + tile cropping — see module docstring")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tmc2-dir", required=True)
    parser.add_argument("--ohrc-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    pairs = find_overlapping_pairs(args.tmc2_dir, args.ohrc_dir)
    for tmc2_path, ohrc_path in pairs:
        coregister_and_crop(tmc2_path, ohrc_path, args.output_dir)
