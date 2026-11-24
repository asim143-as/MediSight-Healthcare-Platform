"""Human review. The model, the retrieved evidence and the clinician's decision are separate
records: a review NEVER edits the prediction, it is stored beside it with who/when/why."""
from datetime import datetime, timezone
from typing import List, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from . import audit
from . import supabase as sb
from .auth import CurrentUser, require_roles
from .dbutil import first, ok_rows, write_failed
from .predictions import explanation_from
from .schemas import (EvidenceOut, MeasurementOut, MeasurementReviewIn, PredictionDetail, PredictionReviewIn,
                      ReviewOut, ReviewQueueItem, SourceMeasurementOut)

router = APIRouter(tags=["clinical review"])

# Only approved doctors decide. (The database would also let hospital admins verify
# measurements, but verification is a clinical act, so the API is stricter.)
only_doctors = require_roles("doctor")
readers = require_roles("doctor", "nurse", "hospital_admin", "super_admin", "patient")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/measurements/{measurement_id}/review", response_model=MeasurementOut)
async def review_measurement(measurement_id: UUID, req: MeasurementReviewIn, request: Request,
                             user: CurrentUser = Depends(only_doctors)):
    """Verify or reject a value OCR extracted. Only VERIFIED values may feed a prediction.
    If OCR misread a number, send the corrected `value` while verifying; the original OCR text
    stays in `source_text` and the change is recorded by the database audit trigger."""
    audit.note(request, details={"decision": req.decision, "value_corrected": req.value is not None})
    body = {"status": req.decision, "verified_by": user.id, "verified_at": _now()}
    if req.value is not None:
        body["value"] = req.value
    r = await sb.supabase_patch("/rest/v1/report_measurements", user.token, {"id": f"eq.{measurement_id}"}, body)
    write_failed(r)
    rows = r.json()
    if not rows:                                   # RLS hid it (other hospital) or it doesn't exist
        raise HTTPException(404, "Measurement not found")
    return rows[0]


@router.post("/predictions/{prediction_id}/review", response_model=ReviewOut)
async def review_prediction(prediction_id: UUID, req: PredictionReviewIn, request: Request,
                            user: CurrentUser = Depends(only_doctors)):
    """Accept the model's result, override it (severity + written reason required), or ask for more data."""
    audit.note(request, details={"decision": req.decision})   # the notes text stays out of the audit row
    body = {"decision": req.decision, "reviewer_id": user.id, "reviewed_at": _now(),
            # explicit nulls so a changed decision can't leave a stale override behind
            "override_severity": req.override_severity, "notes": req.notes}
    r = await sb.supabase_patch("/rest/v1/clinical_reviews", user.token,
                                {"prediction_id": f"eq.{prediction_id}"}, body)
    write_failed(r)
    rows = r.json()
    if not rows:
        raise HTTPException(404, "Prediction not found")
    return rows[0]


@router.get("/reviews", response_model=List[ReviewQueueItem])
async def review_queue(status: Literal["pending", "accepted", "overridden", "needs_more_data"] = "pending",
                       limit: int = Query(50, ge=1, le=200), user: CurrentUser = Depends(only_doctors)):
    """A doctor's worklist: predictions in their hospital with the given review status."""
    rows = ok_rows(await sb.supabase_get("/rest/v1/clinical_reviews", user.token, {
        "decision": f"eq.{status}", "limit": limit,
        "order": "created_at.asc" if status == "pending" else "reviewed_at.desc",
        "select": "prediction_id,decision,predictions(patient_id,disease,severity,probability,warnings,created_at)"}))
    out = []
    for row in rows:
        p = first(row["predictions"])
        out.append(ReviewQueueItem(
            prediction_id=row["prediction_id"], patient_id=p["patient_id"], disease=p["disease"],
            severity=p["severity"], probability=p["probability"], warnings=p.get("warnings") or [],
            decision=row["decision"], predicted_at=p["created_at"]))
    return out


@router.get("/predictions/{prediction_id}", response_model=PredictionDetail)
async def prediction_trace(prediction_id: UUID, request: Request, user: CurrentUser = Depends(readers)):
    """Full traceability for one prediction: exact inputs, the verified report values they came from
    (and which report), model explanation, retrieved evidence, and the clinician's decision."""
    rows = ok_rows(await sb.supabase_get("/rest/v1/predictions", user.token, {
        "id": f"eq.{prediction_id}",
        "select": "*,explanations(clinical_explanation,shap_payload),"
                  "prediction_evidence(document,page,category,excerpt,distance,rank),"
                  "clinical_reviews(prediction_id,decision,reviewer_id,override_severity,notes,reviewed_at)"}))
    if not rows:
        raise HTTPException(404, "Prediction not found")
    row = rows[0]
    audit.note(request, patient_id=row["patient_id"])

    sources = []
    ids = row.get("source_measurement_ids") or []
    if ids:
        for m in ok_rows(await sb.supabase_get("/rest/v1/report_measurements", user.token, {
                "id": f"in.({','.join(ids)})",
                "select": "id,name,value,unit,status,verified_at,reports(id,original_filename)"})):
            rep = first(m.pop("reports", None)) or {}
            sources.append(SourceMeasurementOut(**m, report_id=rep.get("id"),
                                                report_filename=rep.get("original_filename")))

    review = first(row.get("clinical_reviews"))   # patients get None here: RLS hides clinician notes
    return PredictionDetail(
        id=row["id"], patient_id=row["patient_id"], disease=row["disease"], probability=row["probability"],
        confidence=row["confidence"], severity=row["severity"], model_version=row["model_version"],
        warnings=row.get("warnings") or [], explanation=explanation_from(first(row.get("explanations"))),
        review_status=review["decision"] if review else "pending", created_at=row["created_at"],
        input_features=row.get("input_features") or {}, source_measurements=sources,
        evidence=[EvidenceOut(**e) for e in sorted(row.get("prediction_evidence") or [], key=lambda e: e["rank"])],
        review=ReviewOut(**review) if review else None)
