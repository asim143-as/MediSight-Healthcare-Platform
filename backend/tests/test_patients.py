from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app import supabase as sb
from app.auth import CurrentUser, get_current_user
from app.main import app

HOSPITAL = "0d9c5a60-3b8e-4a3e-8d57-6a6c1d3e7f10"
DOCTOR = "11111111-1111-1111-1111-111111111111"
PATIENT = "22222222-2222-2222-2222-222222222222"
ACCOUNT = "33333333-3333-3333-3333-333333333333"
NOW = "2026-11-25T10:00:00+00:00"

DEMO = {"first_name": "Ayesha", "last_name": "Khan", "gender": "Female", "age": 41, "contact_number": "+92-300-1234567"}
ROW = {"id": PATIENT, "hospital_id": HOSPITAL, "mrn": "MRN-1001", "demographics": DEMO, "family_history": [],
       "user_id": None, "risk_category": None, "risk_score": None, "created_at": NOW, "updated_at": NOW}


class FakeDB:
    def __init__(self):
        self.posts, self.patches, self.gets, self.service = [], [], [], []
        self.rows = {"/rest/v1/patients": [ROW]}      # what GETs return, by path
        self.post_status = 201
        self.patch_rows = None                        # None = echo ROW back; [] = RLS hid it
        self.patch_status = 200
        self.profiles = [{"id": ACCOUNT, "role": "patient"}]

    async def get(self, path, token, params=None):
        self.gets.append((path, params))
        return httpx.Response(200, json=self.rows.get(path, []))

    async def post(self, path, token, json):
        self.posts.append((path, json))
        if self.post_status >= 400:
            return httpx.Response(self.post_status, json={"code": "x"})
        return httpx.Response(201, json=[{**ROW, **json, "id": json.get("id", PATIENT)}])

    async def patch(self, path, token, params, json):
        self.patches.append((path, params, json))
        if self.patch_status >= 400:
            return httpx.Response(self.patch_status, json={"code": "23505"})
        rows = [{**ROW, **json}] if self.patch_rows is None else self.patch_rows
        return httpx.Response(200, json=rows)

    async def service_request(self, method, path, params=None, json=None, content=None, headers=None):
        self.service.append((method, path, params))
        return httpx.Response(200, json=self.profiles)


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(sb, "supabase_get", fake.get)
    monkeypatch.setattr(sb, "supabase_post", fake.post)
    monkeypatch.setattr(sb, "supabase_patch", fake.patch)
    monkeypatch.setattr(sb, "service_request", fake.service_request)
    return fake


def login(role="doctor", status="approved", hospital=HOSPITAL):
    user = CurrentUser(DOCTOR, "d@x.test", "Dr X", role, hospital, status if role == "doctor" else None, "tok")
    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture(autouse=True)
def reset_login():
    login()
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


# ---- create ---------------------------------------------------------------------------------

def test_create_patient_uses_the_callers_hospital(db, audit_rows):
    r = client.post("/patients", json={"mrn": "MRN-1001", "demographics": DEMO, "family_history": ["diabetes"]})
    assert r.status_code == 201 and r.json()["mrn"] == "MRN-1001"
    path, body = db.posts[0]
    assert path == "/rest/v1/patients" and body["hospital_id"] == HOSPITAL
    assert body["demographics"]["first_name"] == "Ayesha" and body["family_history"] == ["diabetes"]
    assert audit_rows[0]["action"] == "patient.create" and audit_rows[0]["patient_id"] == PATIENT


def test_client_cannot_choose_the_hospital(db):
    r = client.post("/patients", json={"mrn": "MRN-1001", "demographics": DEMO, "hospital_id": "other"})
    assert r.status_code == 422 and db.posts == []


def test_create_without_hospital_is_403(db):
    login(hospital=None)
    assert client.post("/patients", json={"mrn": "MRN-1001", "demographics": DEMO}).status_code == 403
    assert db.posts == []


def test_duplicate_mrn_is_409(db):
    db.post_status = 409
    r = client.post("/patients", json={"mrn": "MRN-1001", "demographics": DEMO})
    assert r.status_code == 409 and "MRN" in r.json()["error"]["message"]


@pytest.mark.parametrize("bad", [
    {"mrn": "x", "demographics": DEMO},                                             # MRN too short
    {"mrn": "MRN 1001!", "demographics": DEMO},                                     # illegal characters
    {"mrn": "MRN-1001", "demographics": {**DEMO, "gender": "Robot"}},
    {"mrn": "MRN-1001", "demographics": {**DEMO, "age": 200}},
    {"mrn": "MRN-1001", "demographics": {**DEMO, "unknown": 1}},                    # unknown field
    {"mrn": "MRN-1001", "demographics": {"first_name": "A", "gender": "Male"}},     # last_name missing
])
def test_invalid_patient_is_rejected(db, bad):
    assert client.post("/patients", json=bad).status_code == 422 and db.posts == []


@pytest.mark.parametrize("role", ["nurse", "patient", "super_admin"])
def test_only_doctors_and_hospital_admins_create(db, role):
    login(role)
    assert client.post("/patients", json={"mrn": "MRN-1001", "demographics": DEMO}).status_code == 403


# ---- list / read / update -------------------------------------------------------------------

def test_list_patients_with_search(db):
    r = client.get("/patients?q=Khan&limit=10&offset=20")
    assert r.status_code == 200 and r.json()[0]["mrn"] == "MRN-1001"
    _, params = db.gets[0]
    assert params["limit"] == 10 and params["offset"] == 20
    assert "ilike.*Khan*" in params["or"]


@pytest.mark.parametrize("q", ["a,b", "x)", "a*b", "50%", "'; drop", "a(b"])
def test_search_cannot_inject_filter_syntax(db, q):
    assert client.get("/patients", params={"q": q}).status_code == 422 and db.gets == []


def test_patient_role_cannot_browse_all_patients(db):
    login("patient")
    assert client.get("/patients").status_code == 403


def test_my_record_for_patients(db):
    login("patient")
    assert client.get("/patients/me").status_code == 200
    assert db.gets[0][1]["user_id"] == f"eq.{DOCTOR}"           # looks up by the caller's own id


def test_my_record_404_until_linked(db):
    login("patient")
    db.rows["/rest/v1/patients"] = []
    assert client.get("/patients/me").status_code == 404


def test_staff_cannot_use_me(db):
    assert client.get("/patients/me").status_code == 403


def test_get_one_patient_and_hidden_is_404(db):
    assert client.get(f"/patients/{PATIENT}").status_code == 200
    db.rows["/rest/v1/patients"] = []
    assert client.get(f"/patients/{PATIENT}").status_code == 404


def test_update_patient(db):
    r = client.patch(f"/patients/{PATIENT}", json={"family_history": ["heart disease"]})
    assert r.status_code == 200
    assert db.patches[0][2] == {"family_history": ["heart disease"]}     # only what was sent


def test_update_needs_something_and_hidden_is_404(db):
    assert client.patch(f"/patients/{PATIENT}", json={}).status_code == 422
    db.patch_rows = []
    assert client.patch(f"/patients/{PATIENT}", json={"family_history": []}).status_code == 404


# ---- health measurements --------------------------------------------------------------------

def vital(**over):
    return {"kind": "vital", "name": "blood_pressure_systolic", "value": 132, "unit": "mmHg",
            "recorded_at": "2026-11-20T08:00:00Z", **over}


def lab(**over):
    return {"kind": "lab", "name": "HbA1c", "value": 7.2, "unit": "%", "reference_range": "4.0-5.6",
            "recorded_at": "2026-11-20T08:00:00Z", **over}


def test_add_vital_goes_to_vitals_table(db):
    r = client.post(f"/patients/{PATIENT}/measurements", json=vital())
    assert r.status_code == 201 and r.json()["kind"] == "vital"
    path, body = db.posts[0]
    assert path == "/rest/v1/vitals" and body["type"] == "blood_pressure_systolic" and body["patient_id"] == PATIENT


def test_add_lab_goes_to_lab_results_with_range(db):
    r = client.post(f"/patients/{PATIENT}/measurements", json=lab())
    assert r.status_code == 201 and r.json()["reference_range"] == "4.0-5.6"
    path, body = db.posts[0]
    assert path == "/rest/v1/lab_results" and body["test_name"] == "HbA1c"


def test_invalid_measurements_are_rejected(db):
    future = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    for bad in (vital(reference_range="4-5"), vital(recorded_at=future), vital(unit=""), vital(kind="other"),
                {**vital(), "extra": 1}):
        assert client.post(f"/patients/{PATIENT}/measurements", json=bad).status_code == 422, bad
    nan = client.post(f"/patients/{PATIENT}/measurements", headers={"content-type": "application/json"},
                      content='{"kind":"vital","name":"x","value":NaN,"unit":"u","recorded_at":"2026-11-20T08:00:00Z"}')
    assert nan.status_code == 422
    assert db.posts == []


def test_measurement_for_hidden_patient_is_404(db):
    db.rows["/rest/v1/patients"] = []
    assert client.post(f"/patients/{PATIENT}/measurements", json=vital()).status_code == 404
    assert db.posts == []


def test_nurses_and_patients_cannot_add_measurements(db):
    for role in ("nurse", "patient"):
        login(role)
        assert client.post(f"/patients/{PATIENT}/measurements", json=vital()).status_code == 403


def test_timeline_merges_vitals_and_labs_newest_first(db):
    db.rows["/rest/v1/vitals"] = [{"id": "a0000000-0000-0000-0000-000000000001", "type": "heart_rate", "value": 72,
                                   "unit": "bpm", "recorded_at": "2026-11-18T08:00:00+00:00"}]
    db.rows["/rest/v1/lab_results"] = [{"id": "b0000000-0000-0000-0000-000000000002", "test_name": "HbA1c",
                                        "value": 7.2, "unit": "%", "reference_range": "4.0-5.6",
                                        "recorded_at": "2026-11-20T08:00:00+00:00"}]
    r = client.get(f"/patients/{PATIENT}/measurements")
    assert r.status_code == 200
    assert [m["name"] for m in r.json()] == ["HbA1c", "heart_rate"]
    assert [m["kind"] for m in r.json()] == ["lab", "vital"]


def test_timeline_filters_by_kind_name_and_date(db):
    client.get(f"/patients/{PATIENT}/measurements", params={"kind": "lab", "name": "HbA1c", "since": "2026-11-01T00:00:00Z"})
    queried = [p for p, _ in db.gets if p != "/rest/v1/patients"]
    assert queried == ["/rest/v1/lab_results"]                                # only the labs table
    params = db.gets[-1][1]
    assert params["test_name"] == "eq.HbA1c" and params["recorded_at"].startswith("gte.2026-11-01")


def test_timeline_rejects_unknown_kind(db):
    assert client.get(f"/patients/{PATIENT}/measurements?kind=whatever").status_code == 422


def test_patient_can_read_own_timeline(db):
    login("patient")
    assert client.get(f"/patients/{PATIENT}/measurements").status_code == 200


# ---- linking a patient login ----------------------------------------------------------------

def test_admin_links_account_by_email(db, audit_rows):
    login("hospital_admin")
    r = client.put(f"/patients/{PATIENT}/link", json={"email": "Ayesha@Example.com"})
    assert r.status_code == 200
    assert db.service[0][2]["email"] == "eq.ayesha@example.com"          # lower-cased lookup
    assert db.patches[0][2] == {"user_id": ACCOUNT}
    assert audit_rows[0]["action"] == "patient.link" and audit_rows[0]["resource_id"] == PATIENT


def test_link_by_user_id(db):
    login("hospital_admin")
    assert client.put(f"/patients/{PATIENT}/link", json={"user_id": ACCOUNT}).status_code == 200
    assert db.service[0][2]["id"] == f"eq.{ACCOUNT}"


def test_cannot_link_a_staff_account(db):
    login("hospital_admin")
    db.profiles = [{"id": ACCOUNT, "role": "doctor"}]
    r = client.put(f"/patients/{PATIENT}/link", json={"user_id": ACCOUNT})
    assert r.status_code == 409 and db.patches == []


def test_link_unknown_account_is_404(db):
    login("hospital_admin")
    db.profiles = []
    assert client.put(f"/patients/{PATIENT}/link", json={"email": "no@one.com"}).status_code == 404
    assert db.patches == []


def test_account_already_linked_is_409(db):
    login("hospital_admin")
    db.patch_status = 409
    assert client.put(f"/patients/{PATIENT}/link", json={"user_id": ACCOUNT}).status_code == 409


def test_link_needs_exactly_one_identifier(db):
    login("hospital_admin")
    for bad in ({}, {"email": "a@b.com", "user_id": ACCOUNT}, {"email": "not-an-email"}):
        assert client.put(f"/patients/{PATIENT}/link", json=bad).status_code == 422


def test_link_hidden_patient_is_404_before_any_lookup(db):
    login("hospital_admin")
    db.rows["/rest/v1/patients"] = []
    assert client.put(f"/patients/{PATIENT}/link", json={"user_id": ACCOUNT}).status_code == 404
    assert db.service == []                                                 # no account lookup happened


@pytest.mark.parametrize("role", ["doctor", "nurse", "patient"])
def test_only_admins_link_accounts(db, role):
    login(role)
    assert client.put(f"/patients/{PATIENT}/link", json={"user_id": ACCOUNT}).status_code == 403
    assert client.delete(f"/patients/{PATIENT}/link").status_code == 403
    assert db.patches == [] and db.service == []


def test_unlink_clears_the_login(db):
    login("hospital_admin")
    assert client.delete(f"/patients/{PATIENT}/link").status_code == 200
    assert db.patches[0][2] == {"user_id": None}
