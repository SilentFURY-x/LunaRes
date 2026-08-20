# ml/train

Model training. Depends on tile pairs produced by `../data/pair_tmc_ohrc.py`
(real pairs) and optionally `../data/synthetic_pairs.py` (synthetic augmentation
for sensors without a natural high-res counterpart).

- `train_sr.py` — trains the fast/default SR model (Real-ESRGAN/SwinIR-style).
- `train_uncertainty.py` — trains the self-supervised predicted-variance head
  alongside (or on top of) the SR model, per docs/Architecture.md section 3.4.
- `configs/` — training hyperparameters per sensor profile (lunar/earth/sar).

Recommended: get the loop running end-to-end on a small fallback dataset
(Kaggle SR benchmark or similar) before your real TMC-2/OHRC tiles are ready —
see docs/WorkingPlan.md Phase 2.
