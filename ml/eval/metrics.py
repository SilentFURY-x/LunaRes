"""
Quality metrics for SR outputs. Both reference-based (need HR ground truth)
and no-reference (don't) variants — see README.md for when to use each.
"""
import numpy as np
from skimage.metrics import peak_signal_noise_ratio, structural_similarity


def psnr(sr: np.ndarray, hr: np.ndarray) -> float:
    return float(peak_signal_noise_ratio(hr, sr, data_range=hr.max() - hr.min()))


def ssim(sr: np.ndarray, hr: np.ndarray) -> float:
    return float(structural_similarity(hr, sr, data_range=hr.max() - hr.min()))


def lpips_score(sr: np.ndarray, hr: np.ndarray) -> float:
    """
    Perceptual similarity via LPIPS. Requires the `lpips` package and a
    pretrained backbone (downloaded on first use) — expects normalized
    [-1, 1] 3-channel tensors, so single-channel panchromatic input needs
    channel replication first.
    """
    raise NotImplementedError("Wire up lpips.LPIPS() model here")


def no_reference_quality(sr: np.ndarray) -> float:
    """
    No-reference quality score (e.g., NIQE) for use when no HR ground truth
    exists — the realistic production condition for most real-world inputs.
    """
    raise NotImplementedError("Wire up a no-reference IQA model (e.g., NIQE) here")
