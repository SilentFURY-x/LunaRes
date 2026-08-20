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
"""


class UncertaintyEstimator:
    def __init__(self, strategy: str = "mc_dropout"):
        self.strategy = strategy

    def estimate(self, lr_tile, sr_tile):
        """
        Returns a per-pixel confidence raster, same spatial dims as sr_tile,
        values normalized to [0, 1] where 1 = high confidence.
        """
        raise NotImplementedError
