# External super-resolution models

## Integration design

LunaFormer-Lunar remains the default and primary engine. HAT and SwinIR are
benchmark engines; Real-ESRGAN is an optional perceptual mode; Bicubic is the
non-ML baseline. The API accepts an explicit `sr_model` value and records the
selected engine and detected checkpoint architecture in each product report.

The implementation uses the permissively licensed `spandrel` checkpoint loader
to identify and construct HAT, SwinIR, and RRDBNet/Real-ESRGAN networks. This
keeps LunaRes's adapter small and avoids copying the ISRO reference repository's
top-level pipeline, which does not publish a repository-wide license.

For panchromatic input, a three-channel checkpoint receives three identical
channels. Its output is converted back to luminance so the output keeps the
source band count. Integer radiometric ranges (`uint8` and `uint16`) are
restored after inference. HAT and SwinIR edge tiles are padded to a compatible
attention-window size and cropped before mosaic blending.

## Reference checkpoints

The filenames and integration conventions were reviewed against
[`somnathjena2011/ISRO`](https://github.com/somnathjena2011/ISRO). The checkpoints
originate in the owner's
[Google Drive folder](https://drive.google.com/drive/folders/1wmWoJ2gYrbt6Fqkyr3x8oS-cvFEfCic1)
and completed downloads are stored as Git LFS objects. See
[`models/README.md`](../models/README.md) for placement.

## Attribution and licenses

- HAT: [XPixelGroup/HAT](https://github.com/XPixelGroup/HAT), MIT License,
  copyright Xiangyu Chen (2022).
- SwinIR: [JingyunLiang/SwinIR](https://github.com/JingyunLiang/SwinIR),
  Apache License 2.0, SwinIR Authors (2021).
- Real-ESRGAN: [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN),
  BSD 3-Clause License, Xintao Wang (2021).
- Spandrel: [chaiNNer-org/spandrel](https://github.com/chaiNNer-org/spandrel),
  MIT License, The ChaiNNer Organization (2024).

Checkpoint licensing can differ from architecture-code licensing. Confirm the
weight owner's terms before redistribution or commercial use.

## Scientific-use note

Real-ESRGAN optimizes perceptual appearance and can synthesize plausible
texture. Treat its output as visualization unless it is independently
validated for the downstream measurement. LunaFormer-Lunar, HAT, and SwinIR
outputs should also be compared against held-out OHRC ground truth before
making quantitative surface claims.
