"""
Raster tiling and mosaic blending engine.

Splits large input rasters into overlapping patches for per-tile inference,
then feather-blends them back into one seamless output mosaic.  The overlap
margin and cosine-ramp blending eliminate seam artifacts at tile boundaries.

See docs/Architecture.md section 3.3 for why tiling is a first-class design
concern rather than an afterthought.
"""
import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class TileInfo:
    """Metadata for one tile extracted from a larger raster."""
    index: int             # sequential tile number
    row: int               # row position in the tile grid
    col: int               # column position in the tile grid
    y_start: int           # start pixel Y in the original image
    x_start: int           # start pixel X in the original image
    height: int            # tile height in pixels
    width: int             # tile width in pixels


def compute_tile_grid(
    image_height: int,
    image_width: int,
    tile_size: int = 512,
    overlap: int = 64,
) -> list[TileInfo]:
    """
    Compute the grid of overlapping tiles needed to cover the full image.

    Returns a list of TileInfo describing where each tile starts and its size.
    Edge tiles may be smaller than tile_size if the image doesn't divide evenly.
    """
    stride = tile_size - overlap
    tiles: list[TileInfo] = []
    idx = 0

    row = 0
    y = 0
    while y < image_height:
        col = 0
        x = 0
        h = min(tile_size, image_height - y)
        while x < image_width:
            w = min(tile_size, image_width - x)
            tiles.append(TileInfo(
                index=idx, row=row, col=col,
                y_start=y, x_start=x,
                height=h, width=w,
            ))
            idx += 1
            col += 1
            x += stride
            if x >= image_width:
                break
        row += 1
        y += stride
        if y >= image_height:
            break

    logger.info(
        "Tiling %dx%d image → %d tiles (tile_size=%d, overlap=%d)",
        image_height, image_width, len(tiles), tile_size, overlap,
    )
    return tiles


def extract_tile(image: np.ndarray, tile: TileInfo) -> np.ndarray:
    """
    Extract a single tile from the source image.

    image: (H, W) or (H, W, C) numpy array.
    Returns: tile-shaped crop of the image.
    """
    if image.ndim == 2:
        return image[tile.y_start:tile.y_start + tile.height,
                      tile.x_start:tile.x_start + tile.width].copy()
    return image[tile.y_start:tile.y_start + tile.height,
                  tile.x_start:tile.x_start + tile.width, :].copy()


def _cosine_ramp(size: int) -> np.ndarray:
    """Generate a 1-D cosine ramp from 0→1 over `size` pixels."""
    if size <= 0:
        return np.array([], dtype=np.float32)
    return (0.5 * (1 - np.cos(np.pi * np.arange(size) / size))).astype(np.float32)


def build_blend_weight(
    tile_height: int,
    tile_width: int,
    overlap: int,
    row: int,
    col: int,
    max_row: int,
    max_col: int,
) -> np.ndarray:
    """
    Build a 2-D feather-blend weight mask for a tile.

    Edges that border another tile get a cosine ramp; edges at the image
    boundary get full weight (1.0).  This ensures seamless blending where
    tiles overlap and no darkening at the edges of the mosaic.
    """
    weight = np.ones((tile_height, tile_width), dtype=np.float32)
    ramp_v = _cosine_ramp(min(overlap, tile_height))
    ramp_h = _cosine_ramp(min(overlap, tile_width))

    # Top edge ramp (skip if first row)
    if row > 0 and len(ramp_v) > 0:
        weight[:len(ramp_v), :] *= ramp_v[:, np.newaxis]

    # Bottom edge ramp (skip if last row)
    if row < max_row and len(ramp_v) > 0:
        weight[-len(ramp_v):, :] *= ramp_v[::-1, np.newaxis]

    # Left edge ramp (skip if first column)
    if col > 0 and len(ramp_h) > 0:
        weight[:, :len(ramp_h)] *= ramp_h[np.newaxis, :]

    # Right edge ramp (skip if last column)
    if col < max_col and len(ramp_h) > 0:
        weight[:, -len(ramp_h):] *= ramp_h[::-1][np.newaxis, :]

    return weight


def blend_tiles(
    tiles: list[TileInfo],
    tile_outputs: list[np.ndarray],
    output_height: int,
    output_width: int,
    overlap: int = 64,
    channels: int | None = None,
) -> np.ndarray:
    """
    Feather-blend a list of processed tiles back into one seamless output mosaic.

    tiles: the TileInfo list from compute_tile_grid (at the OUTPUT scale).
    tile_outputs: list of numpy arrays, one per tile, same order as tiles.
    output_height, output_width: final mosaic dimensions (at output scale).
    overlap: the overlap used during tiling (at output scale).

    Returns: (output_height, output_width) or (output_height, output_width, C) mosaic.
    """
    if not tiles or not tile_outputs:
        raise ValueError("Cannot blend empty tile lists")

    # Determine output shape
    sample = tile_outputs[0]
    if channels is None:
        channels = sample.shape[2] if sample.ndim == 3 else 0

    max_row = max(t.row for t in tiles)
    max_col = max(t.col for t in tiles)

    if channels > 0:
        mosaic = np.zeros((output_height, output_width, channels), dtype=np.float64)
    else:
        mosaic = np.zeros((output_height, output_width), dtype=np.float64)
    weight_sum = np.zeros((output_height, output_width), dtype=np.float64)

    for tile, tile_data in zip(tiles, tile_outputs):
        h, w = tile.height, tile.width
        weight = build_blend_weight(h, w, overlap, tile.row, tile.col, max_row, max_col)

        y_end = tile.y_start + h
        x_end = tile.x_start + w

        if channels > 0:
            mosaic[tile.y_start:y_end, tile.x_start:x_end, :] += (
                tile_data[:h, :w, :].astype(np.float64) * weight[:, :, np.newaxis]
            )
        else:
            mosaic[tile.y_start:y_end, tile.x_start:x_end] += (
                tile_data[:h, :w].astype(np.float64) * weight
            )

        weight_sum[tile.y_start:y_end, tile.x_start:x_end] += weight

    # Normalize by accumulated weights (avoid division by zero)
    mask = weight_sum > 0
    if channels > 0:
        mosaic[mask] /= weight_sum[mask][:, np.newaxis]
    else:
        mosaic[mask] /= weight_sum[mask]

    # Cast back to original dtype
    return mosaic.astype(sample.dtype)
