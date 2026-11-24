"""Keeps docs/API.md honest: every JSON example must match the real models, and every endpoint
must be documented. If you change a schema or add an endpoint, this fails until the docs follow."""
import json
import re
from pathlib import Path

import pytest

from app import ml
from app.main import MeResponse, app
from app.predictions import _warnings
from app.schemas import (AuditLogOut, CKDFeatures, DiabetesFeatures, DownloadOut, ExtractedMeasurement,
                         HealthMeasurementIn, HealthMeasurementOut, HeartFeatures, LinkRequest, MeasurementOut,
                         MeasurementReviewIn, PatientCreate, PatientOut, PatientUpdate, PredictionDetail,
                         PredictionHistoryItem, PredictionOut, PredictionReviewIn, PredictRequest,
                         ReportDetail, ReportOut, ReviewOut, ReviewQueueItem)

DOC = Path(__file__).resolve().parents[2] / "docs" / "API.md"
TEXT = DOC.read_text(encoding="utf-8")


def ocr_response(data):
    for item in data["measurements"]:
        ExtractedMeasurement.model_validate(item)


MODELS = {
    "MeResponse": MeResponse.model_validate,
    "DiabetesRequest": PredictRequest[DiabetesFeatures].model_validate,
    "HeartRequest": PredictRequest[HeartFeatures].model_validate,
    "CKDRequest": PredictRequest[CKDFeatures].model_validate,
    "PredictionOut": PredictionOut.model_validate,
    "PredictionHistoryItem": PredictionHistoryItem.model_validate,
    "PredictionDetail": PredictionDetail.model_validate,
    "PredictionReviewIn": PredictionReviewIn.model_validate,
    "ReviewOut": ReviewOut.model_validate,
    "ReviewQueueItem": ReviewQueueItem.model_validate,
    "MeasurementReviewIn": MeasurementReviewIn.model_validate,
    "MeasurementOut": MeasurementOut.model_validate,
    "ReportOut": ReportOut.model_validate,
    "ReportDetail": ReportDetail.model_validate,
    "DownloadOut": DownloadOut.model_validate,
    "AuditLogOut": AuditLogOut.model_validate,
    "OcrResponse": ocr_response,
    "PatientCreate": PatientCreate.model_validate,
    "PatientUpdate": PatientUpdate.model_validate,
    "PatientOut": PatientOut.model_validate,
    "HealthMeasurementIn": HealthMeasurementIn.model_validate,
    "HealthMeasurementOut": HealthMeasurementOut.model_validate,
    "LinkRequest": LinkRequest.model_validate,
}

# (model name, parsed JSON) for every `<!-- model: X -->` marker followed by a json block, in file order
EXAMPLES = [(m, json.loads(body)) for m, body in
            re.findall(r"<!-- model: (\w+) -->\s*```json\n(.*?)```", TEXT, flags=re.DOTALL)]


@pytest.mark.parametrize("name,data", EXAMPLES, ids=[f"{i}-{n}" for i, (n, _) in enumerate(EXAMPLES)])
def test_every_example_matches_its_model(name, data):
    MODELS[name](data)


def test_all_models_are_actually_used_in_the_docs():
    assert {n for n, _ in EXAMPLES} == set(MODELS)


def test_every_endpoint_has_its_own_section():
    # A heading like  ### `GET /reports?patient_id=...`  (a mention in a table does not count).
    missing = [f"{method.upper()} {path}" for path, ops in app.openapi()["paths"].items() for method in ops
               if not re.search(rf"^### `{method.upper()} {re.escape(path)}[`?]", TEXT, flags=re.MULTILINE)]
    assert missing == [], f"Add a '### `METHOD /path`' section to docs/API.md for: {missing}"


def test_heart_example_response_matches_what_the_stub_really_returns():
    i = next(k for k, (n, _) in enumerate(EXAMPLES) if n == "HeartRequest")
    request, response = EXAMPLES[i][1], EXAMPLES[i + 1][1]
    result = ml._stub("heart", request["features"])
    assert response["probability"] == result.probability and response["confidence"] == result.confidence
    assert response["severity"] == result.severity and response["model_version"] == result.model_version
    assert response["warnings"] == _warnings(result)
