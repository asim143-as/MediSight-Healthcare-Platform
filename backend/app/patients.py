"""Patient records, dated health measurements (vitals + labs) and patient-account linking.

Every read/write runs AS THE CALLER, so Row Level Security keeps hospitals apart and patients
limited to their own record. The backend adds role checks and validation on top.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from datetime import datetime

from . import audit
from . import supabase as sb
from .auth import CurrentUser, require_roles
from .dbutil import ok_rows, require_patient, write_failed
from .schemas import (HealthMeasurementIn, HealthMeasurementOut, LinkRequest, PatientCreate, PatientOut,
                      PatientUpdate)

router = APIRouter(tags=["patients"])

PATIENT_COLS = "id,hospital_id,mrn,demographics,family_history,user_id,risk_category,risk_score,created_at,updated_at"

writers = require_roles("doctor", "hospital_admin")                       # create / edit records, add measurements
staff = require_roles("doctor", "nurse", "hospital_admin", "super_admin")  # browse patients
readers = require_roles("doctor", "nurse", "hospital_admin", "super_admin", "patient")
admins = require_roles("hospital_admin", "super_admin")                   # link accounts
only_patients = require_roles("patient")


@router.post("/patients", response_model=PatientOut, status_code=201)
async def create_patient(req: PatientCreate, request: Request, user: CurrentUser = Depends(writers)):
    """Create a patient record in the caller's own hospital. The hospital is taken from the caller's
    account and cannot be chosen in the request, so nobody can create records in another hospital."""
    if not user.hospital_id:
        raise HTTPException(403, "Your account is not assigned to a hospital")
    r = await sb.supabase_post("/rest/v1/patients", user.token, {
        "hospital_id": user.hospital_id, "mrn": req.mrn,
        "demographics": req.demographics.model_dump(mode="json", exclude_none=True),
        "family_history": req.family_history})
    write_failed(r)
    row = r.json()[0]
    audit.note(request, patient_id=row["id"])
    return row


@router.get("/patients", response_model=List[PatientOut])
async def list_patients(
        request: Request,
        q: Optional[str] = Query(None, max_length=50, pattern=r"^[\w .@-]+$",
                                 description="Search MRN or first/last name"),
        limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
        user: CurrentUser = Depends(staff)):
    """Patients the caller may see (their hospital), newest first. `q` allows only plain characters, so it
    cannot be used to inject extra filter syntax into the database query."""
    params = {"select": PATIENT_COLS, "order": "created_at.desc", "limit": limit, "offset": offset}
    if q:
        params["or"] = (f"(mrn.ilike.*{q}*,demographics->>first_name.ilike.*{q}*,"
                        f"demographics->>last_name.ilike.*{q}*)")
    return ok_rows(await sb.supabase_get("/rest/v1/patients", user.token, params))


# NOTE: /patients/me must be declared BEFORE /patients/{patient_id}, or "me" would be read as an id.
@router.get("/patients/me", response_model=PatientOut)
async def my_record(request: Request, user: CurrentUser = Depends(only_patients)):
    """A logged-in patient's own clinical record (404 until an admin links their account)."""
    rows = ok_rows(await sb.supabase_get("/rest/v1/patients", user.token, {
        "user_id": f"eq.{user.id}", "select": PATIENT_COLS}))
    if not rows:
        raise HTTPException(404, "No patient record is linked to your account yet")
    audit.note(request, patient_id=rows[0]["id"])
    return rows[0]


@router.get("/patients/{patient_id}", response_model=PatientOut)
async def get_patient(patient_id: UUID, user: CurrentUser = Depends(readers)):
    rows = ok_rows(await sb.supabase_get("/rest/v1/patients", user.token, {
        "id": f"eq.{patient_id}", "select": PATIENT_COLS}))
    if not rows:
        raise HTTPException(404, "Patient not found")
    return rows[0]


@router.patch("/patients/{patient_id}", response_model=PatientOut)
async def update_patient(patient_id: UUID, req: PatientUpdate, user: CurrentUser = Depends(writers)):
    body = {}
    if req.demographics is not None:
        body["demographics"] = req.demographics.model_dump(mode="json", exclude_none=True)
    if req.family_history is not None:
        body["family_history"] = req.family_history
    r = await sb.supabase_patch("/rest/v1/patients", user.token, {"id": f"eq.{patient_id}"}, body)
    write_failed(r)
    rows = r.json()
    if not rows:                                  # RLS hid it (other hospital) or it doesn't exist
        raise HTTPException(404, "Patient not found")
    return rows[0]


# ---- dated health measurements: one timeline over `vitals` and `lab_results` ---------------

@router.post("/patients/{patient_id}/measurements", response_model=HealthMeasurementOut, status_code=201)
async def add_measurement(patient_id: UUID, req: HealthMeasurementIn, user: CurrentUser = Depends(writers)):
    """Add a dated vital sign (`kind: vital`) or lab value (`kind: lab`) to the patient's timeline."""
    pid = str(patient_id)
    await require_patient(pid, user.token)
    when = req.recorded_at.isoformat()
    if req.kind == "vital":
        path = "/rest/v1/vitals"
        body = {"patient_id": pid, "type": req.name, "value": req.value, "unit": req.unit, "recorded_at": when}
    else:
        path = "/rest/v1/lab_results"
        body = {"patient_id": pid, "test_name": req.name, "value": req.value, "unit": req.unit,
                "reference_range": req.reference_range, "recorded_at": when}
    r = await sb.supabase_post(path, user.token, body)
    write_failed(r)
    row = r.json()[0]
    return HealthMeasurementOut(id=row["id"], kind=req.kind, name=req.name, value=row["value"], unit=row["unit"],
                                recorded_at=row["recorded_at"], reference_range=row.get("reference_range"))


@router.get("/patients/{patient_id}/measurements", response_model=List[HealthMeasurementOut])
async def list_measurements(
        patient_id: UUID,
        kind: Optional[str] = Query(None, pattern="^(vital|lab)$"),
        name: Optional[str] = Query(None, max_length=100, description="Exact test or vital name"),
        since: Optional[datetime] = None, limit: int = Query(100, ge=1, le=500),
        user: CurrentUser = Depends(readers)):
    """Dated timeline (vitals and labs together), newest first. Use `name` and `since` to chart one measurement."""
    pid = str(patient_id)
    await require_patient(pid, user.token)

    async def fetch(table: str, name_col: str, select: str) -> list:
        params = {"patient_id": f"eq.{pid}", "order": "recorded_at.desc", "limit": limit, "select": select}
        if name:
            params[name_col] = f"eq.{name}"
        if since:
            params["recorded_at"] = f"gte.{since.isoformat()}"
        return ok_rows(await sb.supabase_get(f"/rest/v1/{table}", user.token, params))

    out: List[HealthMeasurementOut] = []
    if kind in (None, "vital"):
        for v in await fetch("vitals", "type", "id,type,value,unit,recorded_at"):
            out.append(HealthMeasurementOut(id=v["id"], kind="vital", name=v["type"], value=v["value"],
                                            unit=v["unit"], recorded_at=v["recorded_at"]))
    if kind in (None, "lab"):
        for m in await fetch("lab_results", "test_name", "id,test_name,value,unit,reference_range,recorded_at"):
            out.append(HealthMeasurementOut(id=m["id"], kind="lab", name=m["test_name"], value=m["value"],
                                            unit=m["unit"], recorded_at=m["recorded_at"],
                                            reference_range=m.get("reference_range")))
    out.sort(key=lambda m: m.recorded_at, reverse=True)
    return out[:limit]


# ---- link a patient LOGIN to a patient RECORD ----------------------------------------------

@router.put("/patients/{patient_id}/link", response_model=PatientOut)
async def link_account(patient_id: UUID, req: LinkRequest, request: Request, user: CurrentUser = Depends(admins)):
    """Connect a patient's login to their clinical record, so the patient can see their own data.
    The target must be a `patient` account. Hospital admins can only link patients of their own hospital."""
    pid = str(patient_id)
    await require_patient(pid, user.token)

    # Narrow, deliberate use of the service role: admins cannot read other users' profiles under RLS,
    # and we must confirm the account exists and is a patient account. Nothing from it is returned.
    params = {"select": "id,role"}
    params.update({"id": f"eq.{req.user_id}"} if req.user_id else {"email": f"eq.{req.email.lower()}"})
    found = ok_rows(await sb.service_request("GET", "/rest/v1/profiles", params=params))
    if not found:
        raise HTTPException(404, "No account was found for that email or user id")
    if found[0]["role"] != "patient":
        raise HTTPException(409, "That account is not a patient account")

    r = await sb.supabase_patch("/rest/v1/patients", user.token, {"id": f"eq.{pid}"}, {"user_id": found[0]["id"]})
    write_failed(r)                               # 409 = that account is already linked to another record
    rows = r.json()
    if not rows:
        raise HTTPException(404, "Patient not found")
    audit.note(request, details={"linked": True})
    return rows[0]


@router.delete("/patients/{patient_id}/link", response_model=PatientOut)
async def unlink_account(patient_id: UUID, request: Request, user: CurrentUser = Depends(admins)):
    """Remove the login link. The clinical record and its history are kept."""
    r = await sb.supabase_patch("/rest/v1/patients", user.token, {"id": f"eq.{patient_id}"}, {"user_id": None})
    write_failed(r)
    rows = r.json()
    if not rows:
        raise HTTPException(404, "Patient not found")
    audit.note(request, details={"linked": False})
    return rows[0]
