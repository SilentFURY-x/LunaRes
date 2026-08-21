"""Unified inference wrapper for LunaFormer and external SR checkpoints."""
import logging
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from api.config import settings
from models.registry import ModelSpec, get_model_specs, normalize_model_name

logger = logging.getLogger(__name__)


class ModelLoadError(RuntimeError):
    """Raised when a requested learned model cannot be loaded safely."""


class SRModel:
    """Load one selected SR engine and expose a NumPy ``predict`` interface."""

    def __init__(self, model_name: str = "lunaformer_lunar", scale_factor: int | None = None):
        self.model_name = normalize_model_name(model_name)
        self.spec: ModelSpec = get_model_specs()[self.model_name]
        self.scale_factor = scale_factor or settings.sr_scale_factor
        self.model: Any = None
        self.device = "cpu"
        self.using_fallback = self.model_name == "bicubic"
        self.version = f"{settings.model_version}:{self.model_name}"
        self._load_model()

    def _load_model(self) -> None:
        if self.model_name == "bicubic":
            return

        weights_path = self.spec.weights_path
        if weights_path is None or not weights_path.is_file():
            message = f"Weights for {self.spec.label} were not found at {weights_path}"
            if self.spec.allow_fallback:
                logger.warning("%s; using the documented bicubic development fallback", message)
                self.using_fallback = True
                return
            raise ModelLoadError(f"{message}. See models/README.md for setup instructions.")

        try:
            if self.model_name == "lunaformer_lunar":
                self.model = self._load_lunaformer(weights_path)
            else:
                self.model = self._load_spandrel(weights_path)
            self.using_fallback = False
            logger.info("Loaded %s from %s on %s", self.spec.label, weights_path, self.device)
        except Exception as exc:
            if self.spec.allow_fallback:
                logger.warning("Could not load %s (%s); using bicubic fallback", self.spec.label, exc)
                self.model = None
                self.using_fallback = True
                return
            raise ModelLoadError(f"Could not load {self.spec.label} from {weights_path}: {exc}") from exc

    def _select_device(self, torch) -> str:
        requested = settings.sr_device.lower()
        if requested == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return requested

    def _load_lunaformer(self, weights_path: Path):
        import torch

        self.device = self._select_device(torch)
        model = torch.load(weights_path, map_location=self.device, weights_only=False)
        if not callable(model):
            raise TypeError(
                "The LunaFormer checkpoint must contain a callable model. "
                "State-dict construction belongs in the LunaFormer training package."
            )
        if hasattr(model, "to"):
            model = model.to(self.device)
        if hasattr(model, "eval"):
            model.eval()
        return model

    def _load_spandrel(self, weights_path: Path):
        import torch
        from spandrel import ImageModelDescriptor, ModelLoader

        self.device = self._select_device(torch)
        descriptor = ModelLoader(device=torch.device(self.device)).load_from_file(str(weights_path))
        if not isinstance(descriptor, ImageModelDescriptor):
            raise TypeError("Checkpoint is not a supported image-to-image model")
        descriptor = descriptor.to(self.device).eval()
        detected_scale = int(descriptor.scale)
        if detected_scale != self.scale_factor:
            raise ValueError(
                f"Checkpoint scale is {detected_scale}x, but LunaRes is configured for "
                f"{self.scale_factor}x"
            )
        architecture = getattr(descriptor.architecture, "id", str(descriptor.architecture))
        self.version = f"{self.model_name}:{architecture}:{weights_path.stem}"
        return descriptor

    def predict(self, lr_tile: np.ndarray) -> np.ndarray:
        if self.using_fallback or self.model is None:
            return self._predict_bicubic(lr_tile)
        return self._predict_pytorch(lr_tile)

    def _predict_pytorch(self, lr_tile: np.ndarray) -> np.ndarray:
        import torch
        import torch.nn.functional as functional

        original_dtype = lr_tile.dtype
        original_channels = 1 if lr_tile.ndim == 2 else lr_tile.shape[2]
        max_val = _get_max_val(original_dtype)
        tile_f = lr_tile.astype(np.float32) / max_val

        if tile_f.ndim == 2:
            tile_f = tile_f[:, :, np.newaxis]

        expected_channels = int(getattr(self.model, "input_channels", tile_f.shape[2]))
        if tile_f.shape[2] == 1 and expected_channels == 3:
            tile_f = np.repeat(tile_f, 3, axis=2)
        elif tile_f.shape[2] == 3 and expected_channels == 1:
            tile_f = _rgb_to_luminance(tile_f)[:, :, np.newaxis]
        elif tile_f.shape[2] != expected_channels:
            raise ValueError(
                f"{self.spec.label} expects {expected_channels} channels, got {tile_f.shape[2]}"
            )

        tensor = torch.from_numpy(np.transpose(tile_f, (2, 0, 1))).unsqueeze(0).to(self.device)
        h, w = tensor.shape[-2:]
        # HAT and SwinIR use window attention. Padding edge tiles to 64 is valid
        # for both architectures and is cropped away after inference.
        multiple = 64 if self.model_name in {"hat", "swinir"} else 1
        pad_h = (multiple - h % multiple) % multiple
        pad_w = (multiple - w % multiple) % multiple
        if pad_h or pad_w:
            pad_mode = "reflect" if h > pad_h and w > pad_w else "replicate"
            tensor = functional.pad(tensor, (0, pad_w, 0, pad_h), mode=pad_mode)

        with torch.inference_mode():
            output = self.model(tensor)

        output = output[..., : h * self.scale_factor, : w * self.scale_factor]
        sr = output.squeeze(0).detach().float().cpu().clamp_(0, 1).numpy()
        sr = np.transpose(sr, (1, 2, 0))

        if original_channels == 1 and sr.shape[2] == 3:
            sr = _rgb_to_luminance(sr)
        elif original_channels == 1:
            sr = sr[:, :, 0]

        return np.clip(sr * max_val, 0, max_val).astype(original_dtype)

    def _predict_bicubic(self, lr_tile: np.ndarray) -> np.ndarray:
        h, w = lr_tile.shape[:2]
        new_h, new_w = h * self.scale_factor, w * self.scale_factor
        original_dtype = lr_tile.dtype

        if lr_tile.ndim == 2:
            return np.asarray(
                Image.fromarray(lr_tile).resize((new_w, new_h), Image.Resampling.BICUBIC)
            ).astype(original_dtype)

        result = np.zeros((new_h, new_w, lr_tile.shape[2]), dtype=original_dtype)
        for channel in range(lr_tile.shape[2]):
            result[:, :, channel] = np.asarray(
                Image.fromarray(lr_tile[:, :, channel]).resize(
                    (new_w, new_h), Image.Resampling.BICUBIC
                )
            ).astype(original_dtype)
        return result


_model_cache: dict[str, SRModel] = {}


def get_sr_model(model_name: str = "lunaformer_lunar") -> SRModel:
    normalized = normalize_model_name(model_name)
    if normalized not in _model_cache:
        _model_cache[normalized] = SRModel(model_name=normalized)
    return _model_cache[normalized]


def _rgb_to_luminance(image: np.ndarray) -> np.ndarray:
    return image[..., 0] * 0.299 + image[..., 1] * 0.587 + image[..., 2] * 0.114


def _get_max_val(dtype) -> float:
    if dtype == np.uint8:
        return 255.0
    if dtype == np.uint16:
        return 65535.0
    if np.issubdtype(dtype, np.floating):
        return 1.0
    return 255.0
