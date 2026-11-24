"""The one place that talks to prediction models.

Diabetes -> the existing ml-service over HTTP.
Heart / CKD -> a labelled STUB until Shubham's models exist. To plug a real model
in, replace the body of `_stub` (or add an HTTP call like `_diabetes`); nothing
else in the backend changes.
"""
from dataclasses import dataclass, field
from typing import Dict, Optional

import httpx
from fastapi import HTTPException

from .config import get_settings

STUB_VERSION = "stub-0"


@dataclass
class ModelResult:
    probability: float
    confidence: float
    severity: str
    model_version: str
    explanation: Optional[str] = None
    shap_values: Dict[str, float] = field(default_factory=dict)
    base_value: Optional[float] = None


def severity_for(p: float) -> str:
    # Same thresholds as ml-service, so all three diseases grade risk identically.
    return "Low" if p < 0.2 else "Moderate" if p < 0.5 else "High" if p < 0.8 else "Critical"


async def _diabetes(features: dict) -> ModelResult:
    base = get_settings().ml_service_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            pred = await client.post(f"{base}/predict", json=features)
            if pred.status_code == 503:
                raise HTTPException(503, "The Diabetes model is not loaded yet")
            if pred.status_code != 200:
                raise HTTPException(502, "The Diabetes model service returned an error")
            p = pred.json()
            result = ModelResult(p["probability"], p["confidence"], p["severity"], p["model_version"])
            try:  # an explanation is valuable but must not block the prediction
                ex = await client.post(f"{base}/explain", json=features)
                if ex.status_code == 200:
                    e = ex.json()
                    result.explanation = e["clinical_explanation"]
                    result.shap_values = e["shap_values"]
                    result.base_value = e["base_value"]
            except httpx.HTTPError:
                pass
            return result
    except httpx.HTTPError:
        raise HTTPException(502, "Could not reach the Diabetes model service")


# (baseline probability, {feature: (reference value, weight per unit above reference)})
_STUBS = {
    "heart": (0.10, {"age": (40, 0.006), "trestbps": (120, 0.002), "chol": (200, 0.0008),
                     "oldpeak": (0, 0.06), "exang": (0, 0.15), "ca": (0, 0.10)}),
    "ckd": (0.05, {"sc": (1.2, 0.15), "hemo": (13, -0.05), "bp": (80, 0.003),
                   "htn": (0, 0.10), "dm": (0, 0.10)}),
}


def _stub(key: str, features: dict) -> ModelResult:
    base, terms = _STUBS[key]
    p = base + sum(w * (features[n] - ref) for n, (ref, w) in terms.items())
    p = round(min(0.98, max(0.02, p)), 4)
    return ModelResult(p, round(0.5 + abs(p - 0.5), 4), severity_for(p), STUB_VERSION)


async def run_model(key: str, features: dict) -> ModelResult:
    """key: 'diabetes' | 'heart' | 'ckd'."""
    return await _diabetes(features) if key == "diabetes" else _stub(key, features)
