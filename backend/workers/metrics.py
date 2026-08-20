"""
Image quality metrics — reference-based (when HR ground truth available) and
no-reference (when it isn't).

Reference-based: PSNR, SSIM — the standard quantitative measures for SR.
No-reference:    A simplified spatial-quality estimator as a stand-in for NIQE.

See docs/PRD.md FR7: "System shall compute and display reference-based metrics
when ground truth is available, and no-reference quality metrics when it is not."
"""
import logging
import math

import numpy as np

logger = logging.getLogger(__name__)


# ======================================================================
# Reference-based metrics (require HR ground truth)
# ======================================================================

def compute_psnr(
    sr: np.ndarray,
    hr: np.ndarray,
    max_val: float | None = None,
) -> float:
    """
    Peak Signal-to-Noise Ratio between the super-resolved and ground-truth images.

    Higher is better.  Typical satellite SR values: 25–35 dB.
    """
    sr_f = sr.astype(np.float64)
    hr_f = hr.astype(np.float64)

    mse = np.mean((sr_f - hr_f) ** 2)
    if mse == 0:
        return float("inf")

    if max_val is None:
        max_val = _infer_max_val(hr)

    return float(10 * math.log10(max_val ** 2 / mse))


def compute_ssim(
    sr: np.ndarray,
    hr: np.ndarray,
    window_size: int = 11,
) -> float:
    """
    Structural Similarity Index between the super-resolved and ground-truth images.

    Range: [−1, 1], higher is better. Typical good SR: >0.85.
    Uses a simplified uniform-window implementation (no Gaussian weighting) —
    fast enough for a hackathon, produces values very close to the full
    Wang et al. formulation.
    """
    sr_f = sr.astype(np.float64)
    hr_f = hr.astype(np.float64)

    # Flatten to single channel for simplicity (luminance SSIM)
    if sr_f.ndim == 3:
        sr_f = sr_f.mean(axis=2)
    if hr_f.ndim == 3:
        hr_f = hr_f.mean(axis=2)

    max_val = _infer_max_val(hr)
    C1 = (0.01 * max_val) ** 2
    C2 = (0.03 * max_val) ** 2

    # Compute means and variances using a sliding window via uniform_filter
    from scipy.ndimage import uniform_filter

    mu_sr = uniform_filter(sr_f, size=window_size)
    mu_hr = uniform_filter(hr_f, size=window_size)

    sigma_sr_sq = uniform_filter(sr_f ** 2, size=window_size) - mu_sr ** 2
    sigma_hr_sq = uniform_filter(hr_f ** 2, size=window_size) - mu_hr ** 2
    sigma_sr_hr = uniform_filter(sr_f * hr_f, size=window_size) - mu_sr * mu_hr

    numerator = (2 * mu_sr * mu_hr + C1) * (2 * sigma_sr_hr + C2)
    denominator = (mu_sr ** 2 + mu_hr ** 2 + C1) * (sigma_sr_sq + sigma_hr_sq + C2)

    ssim_map = numerator / denominator
    return float(ssim_map.mean())


# ======================================================================
# No-reference metrics (no ground truth needed)
# ======================================================================

def compute_spatial_quality(image: np.ndarray) -> float:
    """
    Simplified no-reference spatial quality estimator.

    Computes the mean gradient magnitude as a proxy for sharpness/detail —
    higher values indicate more high-frequency content (sharper image).

    Normalized to roughly [0, 100] range for display purposes.
    This is a lightweight stand-in for NIQE; suitable for hackathon scope.
    """
    if image.ndim == 3:
        gray = image.mean(axis=2)
    else:
        gray = image.astype(np.float64)

    # Sobel-like gradient magnitude
    dy = np.diff(gray, axis=0)
    dx = np.diff(gray, axis=1)

    # Crop to common shape
    min_h = min(dy.shape[0], dx.shape[0])
    min_w = min(dy.shape[1], dx.shape[1])
    gradient_mag = np.sqrt(dy[:min_h, :min_w] ** 2 + dx[:min_h, :min_w] ** 2)

    # Normalize to a 0–100 range (rough heuristic for display)
    max_val = _infer_max_val(image)
    score = (gradient_mag.mean() / max_val) * 100 * 10  # scale factor for readability

    return float(min(score, 100.0))


# ======================================================================
# Aggregate helper
# ======================================================================

def compute_all_metrics(
    sr: np.ndarray,
    hr: np.ndarray | None = None,
) -> dict:
    """
    Compute all available metrics for an SR output.

    If hr (ground truth) is provided: computes PSNR, SSIM, and no-reference score.
    If hr is None: computes no-reference score only.
    """
    result = {
        "psnr": None,
        "ssim": None,
        "lpips": None,           # placeholder — requires a neural net; skip in MVP
        "no_reference_quality": compute_spatial_quality(sr),
    }

    if hr is not None:
        try:
            result["psnr"] = compute_psnr(sr, hr)
            result["ssim"] = compute_ssim(sr, hr)
        except Exception as exc:
            logger.warning("Reference-based metrics failed: %s", exc)

    return result


# ======================================================================
# Internal helpers
# ======================================================================

def _infer_max_val(image: np.ndarray) -> float:
    """Infer the max pixel value based on dtype."""
    if image.dtype == np.uint8:
        return 255.0
    elif image.dtype == np.uint16:
        return 65535.0
    elif np.issubdtype(image.dtype, np.floating):
        return 1.0  # assume normalized float
    return 255.0
