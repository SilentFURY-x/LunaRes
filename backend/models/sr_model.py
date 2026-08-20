"""
Inference-time wrapper around the trained SR model(s). Training code (and the
actual architecture definition) lives in ../../ml/train — this module just loads
trained weights and exposes a clean predict() call for the Celery worker.
"""
from pathlib import Path


class SRModel:
    def __init__(self, weights_path: str, mode: str = "fast"):
        """
        mode: "fast" -> Real-ESRGAN/SwinIR-style regression model (default)
              "high_fidelity" -> diffusion-based refinement (stretch goal)
        """
        self.weights_path = Path(weights_path)
        self.mode = mode
        self.model = None  # TODO: load with torch.load once ml/train produces weights

    def predict(self, lr_tile):
        """
        lr_tile: numpy array (H, W, C), radiometrically calibrated, NOT 8-bit-clamped.
        Returns: sr_tile, same channel count, upscaled by the trained factor (4x default).
        """
        raise NotImplementedError("Load trained weights from ml/train before calling predict()")
