"""
Normalize a raw PDS3/PDS4 or GeoTIFF input into a Cloud-Optimized GeoTIFF (COG).

Usage:
    python pds_to_cog.py --input path/to/product.IMG --output path/to/output.tif

Preserves radiometric depth (16-bit / float32) — do NOT downcast to 8-bit here.
GDAL/rasterio has native PDS3/PDS4 drivers, so this works directly on ISRO/NASA
planetary products without a separate conversion tool.
"""
import argparse
import rasterio
from rasterio.shutil import copy as rio_copy


def convert_to_cog(input_path: str, output_path: str):
    with rasterio.open(input_path) as src:
        profile = src.profile.copy()
        profile.update(
            driver="COG",
            compress="DEFLATE",   # lossless — do not use a lossy compressor here
            blocksize=512,
        )
        rio_copy(src, output_path, **profile)
    print(f"Wrote COG: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    convert_to_cog(args.input, args.output)
