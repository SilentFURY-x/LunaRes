"""Model metadata and backward-compatible model-name normalization."""
from dataclasses import dataclass
from pathlib import Path

from api.config import settings


@dataclass(frozen=True)
class ModelSpec:
    id: str
    label: str
    description: str
    weights_path: Path | None
    primary: bool = False
    perceptual: bool = False
    allow_fallback: bool = False


def get_model_specs() -> dict[str, ModelSpec]:
    """Build specs lazily so tests and environment overrides remain effective."""
    return {
        "lunaformer_lunar": ModelSpec(
            id="lunaformer_lunar",
            label="LunaFormer-Lunar",
            description="Primary lunar super-resolution model.",
            weights_path=Path(settings.sr_model_weights_path),
            primary=True,
            allow_fallback=True,
        ),
        "hat": ModelSpec(
            id="hat",
            label="HAT",
            description="Transformer benchmark fine-tuned for lunar imagery.",
            weights_path=Path(settings.hat_weights_path),
        ),
        "swinir": ModelSpec(
            id="swinir",
            label="SwinIR",
            description="Transformer benchmark fine-tuned for lunar imagery.",
            weights_path=Path(settings.swinir_weights_path),
        ),
        "realesrgan": ModelSpec(
            id="realesrgan",
            label="Real-ESRGAN",
            description="Perceptual enhancement mode; use cautiously for scientific analysis.",
            weights_path=Path(settings.realesrgan_weights_path),
            perceptual=True,
        ),
        "bicubic": ModelSpec(
            id="bicubic",
            label="Bicubic",
            description="Deterministic non-ML baseline.",
            weights_path=None,
        ),
    }


_LEGACY_ALIASES = {
    "fast": "lunaformer_lunar",
    "high_fidelity": "lunaformer_lunar",
    "lunaformer": "lunaformer_lunar",
}


def normalize_model_name(model_name: str) -> str:
    normalized = _LEGACY_ALIASES.get(model_name, model_name)
    if normalized not in get_model_specs():
        choices = ", ".join(get_model_specs())
        raise ValueError(f"Unknown SR model '{model_name}'. Expected one of: {choices}")
    return normalized


def list_model_availability() -> list[dict]:
    models = []
    for spec in get_model_specs().values():
        weights_available = spec.weights_path is None or spec.weights_path.is_file()
        models.append({
            "id": spec.id,
            "label": spec.label,
            "description": spec.description,
            "primary": spec.primary,
            "perceptual": spec.perceptual,
            "weights_available": weights_available,
        })
    return models
