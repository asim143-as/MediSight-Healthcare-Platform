"""API audit trail: who did what, to which patient's data, and whether it worked.

The database already audits data CHANGES (triggers). It cannot see reads, downloads or
refused requests, so this module records those. One middleware writes a row for every request
to a sensitive endpoint, so an endpoint cannot forget to be audited, and denied attempts are
captured automatically. Endpoints only add extra context with `note()`.

PRIVACY RULE: `details` holds ids and reasons only, never health values (no BMI, lab results...).
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from . import supabase as sb
from .auth import CurrentUser, require_roles
from .dbutil import ok_rows
from .schemas import AuditLogOut

log = logging.getLogger("medisight.audit")
router = APIRouter(tags=["audit"])

# (HTTP method, route template) -> (action, resource type). Only these routes are audited;
# /health, /docs and /auth/me are noise. Add a line here when you add a sensitive endpoint.
ACTIONS = {
    ("POST", "/predict/diabetes"): ("prediction.create", "prediction"),
    ("POST", "/predict/heart"): ("prediction.create", "prediction"),
    ("POST", "/predict/ckd"): ("prediction.create", "prediction"),
    ("GET", "/patients/{patient_id}/predictions"): ("prediction.list", "prediction"),
    ("GET", "/predictions/{prediction_id}"): ("prediction.read", "prediction"),
    ("POST", "/predictions/{prediction_id}/review"): ("prediction.review", "prediction"),
    ("POST", "/measurements/{measurement_id}/review"): ("measurement.review", "measurement"),
    ("GET", "/reviews"): ("review.list", "review"),
    ("POST", "/reports"): ("report.upload", "report"),
    ("GET", "/reports"): ("report.list", "report"),
    ("GET", "/reports/{report_id}"): ("report.read", "report"),
    ("GET", "/reports/{report_id}/download"): ("report.download", "report"),
    ("GET", "/audit-logs"): ("audit.read", "audit_log"),
}


def note(request: Request, **context) -> None:
    """Attach context (patient_id, resource_id, details, reason) to this request's audit row."""
    request.state.audit = {**(getattr(request.state, "audit", None) or {}), **context}


def _uuid(value) -> Optional[str]:
    """Only real UUIDs go into uuid columns. A garbage query param must not make the audit insert fail."""
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError):
        return None


def _outcome(status: int) -> str:
    return "success" if status < 400 else "denied" if status in (401, 403) else "error"


async def write(row: dict) -> None:
    # Service role on purpose: users have no INSERT policy, so nobody can forge an audit entry.
    r = await sb.service_request("POST", "/rest/v1/api_audit_logs", json=row)
    if r.status_code >= 400:
        raise RuntimeError(f"audit insert failed ({r.status_code})")


async def record(request: Request, status: int) -> None:
    try:
        route = request.scope.get("route")
        spec = ACTIONS.get((request.method, getattr(route, "path", None)))
        if spec is None:
            return
        ctx = getattr(request.state, "audit", None) or {}
        user: Optional[CurrentUser] = getattr(request.state, "user", None)
        pp = request.path_params
        resource_id = ctx.get("resource_id") or next(
            (pp[k] for k in ("report_id", "prediction_id", "measurement_id") if k in pp), None)
        patient_id = ctx.get("patient_id") or pp.get("patient_id") or request.query_params.get("patient_id")
        details = dict(ctx.get("details") or {})
        if ctx.get("reason"):
            details["reason"] = str(ctx["reason"])[:300]
        await write({
            "actor_id": _uuid(user.id) if user else None,
            "actor_role": user.role if user else None,
            "action": spec[0], "resource_type": spec[1],
            "resource_id": _uuid(resource_id), "patient_id": _uuid(patient_id),
            "outcome": _outcome(status), "status_code": status,
            "ip_address": request.client.host if request.client else None,
            "details": details,
        })
    except Exception:
        # ponytail: fail-OPEN. If the audit write fails the request still succeeds and the failure is
        # logged. Make it fail-CLOSED (reject the request) if your compliance rules demand it.
        log.exception("audit write failed")


@router.get("/audit-logs", response_model=List[AuditLogOut])
async def audit_logs(patient_id: Optional[UUID] = None, actor_id: Optional[UUID] = None,
                     limit: int = Query(100, ge=1, le=500),
                     user: CurrentUser = Depends(require_roles("super_admin", "hospital_admin"))):
    """Newest first. 'Who accessed patient X?' = filter by patient_id. Row Level Security limits
    hospital admins to their own hospital's patients."""
    params = {"order": "created_at.desc", "limit": limit, "select": "*"}
    if patient_id:
        params["patient_id"] = f"eq.{patient_id}"
    if actor_id:
        params["actor_id"] = f"eq.{actor_id}"
    return ok_rows(await sb.supabase_get("/rest/v1/api_audit_logs", user.token, params))
