from pathlib import Path

import numpy as np
import pytest

from api.config import settings
from models.registry import list_model_availability, normalize_model_name
from models.sr_model import ModelLoadError, SRModel


def test_legacy_fast_mode_maps_to_primary_model():
    assert normalize_model_name("fast") == "lunaformer_lunar"
    assert normalize_model_name("high_fidelity") == "lunaformer_lunar"


def test_unknown_model_is_rejected():
    with pytest.raises(ValueError, match="Unknown SR model"):
        normalize_model_name("not-a-model")


def test_bicubic_preserves_uint16_band_count_and_scale():
    tile = np.arange(12, dtype=np.uint16).reshape(3, 4)
    model = SRModel(model_name="bicubic", scale_factor=4)

    result = model.predict(tile)

    assert result.shape == (12, 16)
    assert result.dtype == np.uint16
    assert model.using_fallback is True


def test_external_model_requires_installed_weights(monkeypatch, tmp_path: Path):
    missing = tmp_path / "missing-hat.pth"
    monkeypatch.setattr(settings, "hat_weights_path", str(missing))

    with pytest.raises(ModelLoadError, match="Weights for HAT were not found"):
        SRModel(model_name="hat")


def test_availability_marks_bicubic_ready(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "hat_weights_path", str(tmp_path / "hat.pth"))
    models = {item["id"]: item for item in list_model_availability()}

    assert models["lunaformer_lunar"]["primary"] is True
    assert models["hat"]["weights_available"] is False
    assert models["bicubic"]["weights_available"] is True
