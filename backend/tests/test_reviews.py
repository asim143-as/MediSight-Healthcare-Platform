import httpx
import pytest
from fastapi.testclient import TestClient

from app import supabase as sb
from app.auth import CurrentUser, get_current_user
from app.main import app

DOCTOR_ID = "11111111-1111-1111-1111-111111111111"
PATIENT = "22222222-2222-2222-2222-222222222222"
PRED = "44444444-4444-4444-4444-444444444444"
MEAS = "55555555-5555-5555-5555-555555555555"
REPORT = "88888888-8888-8888-8888-888888888888"
NOW = "2026-11-25T10:00:00+00:00"


class FakeDB:
    def __init__(self):
        self.patches = []                 # (path, params, json)
        self.patch_result = None          # rows returned by PATCH (None = echo back as one row)
        self.get_rows = {}                # path -> rows

    async def patch(self, path, token, params, json):
        self.patches.append((path, params, json))
        rows = [{**json, "id": MEAS, "prediction_id": PRED, "name": "HbA1c", "value": json.get("value", 7.2),
                 "unit": "%"}] if self.patch_result is None else self.patch_result
        return httpx.Response(200, json=rows)

    async def get(self, path, token, params=None):
        self.last_get = (path, params)
        return httpx.Response(200, json=self.get_rows.get(path, []))


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(sb, "supabase_patch", fake.patch)
    monkeypatch.setattr(sb, "supabase_get", fake.get)
    return fake


def login(role="doctor", status="approved"):
    user = CurrentUser(DOCTOR_ID, "d@x.test", "Dr X", role, None, status if role == "doctor" else None, "tok")
    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture(autouse=True)
def reset_login():
    login()
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


# ---- measurement review ---------------------------------------------------------------------

def test_verify_measurement_records_who_and_when(db):
    r = client.post(f"/measurements/{MEAS}/review", json={"decision": "verified"})
    assert r.status_code == 200
    path, params, body = db.patches[0]
    assert path == "/rest/v1/report_measurements" and params == {"id": f"eq.{MEAS}"}
    assert body["status"] == "verified" and body["verified_by"] == DOCTOR_ID and body["verified_at"]
    assert "value" not in body                                   # no correction -> value untouched


def test_verify_with_corrected_value(db):
    client.post(f"/measurements/{MEAS}/review", json={"decision": "verified", "value": 7.9})
    assert db.patches[0][2]["value"] == 7.9


def test_rejecting_with_a_value_is_invalid(db):
    r = client.post(f"/measurements/{MEAS}/review", json={"decision": "rejected", "value": 1})
    assert r.status_code == 422 and db.patches == []


def test_cannot_set_a_measurement_back_to_extracted(db):
    r = client.post(f"/measurements/{MEAS}/review", json={"decision": "extracted"})
    assert r.status_code == 422 and db.patches == []


def test_hidden_measurement_is_404(db):
    db.patch_result = []
    assert client.post(f"/measurements/{MEAS}/review", json={"decision": "verified"}).status_code == 404


@pytest.mark.parametrize("role", ["nurse", "patient", "hospital_admin"])
def test_only_doctors_review_measurements_and_predictions(db, role):
    login(role)
    assert client.post(f"/measurements/{MEAS}/review", json={"decision": "verified"}).status_code == 403
    assert client.post(f"/predictions/{PRED}/review", json={"decision": "accepted"}).status_code == 403
    assert client.get("/reviews").status_code == 403
    assert db.patches == []


def test_unapproved_doctor_cannot_review(db):
    login("doctor", "pending")
    assert client.post(f"/predictions/{PRED}/review", json={"decision": "accepted"}).status_code == 403


# ---- prediction review ----------------------------------------------------------------------

def test_accept_prediction(db):
    r = client.post(f"/predictions/{PRED}/review", json={"decision": "accepted"})
    assert r.status_code == 200 and r.json()["decision"] == "accepted"
    path, params, body = db.patches[0]
    assert path == "/rest/v1/clinical_reviews" and params == {"prediction_id": f"eq.{PRED}"}
    assert body["reviewer_id"] == DOCTOR_ID and body["reviewed_at"]
    assert body["override_severity"] is None and body["notes"] is None   # explicit nulls, no stale override


def test_override_needs_severity_and_a_real_reason(db):
    for bad in ({"decision": "overridden"},
                {"decision": "overridden", "override_severity": "Low"},
                {"decision": "overridden", "notes": "patient is fine"},
                {"decision": "overridden", "override_severity": "Low", "notes": "    "}):
        assert client.post(f"/predictions/{PRED}/review", json=bad).status_code == 422, bad
    assert db.patches == []


def test_valid_override_is_saved_with_trimmed_notes(db):
    r = client.post(f"/predictions/{PRED}/review",
                    json={"decision": "overridden", "override_severity": "Low", "notes": "  Lab error found  "})
    assert r.status_code == 200
    body = db.patches[0][2]
    assert body["override_severity"] == "Low" and body["notes"] == "Lab error found"


def test_severity_without_override_is_rejected(db):
    r = client.post(f"/predictions/{PRED}/review", json={"decision": "accepted", "override_severity": "Low"})
    assert r.status_code == 422


def test_invalid_severity_value_is_rejected(db):
    r = client.post(f"/predictions/{PRED}/review",
                    json={"decision": "overridden", "override_severity": "Mild", "notes": "x"})
    assert r.status_code == 422


def test_cannot_set_review_back_to_pending(db):
    assert client.post(f"/predictions/{PRED}/review", json={"decision": "pending"}).status_code == 422


def test_review_of_hidden_prediction_is_404(db):
    db.patch_result = []
    assert client.post(f"/predictions/{PRED}/review", json={"decision": "accepted"}).status_code == 404


# ---- worklist -------------------------------------------------------------------------------

def test_review_queue_defaults_to_pending_oldest_first(db):
    db.get_rows["/rest/v1/clinical_reviews"] = [{
        "prediction_id": PRED, "decision": "pending",
        "predictions": {"patient_id": PATIENT, "disease": "Diabetes", "severity": "High", "probability": 0.7,
                        "warnings": ["w"], "created_at": NOW}}]
    r = client.get("/reviews")
    assert r.status_code == 200
    item = r.json()[0]
    assert item["disease"] == "Diabetes" and item["predicted_at"].startswith("2026-11-25")
    _, params = db.last_get
    assert params["decision"] == "eq.pending" and params["order"] == "created_at.asc"


def test_review_queue_rejects_unknown_status(db):
    assert client.get("/reviews?status=whatever").status_code == 422


# ---- traceability ---------------------------------------------------------------------------

def trace_row(**over):
    row = {"id": PRED, "patient_id": PATIENT, "disease": "Diabetes", "probability": 0.8, "confidence": 0.8,
           "severity": "Critical", "model_version": "1.0.0", "warnings": ["close to boundary"],
           "input_features": {"BMI": 31.5}, "source_measurement_ids": [MEAS], "created_at": NOW,
           "explanations": {"clinical_explanation": "why", "shap_payload": {"shap_values": {"BMI": 0.1}}},
           "prediction_evidence": [
               {"document": "ADA.pdf", "page": 4, "category": "diabetes", "excerpt": "b", "distance": 0.4, "rank": 2},
               {"document": "WHO.pdf", "page": None, "category": "diabetes", "excerpt": "a", "distance": 0.2, "rank": 1}],
           "clinical_reviews": {"prediction_id": PRED, "decision": "overridden", "reviewer_id": DOCTOR_ID,
                                "override_severity": "Low", "notes": "lab error", "reviewed_at": NOW}}
    return {**row, **over}


def test_trace_links_prediction_to_inputs_sources_evidence_and_review(db):
    db.get_rows["/rest/v1/predictions"] = [trace_row()]
    db.get_rows["/rest/v1/report_measurements"] = [
        {"id": MEAS, "name": "HbA1c", "value": 7.2, "unit": "%", "status": "verified", "verified_at": NOW,
         "reports": {"id": REPORT, "original_filename": "lab.pdf"}}]
    r = client.get(f"/predictions/{PRED}")
    assert r.status_code == 200
    out = r.json()
    assert out["input_features"] == {"BMI": 31.5}
    assert out["source_measurements"][0]["report_filename"] == "lab.pdf"
    assert [e["document"] for e in out["evidence"]] == ["WHO.pdf", "ADA.pdf"]   # best match first
    assert out["review"]["decision"] == "overridden" and out["review"]["notes"] == "lab error"
    assert out["review_status"] == "overridden"
    assert out["explanation"]["shap_values"] == {"BMI": 0.1}


def test_patient_trace_hides_clinician_review(db):
    login("patient")
    db.get_rows["/rest/v1/predictions"] = [trace_row(clinical_reviews=None, source_measurement_ids=[])]
    out = client.get(f"/predictions/{PRED}").json()
    assert out["review"] is None and out["review_status"] == "pending"


def test_trace_of_hidden_prediction_is_404(db):
    assert client.get(f"/predictions/{PRED}").status_code == 404
