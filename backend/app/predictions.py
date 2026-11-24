from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from . import supabase as sb
from .auth import CurrentUser, require_roles
from .dbutil import first, ok_rows, require_patient, write_failed
from .ml import ModelResult, run_model
from .schemas import (CKDFeatures, DiabetesFeatures, ExplanationOut, HeartFeatures,
                      PredictionHistoryItem, PredictionOut, PredictRequest)

router = APIRouter(tags=["predictions"])

# What the database stores in predictions.disease
LABELS = {"diabetes": "Diabetes", "heart": "Heart Disease", "ckd": "CKD"}

only_doctors = require_roles("doctor")
history_readers = require_roles("doctor", "nurse", "hospital_admin", "super_admin", "patient")


async def _require_verified_measurements(ids: List[str], patient_id: str, token: str) -> None:
    """Team rule: OCR-extracted values may feed a model only after a clinician verified them."""
    if not ids:
        return
    rows = ok_rows(await sb.supabase_get("/rest/v1/report_measurements", token, {
        "id": f"in.({','.join(ids)})", "select": "id,status,reports(patient_id)"}))
    found = {row["id"]: row for row in rows}
    bad = [i for i in ids if i not in found
           or found[i]["status"] != "verified"
           or first(found[i]["reports"])["patient_id"] != patient_id]
    if bad:
        raise HTTPException(409, f"Measurements must be verified and belong to this patient: {sorted(bad)}")


def explanation_from(ex: Optional[dict]) -> Optional[ExplanationOut]:
    """Build the API explanation from an `explanations` row (None if there isn't one)."""
    if not ex:
        return None
    payload = ex.get("shap_payload") or {}
    return ExplanationOut(clinical_explanation=ex["clinical_explanation"],
                          shap_values=payload.get("shap_values", {}), base_value=payload.get("base_value"))


def _warnings(result: ModelResult) -> List[str]:
    w = []
    if result.model_version.startswith("stub"):
        w.append("Placeholder model: this result is illustrative and not clinically valid.")
    elif result.explanation is None:
        w.append("Explanation unavailable for this prediction.")
    if result.confidence < 0.65:
        w.append("Probability is close to the decision boundary; interpret with caution.")
    return w


async def _predict(key: str, req: PredictRequest, user: CurrentUser) -> PredictionOut:
    patient_id = str(req.patient_id)
    source_ids = sorted({str(i) for i in req.source_measurement_ids})
    features = req.features.model_dump()

    await require_patient(patient_id, user.token)
    await _require_verified_measurements(source_ids, patient_id, user.token)

    result = await run_model(key, features)
    warnings = _warnings(result)

    r = await sb.supabase_post("/rest/v1/predictions", user.token, {
        "patient_id": patient_id, "disease": LABELS[key],
        "probability": result.probability, "confidence": result.confidence,
        "severity": result.severity, "model_version": result.model_version,
        "input_features": features, "source_measurement_ids": source_ids, "warnings": warnings,
    })
    write_failed(r)
    row = r.json()[0]

    explanation = None
    if result.explanation:
        # ponytail: two inserts, not one transaction. If this fails the prediction still stands
        # (flagged below). Move both into one SQL function if strict atomicity is needed.
        e = await sb.supabase_post("/rest/v1/explanations", user.token, {
            "prediction_id": row["id"],
            "shap_payload": {"shap_values": result.shap_values, "base_value": result.base_value},
            "clinical_explanation": result.explanation,
        })
        if e.status_code < 400:
            explanation = ExplanationOut(clinical_explanation=result.explanation,
                                         shap_values=result.shap_values, base_value=result.base_value)
        else:
            warnings.append("Explanation could not be saved.")

    return PredictionOut(
        id=row["id"], patient_id=row["patient_id"], disease=row["disease"],
        probability=row["probability"], confidence=row["confidence"], severity=row["severity"],
        model_version=row["model_version"], warnings=warnings, explanation=explanation,
        review_status="pending", created_at=row["created_at"],
    )


@router.post("/predict/diabetes", response_model=PredictionOut, status_code=201)
async def predict_diabetes(req: PredictRequest[DiabetesFeatures], user: CurrentUser = Depends(only_doctors)):
    """Run the Diabetes model for a patient and save the prediction, explanation and a pending review."""
    return await _predict("diabetes", req, user)


@router.post("/predict/heart", response_model=PredictionOut, status_code=201)
async def predict_heart(req: PredictRequest[HeartFeatures], user: CurrentUser = Depends(only_doctors)):
    """Heart Disease prediction. Uses a placeholder model (stub-0) until Shubham's model is plugged in."""
    return await _predict("heart", req, user)


@router.post("/predict/ckd", response_model=PredictionOut, status_code=201)
async def predict_ckd(req: PredictRequest[CKDFeatures], user: CurrentUser = Depends(only_doctors)):
    """CKD prediction. Uses a placeholder model (stub-0) until Shubham's model is plugged in."""
    return await _predict("ckd", req, user)


@router.get("/patients/{patient_id}/predictions", response_model=List[PredictionHistoryItem])
async def prediction_history(patient_id: UUID, limit: int = Query(50, ge=1, le=200),
                             user: CurrentUser = Depends(history_readers)):
    """Newest-first prediction history for one patient. Row Level Security limits what each role sees."""
    pid = str(patient_id)
    await require_patient(pid, user.token)
    rows = ok_rows(await sb.supabase_get("/rest/v1/predictions", user.token, {
        "patient_id": f"eq.{pid}", "order": "created_at.desc", "limit": limit,
        "select": "*,explanations(clinical_explanation,shap_payload),clinical_reviews(decision,reviewed_at)",
    }))
    out = []
    for row in rows:
        rev = first(row.get("clinical_reviews"))
        out.append(PredictionHistoryItem(
            id=row["id"], patient_id=row["patient_id"], disease=row["disease"],
            probability=row["probability"], confidence=row["confidence"], severity=row["severity"],
            model_version=row["model_version"], warnings=row.get("warnings") or [],
            input_features=row.get("input_features") or {}, created_at=row["created_at"],
            explanation=explanation_from(first(row.get("explanations"))),
            # Patients can't read clinical_reviews (private notes), so they get "pending" here.
            # ponytail: expose a patient-safe status through a narrow service-role query later.
            review_status=rev["decision"] if rev else "pending",
            reviewed_at=rev["reviewed_at"] if rev else None,
        ))
    return out
