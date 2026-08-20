# ml/eval

Evaluation metrics, used both during training (validation) and by the backend
worker at inference time (backend/workers/tasks.py step 6) to attach quality
scores to every product.

- Reference-based (PSNR/SSIM/LPIPS): use when real HR ground truth is
  available — i.e., on held-out real TMC-2/OHRC pairs. This is your strongest
  evidence for judges, since it's measured against real, not synthetic, ground
  truth.
- No-reference (e.g., NIQE): use in the realistic production case where no HR
  ground truth exists for the input being enhanced.
