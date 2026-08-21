"""
Inference-time wrapper around the trained SR model(s). Training code (and the
actual architecture definition) lives in ../../ml/train — this module just loads
trained weights and exposes a clean predict() call for the Celery worker.

Includes a bicubic upscale fallback so the full pipeline works end-to-end
before ML training produces real weights — the model is a drop-in swap later.
"""
import logging
from pathlib import Path

import numpy as np
from PIL import Image

from api.config import settings

logger = logging.getLogger(__name__)


class SRModel:
    """
    Super-resolution model wrapper.

    Loads trained PyTorch weights if available; otherwise falls back to
    high-quality bicubic upscaling so the end-to-end pipeline can be
    tested and demoed without trained weights.
    """

    def __init__(
        self,
        weights_path: str | None = None,
        mode: str = "fast",
        scale_factor: int | None = None,
    ):
        """
        mode: "fast"          → Real-ESRGAN/SwinIR-style regression model (default)
              "high_fidelity" → diffusion-based refinement (stretch goal)
        """
        self.weights_path = Path(weights_path) if weights_path else None
        self.mode = mode
        self.scale_factor = scale_factor or settings.sr_scale_factor
        self.model = None
        self.using_fallback = True
        self.version = settings.model_version

        self._load_model()

    def _load_model(self) -> None:
        """Attempt to load trained weights; fall back to bicubic if unavailable."""
        if self.weights_path and self.weights_path.exists():
            try:
                import torch
                self.model = torch.load(
                    self.weights_path,
                    map_location="cpu",
                    weights_only=False,
                )
                if hasattr(self.model, "eval"):
                    self.model.eval()
                self.using_fallback = False
                logger.info("Loaded SR model from %s (mode=%s)", self.weights_path, self.mode)
                return
            except Exception as exc:
                logger.warning("Failed to load SR model weights: %s — using bicubic fallback", exc)

        self.using_fallback = True
        logger.info(
            "SR model weights not found at %s — using bicubic upscale fallback (scale=%dx)",
            self.weights_path,
            self.scale_factor,
        )

    def predict(self, lr_tile: np.ndarray) -> np.ndarray:
        """
        Enhance a low-resolution tile.

        lr_tile: numpy array (H, W) or (H, W, C), any dtype.
                 Radiometrically calibrated, NOT 8-bit-clamped (per PRD NFR).
        Returns: sr_tile, same channel count, upscaled by self.scale_factor.
        """
        if not self.using_fallback and self.model is not None:
            return self._predict_pytorch(lr_tile)
        return self._predict_bicubic(lr_tile)

    def _predict_pytorch(self, lr_tile: np.ndarray) -> np.ndarray:
        """Run inference through the loaded PyTorch model."""
        try:
            import torch

            original_dtype = lr_tile.dtype

            # Normalize to float32 [0, 1]
            tile_f = lr_tile.astype(np.float32)
            max_val = _get_max_val(original_dtype)
            tile_f = tile_f / max_val

            # (H, W, C) → (1, C, H, W) for PyTorch
            if tile_f.ndim == 2:
                tile_f = tile_f[np.newaxis, np.newaxis, :, :]  # (1, 1, H, W)
            else:
                tile_f = np.transpose(tile_f, (2, 0, 1))[np.newaxis, :, :, :]

            tensor = torch.from_numpy(tile_f)
            with torch.no_grad():
                output = self.model(tensor)

            sr = output.squeeze(0).cpu().numpy()

            # (C, H, W) → (H, W, C)
            if sr.ndim == 3 and sr.shape[0] <= 4:
                sr = np.transpose(sr, (1, 2, 0))

            # Denormalize and clamp
            sr = np.clip(sr * max_val, 0, max_val).astype(original_dtype)
            return sr

        except Exception as exc:
            logger.warning("PyTorch inference failed: %s — falling back to bicubic", exc)
            return self._predict_bicubic(lr_tile)

    def _predict_bicubic(self, lr_tile: np.ndarray) -> np.ndarray:
        """
        High-quality bicubic upscale fallback.

        Preserves the original dtype and value range — no premature 8-bit
        conversion (PRD NFR: "Never silently discard radiometric precision").
        """
        h, w = lr_tile.shape[:2]
        new_h, new_w = h * self.scale_factor, w * self.scale_factor
        original_dtype = lr_tile.dtype

        if lr_tile.ndim == 2:
            # Single-channel: use PIL directly
            pil_img = Image.fromarray(lr_tile)
            resized = pil_img.resize((new_w, new_h), Image.BICUBIC)
            return np.array(resized).astype(original_dtype)

        # Multi-channel: upscale each channel independently to preserve dtype
        channels = lr_tile.shape[2]
        result = np.zeros((new_h, new_w, channels), dtype=original_dtype)
        for c in range(channels):
            ch = lr_tile[:, :, c]
            pil_ch = Image.fromarray(ch)
            resized_ch = pil_ch.resize((new_w, new_h), Image.BICUBIC)
            result[:, :, c] = np.array(resized_ch).astype(original_dtype)

        return result


# ======================================================================
# Module-level singleton factory
# ======================================================================

_model_cache: dict[str, SRModel] = {}


def get_sr_model(mode: str = "fast") -> SRModel:
    """
    Get or create a cached SR model instance.

    Caches models by mode so we don't reload weights on every tile.
    """
    if mode not in _model_cache:
        weights = (
            settings.sr_model_weights_path
            if mode == "fast"
            else settings.sr_model_weights_path  # stretch: separate weights path
        )
        _model_cache[mode] = SRModel(weights_path=weights, mode=mode)
    return _model_cache[mode]


def _get_max_val(dtype) -> float:
    """Infer max pixel value from numpy dtype."""
    if dtype == np.uint8:
        return 255.0
    elif dtype == np.uint16:
        return 65535.0
    elif np.issubdtype(dtype, np.floating):
        return 1.0
    return 255.0
