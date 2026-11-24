import httpx
import pytest
from fastapi.testclient import TestClient
from test_auth import USER_ID, fake_supabase
from test_predictions import DIABETES, PATIENT, PRED_ID
from test_predictions import FakeDB as PredictionsDB
from test_reports import PDF, REPORT_ID
from test_reports import FakeDB as ReportsDB

from app import audit, auth, ml, reports
from app import supabase as sb
from app.audit import write as real_write   # imported before the conftest fixture replaces audit.write
from app.main import app

client = TestClient(app)
AUTH = {"Authorization": "Bearer abc"}
ROW_ID = "99999999-9999-9999-9999-999999999999"


def login(monkeypatch, role="doctor", status="approved"):
    monkeypatch.setattr(auth, "supabase_get", fake_supabase(role=role, doctor_status=status))


class SimpleDB:
    """Just enough database for read endpoints."""

    def __init__(self, patient_visible=True, audit_rows=None):
        self.patient_visible, self.audit_rows, self.calls = patient_visible, audit_rows or [], []

    async def get(self, path, token, params=None):
        self.calls.append((path, params))
        if path == "/rest/v1/patients":
            return httpx.Response(200, json=[{"id": PATIENT}] if self.patient_visible else [])
        if path == "/rest/v1/api_audit_logs":
            return httpx.Response(200, json=self.audit_rows)
        return httpx.Response(200, json=[])


@pytest.fixture
def simple_db(monkeypatch):
    db = SimpleDB()
    monkeypatch.setattr(sb, "supabase_get", db.get)
    return db


def test_successful_read_is_audited_with_actor_and_patient(monkeypatch, simple_db, audit_rows):
    login(monkeypatch)
    assert client.get(f"/reports?patient_id={PATIENT}", headers=AUTH).status_code == 200
    (row,) = audit_rows
    assert row["action"] == "report.list" and row["outcome"] == "success" and row["status_code"] == 200
    assert row["actor_id"] == USER_ID and row["actor_role"] == "doctor"
    assert row["patient_id"] == PATIENT and row["ip_address"]


def test_missing_token_is_audited_as_denied(audit_rows):
    assert client.get(f"/reports?patient_id={PATIENT}").status_code == 401
    (row,) = audit_rows
    assert row["outcome"] == "denied" and row["actor_id"] is None
    assert row["details"]["reason"] == "Missing bearer token"


def test_wrong_role_is_audited_as_denied_with_the_actor(monkeypatch, simple_db, audit_rows):
    login(monkeypatch, role="patient")
    body = {"patient_id": PATIENT, "features": DIABETES}
    assert client.post("/predict/diabetes", json=body, headers=AUTH).status_code == 403
    (row,) = audit_rows
    assert row["action"] == "prediction.create" and row["outcome"] == "denied"
    assert row["actor_role"] == "patient" and row["actor_id"] == USER_ID


def test_unapproved_doctor_is_audited_as_denied(monkeypatch, simple_db, audit_rows):
    login(monkeypatch, status="pending")
    client.get(f"/reports?patient_id={PATIENT}", headers=AUTH)
    assert audit_rows[0]["outcome"] == "denied" and audit_rows[0]["actor_role"] == "doctor"


def test_hidden_patient_is_logged_as_error_404_with_patient(monkeypatch, audit_rows):
    login(monkeypatch)
    monkeypatch.setattr(sb, "supabase_get", SimpleDB(patient_visible=False).get)
    assert client.get(f"/reports?patient_id={PATIENT}", headers=AUTH).status_code == 404
    row = audit_rows[0]
    assert row["outcome"] == "error" and row["status_code"] == 404 and row["patient_id"] == PATIENT


def test_garbage_patient_id_cannot_break_the_audit_row(monkeypatch, simple_db, audit_rows):
    login(monkeypatch)
    assert client.get("/reports?patient_id=abc", headers=AUTH).status_code == 422
    assert len(audit_rows) == 1 and audit_rows[0]["patient_id"] is None


def test_prediction_is_audited_with_ids_never_health_values(monkeypatch, audit_rows):
    login(monkeypatch)
    db = PredictionsDB()
    monkeypatch.setattr(sb, "supabase_get", db.get)
    monkeypatch.setattr(sb, "supabase_post", db.post)

    async def fake_diabetes(features):
        return ml.ModelResult(0.82, 0.82, "Critical", "1.0.0", "why", {"BMI": 0.1}, 0.4)

    monkeypatch.setattr(ml, "_diabetes", fake_diabetes)
    r = client.post("/predict/diabetes", json={"patient_id": PATIENT, "features": DIABETES}, headers=AUTH)
    assert r.status_code == 201
    (row,) = audit_rows
    assert row["resource_id"] == PRED_ID and row["patient_id"] == PATIENT
    assert row["details"] == {"disease": "Diabetes", "source_measurements": 0}
    assert "31.5" not in str(row)                                  # the BMI value is not in the audit trail


def test_upload_audit_captures_patient_from_form_and_new_report(monkeypatch, audit_rows):
    from types import SimpleNamespace
    login(monkeypatch)
    db = ReportsDB()
    for name, fn in [("supabase_get", db.get), ("supabase_post", db.post), ("storage_upload", db.upload),
                     ("storage_delete", db.delete), ("service_request", db.service)]:
        monkeypatch.setattr(sb, name, fn)
    monkeypatch.setattr(reports, "get_settings", lambda: SimpleNamespace(ocr_service_url=""))
    r = client.post("/reports", data={"patient_id": PATIENT}, headers=AUTH,
                    files={"file": ("lab.pdf", PDF, "application/pdf")})
    assert r.status_code == 201
    (row,) = audit_rows
    assert row["action"] == "report.upload" and row["patient_id"] == PATIENT and row["resource_id"] == REPORT_ID
    assert row["details"] == {"content_type": "application/pdf", "size_bytes": len(PDF)}


def test_noise_and_unknown_routes_are_not_audited(monkeypatch, audit_rows):
    login(monkeypatch)
    client.get("/health")
    client.get("/docs")
    client.get("/auth/me", headers=AUTH)
    client.get("/no-such-route")
    assert audit_rows == []


def test_audit_failure_does_not_break_the_request(monkeypatch, simple_db):
    login(monkeypatch)

    async def broken(row):
        raise RuntimeError("audit store down")

    monkeypatch.setattr(audit, "write", broken)
    assert client.get(f"/reports?patient_id={PATIENT}", headers=AUTH).status_code == 200


def test_unhandled_crash_is_audited_as_500(monkeypatch, audit_rows):
    login(monkeypatch)

    async def boom(path, token, params=None):
        raise RuntimeError("kaboom")

    monkeypatch.setattr(sb, "supabase_get", boom)
    r = TestClient(app, raise_server_exceptions=False).get(f"/reports?patient_id={PATIENT}", headers=AUTH)
    assert r.status_code == 500
    assert audit_rows[0]["outcome"] == "error" and audit_rows[0]["status_code"] == 500


# ---- the writer itself ----------------------------------------------------------------------

def test_write_uses_service_role_and_fails_loudly(monkeypatch):
    import asyncio
    calls = []

    async def fake_service(method, path, params=None, json=None, content=None, headers=None):
        calls.append((method, path, json))
        return httpx.Response(calls_status[0], json=[])

    calls_status = [201]
    monkeypatch.setattr(sb, "service_request", fake_service)
    asyncio.run(real_write({"action": "x"}))
    assert calls == [("POST", "/rest/v1/api_audit_logs", {"action": "x"})]
    calls_status[0] = 400
    with pytest.raises(RuntimeError):
        asyncio.run(real_write({"action": "x"}))


# ---- reading the audit trail ----------------------------------------------------------------

def test_admin_can_read_and_filter_audit_logs_and_the_read_is_itself_audited(monkeypatch, audit_rows):
    login(monkeypatch, role="super_admin")
    db = SimpleDB(audit_rows=[{"id": ROW_ID, "action": "report.read", "resource_type": "report",
                               "outcome": "success", "created_at": "2026-11-25T10:00:00+00:00"}])
    monkeypatch.setattr(sb, "supabase_get", db.get)
    r = client.get(f"/audit-logs?patient_id={PATIENT}&limit=5", headers=AUTH)
    assert r.status_code == 200 and r.json()[0]["action"] == "report.read"
    _, params = db.calls[-1]
    assert params["patient_id"] == f"eq.{PATIENT}" and params["limit"] == 5
    assert audit_rows[0]["action"] == "audit.read"


@pytest.mark.parametrize("role", ["doctor", "nurse", "patient"])
def test_only_admins_can_read_audit_logs(monkeypatch, simple_db, role):
    login(monkeypatch, role=role)
    assert client.get("/audit-logs", headers=AUTH).status_code == 403
