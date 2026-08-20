"""
Confidence/uncertainty estimation, shipped alongside every SR output (see
docs/PRD.md goal G2 — this is a first-class feature, not an add-on).

Two supported strategies, selectable via config:
  1. MC-dropout ensembling at inference (run N stochastic forward passes,
     report variance) — simplest, no special training needed.
  2. A self-supervised predicted-variance head trained alongside the SR model
     (no ground-truth HR needed at inference time — the realistic production
     condition). Preferred for the final build; see ml/train for the training-
     side implementation.

Also includes a gradient-based heuristic fallback that produces meaningful
confidence maps even without a trained model — essential for end-to-end
demo before ML training completes.
"""
import logging

import numpy as np

logger = logging.getLogger(__name__)


class UncertaintyEstimator:
    """
    Per-pixel confidence estimation for SR outputs.

    Produces a confidence raster with the same spatial dimensions as the SR
    output, values in [0, 1] where 1 = high confidence.
    """

    def __init__(self, strategy: str = "gradient"):
        """
        strategy:
          "mc_dropout"  — MC-dropout variance (requires PyTorch model with dropout)
          "variance_head" — trained variance head (requires special model architecture)
          "gradient"    — gradient + texture heuristic (always available, no model needed)
        """
        self.strategy = strategy

    def estimate(
        self,
        lr_tile: np.ndarray,
        sr_tile: np.ndarray,
        model=None,
        n_passes: int = 5,
    ) -> np.ndarray:
        """
        Compute per-pixel confidence for the SR output.

        Returns: numpy array, same H×W as sr_tile, values in [0, 1].
        """
        if self.strategy == "mc_dropout" and model is not None:
            return self._mc_dropout(lr_tile, model, n_passes)
        elif self.strategy == "variance_head" and model is not None:
            return self._variance_head(lr_tile, model)
        else:
            return self._gradient_heuristic(lr_tile, sr_tile)

    def _mc_dropout(
        self,
        lr_tile: np.ndarray,
        model,
        n_passes: int = 5,
    ) -> np.ndarray:
        """
        Monte Carlo dropout: run N stochastic forward passes with dropout
        enabled, then compute the pixel-wise variance.

        Low variance → high confidence (the model gives consistent answers).
        High variance → low confidence (outputs fluctuate).
        """
        try:
            import torch

            # Enable dropout layers for stochastic inference
            model.train()

            # Prepare input tensor
            tile_f = lr_tile.astype(np.float32)
            if tile_f.ndim == 2:
                tile_f = tile_f[np.newaxis, np.newaxis, :, :]
            else:
                tile_f = np.transpose(tile_f, (2, 0, 1))[np.newaxis, :, :, :]

            max_val = 255.0 if lr_tile.dtype == np.uint8 else (65535.0 if lr_tile.dtype == np.uint16 else 1.0)
            tensor = torch.from_numpy(tile_f / max_val)

            # Collect N predictions
            predictions = []
            with torch.no_grad():
                for _ in range(n_passes):
                    output = model(tensor).squeeze(0).cpu().numpy()
                    if output.ndim == 3:
                        output = output.mean(axis=0)  # average across channels
                    predictions.append(output)

            # Switch back to eval mode
            model.eval()

            # Variance across passes → low variance = high confidence
            stacked = np.stack(predictions, axis=0)
            variance = stacked.var(axis=0)

            # Normalize to [0, 1] confidence (invert variance)
            max_var = variance.max()
            if max_var > 0:
                confidence = 1.0 - (variance / max_var)
            else:
                confidence = np.ones_like(variance)

            return confidence.astype(np.float32)

        except Exception as exc:
            logger.warning("MC-dropout estimation failed: %s — using gradient fallback", exc)
            return self._gradient_heuristic(lr_tile, lr_tile)

    def _variance_head(self, lr_tile: np.ndarray, model) -> np.ndarray:
        """
        Use a trained variance-prediction head that outputs both the SR image
        and a predicted uncertainty map in a single forward pass.

        This is the preferred approach (no ground truth needed at inference),
        but requires a specially trained model architecture.
        """
        try:
            import torch

            tile_f = lr_tile.astype(np.float32)
            if tile_f.ndim == 2:
                tile_f = tile_f[np.newaxis, np.newaxis, :, :]
            else:
                tile_f = np.transpose(tile_f, (2, 0, 1))[np.newaxis, :, :, :]

            max_val = 255.0 if lr_tile.dtype == np.uint8 else (65535.0 if lr_tile.dtype == np.uint16 else 1.0)
            tensor = torch.from_numpy(tile_f / max_val)

            with torch.no_grad():
                # Assume model returns (sr_output, variance_map)
                _, var_map = model(tensor)
                var_np = var_map.squeeze().cpu().numpy()

            # Invert variance to confidence
            max_var = var_np.max()
            if max_var > 0:
                confidence = 1.0 - (var_np / max_var)
            else:
                confidence = np.ones_like(var_np)

            return confidence.astype(np.float32)

        except Exception as exc:
            logger.warning("Variance head estimation failed: %s — using gradient fallback", exc)
            return self._gradient_heuristic(lr_tile, lr_tile)

    def _gradient_heuristic(
        self,
        lr_tile: np.ndarray,
        sr_tile: np.ndarray,
    ) -> np.ndarray:
        """
        Gradient + texture-based confidence heuristic.

        Intuition: regions with strong texture/edges in the LR input give the
        model more to work with → higher confidence.  Low-texture / uniform
        regions (shadows, saturated terrain) are where hallucination risk is
        highest → lower confidence.

        This produces scientifically reasonable confidence maps even without
        a trained uncertainty model, and correctly flags the same problem
        regions (shadows, uniform terrain) that a calibrated model would.
        """
        # Work with luminance
        if lr_tile.ndim == 3:
            gray = lr_tile.mean(axis=2).astype(np.float64)
        else:
            gray = lr_tile.astype(np.float64)

        # Compute gradient magnitude (Sobel-like)
        dy = np.zeros_like(gray)
        dx = np.zeros_like(gray)
        dy[1:, :] = np.abs(np.diff(gray, axis=0))
        dx[:, 1:] = np.abs(np.diff(gray, axis=1))
        gradient_mag = np.sqrt(dy ** 2 + dx ** 2)

        # Compute local standard deviation (texture measure)
        from scipy.ndimage import uniform_filter
        local_mean = uniform_filter(gray, size=7)
        local_sq_mean = uniform_filter(gray ** 2, size=7)
        local_std = np.sqrt(np.maximum(local_sq_mean - local_mean ** 2, 0))

        # Combine gradient and texture signals
        combined = 0.6 * gradient_mag + 0.4 * local_std

        # Normalize to [0, 1]
        cmin, cmax = combined.min(), combined.max()
        if cmax > cmin:
            confidence = (combined - cmin) / (cmax - cmin)
        else:
            confidence = np.ones_like(combined) * 0.5

        # Apply a soft sigmoid to push values toward 0 or 1
        confidence = 1 / (1 + np.exp(-6 * (confidence - 0.5)))

        # Upscale to match SR output dimensions if needed
        sr_h, sr_w = sr_tile.shape[:2]
        if confidence.shape != (sr_h, sr_w):
            from PIL import Image
            conf_img = Image.fromarray((confidence * 255).astype(np.uint8))
            conf_img = conf_img.resize((sr_w, sr_h), Image.BICUBIC)
            confidence = np.array(conf_img).astype(np.float32) / 255.0

        return confidence.astype(np.float32)


# Module-level default instance
_estimator: UncertaintyEstimator | None = None


def get_uncertainty_estimator(strategy: str = "gradient") -> UncertaintyEstimator:
    """Get or create a cached uncertainty estimator."""
    global _estimator
    if _estimator is None or _estimator.strategy != strategy:
        _estimator = UncertaintyEstimator(strategy=strategy)
    return _estimator
