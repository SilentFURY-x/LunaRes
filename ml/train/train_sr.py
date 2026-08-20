"""
Training loop skeleton for the SR model. Fill in dataset loading and the model
architecture import once ml/data has produced real tile pairs.

Usage:
    python train_sr.py --config configs/lunar_fast.yaml
"""
import argparse


def train(config_path: str):
    # TODO:
    #   1. Load config (yaml)
    #   2. Build Dataset/DataLoader over ml/data/processed/tiles/{lr,hr}
    #      (use albumentations for augmentation — keep it radiometrically
    #      realistic, don't apply augmentations that break physical plausibility)
    #   3. Build model (see backend/models/sr_model.py for the inference-time
    #      counterpart this training run should produce weights for)
    #   4. Standard train loop: forward, loss (L1 + adversarial, or diffusion
    #      loss for the high-fidelity stretch model), backward, optimizer step
    #   5. Validate each epoch: PSNR/SSIM against held-out real OHRC ground truth
    #      (see ml/eval/metrics.py)
    #   6. Checkpoint best weights -> used by backend/models/sr_model.py at inference
    raise NotImplementedError


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    train(args.config)
