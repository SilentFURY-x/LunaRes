# Model weights

LunaRes stores completed checkpoints through Git LFS. Download any checkpoint
not yet present from the
[shared Google Drive folder](https://drive.google.com/drive/folders/1wmWoJ2gYrbt6Fqkyr3x8oS-cvFEfCic1)
and place it in this directory with the exact name below:

| Engine | Filename | Required |
| --- | --- | --- |
| LunaFormer-Lunar | `lunaformer-lunar.pt` | Primary model when available |
| HAT | `net_g_5000_hat.pth` | For HAT selection |
| SwinIR | `net_g_20000_swinir.pth` | For SwinIR selection |
| Real-ESRGAN | `net_g_15000_realesrgan.pth` | Optional perceptual mode |

The Drive IDs and expected byte sizes are recorded in `model_manifest.json` so
operators can verify they selected the intended files. Checkpoints are tracked
as LFS objects and mounted read-only at `/models` by Docker Compose.

External learned models fail clearly when their checkpoint is absent. The
LunaFormer-Lunar development path retains the project's previous bicubic
fallback, and Bicubic is also available as an explicit baseline.

PyTorch checkpoints can contain executable serialized data. Only install files
from a source you trust.
