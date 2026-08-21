# Vendored external inference code

These files are vendored for reproducible inference with the lunar checkpoints
reviewed in `somnathjena2011/ISRO`. Only the model architecture, inference
entrypoint, required helper code, and original license are included.

| Directory | Upstream source | Pinned revision | License |
| --- | --- | --- | --- |
| `hat/` | `XPixelGroup/HAT` (the ISRO repository's HAT gitlink) | `64a98f991f79ddf260cfe0a050e99a19e52d0267` | MIT |
| `swinir/` | `somnathjena2011/ISRO/MSR_SWINIR` | tree `2644d8040a836d47e8dbead959f8a7ffa625ce28` | MIT |
| `realesrgan/` | `somnathjena2011/ISRO/ESRGAN` | tree `c983b293ccf63559fe9242b1717383bd3a349138` | BSD-3-Clause |

The containing ISRO reference commit is
`5d27f724b905f55ad5190a96c45bacfe3b378074`. Original license files are kept in
each directory. Do not remove them when updating vendored code.
