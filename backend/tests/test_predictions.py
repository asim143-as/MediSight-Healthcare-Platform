import httpx
import pytest
from fastapi.testclient import TestClient

from app import ml
from app import supabase as sb
from app.auth import CurrentUser, get_current_user
from app.main import app

PATIENT = "22222222-2222-2222-2222-222222222222"
OTHER_PATIENT = "33333333-3333-3333-3333-333333333333"
PRED_ID = "44444444-4444-4444-4444-444444444444"
M_OK = "55555555-5555-5555-5555-555555555555"
M_PENDING = "66666666-6666-6666-6666-666666666666"
M_OTHER = "77777777-7777-7777-7777-777777777777"

DIABETES = dict(HighBP=1, HighChol=0, CholCheck=1, BMI=31.5, Smoker=0, Stroke=0, HeartDiseaseorAttack=0,
                PhysActivity=1, Fruits=1, Veggies=1, HvyAlcoholConsump=0, AnyHealthcare=1, NoDocbcCost=0,
                GenHlth=3, MentHlth=2, PhysHlth=0, DiffWalk=0, Sex=1, Age=7, Education=5, Income=6)
HEART = dict(age=58, sex=1, cp=2, trestbps=150, chol=260, fbs=0, restecg=1, thalach=140, exang=1,
             oldpeak=2.0, slope=1, ca=1, thal=2)
CKD = dict(age=60, bp=90, sg=1.015, al=2, su=0, bgr=140, bu=60, sc=3.2, sod=135, pot=4.5, hemo=10.5,
           pcv=32, htn=1, dm=1)


class FakeDB:
    """Records what the backend writes; answers reads like Supabase + RLS would."""

    def __init__(self, patient_visible=True, insert_status=201, history=None):
        self.patient_visible, self.insert_status, self.history = patient_visible, insert_status, history or []
        self.posts = []
        self.measurements = [
            {"id": M_OK, "status": "verified", "reports": {"patient_id": PATIENT}},
            {"id": M_PENDING, "status": "extracted", "reports": {"patient_id": PATIENT}},
            {"id": M_OTHER, "status": "verified", "reports": {"patient_id": OTHER_PATIENT}},
        ]

    async def get(self, path, token, params=None):
        if path == "/rest/v1/patients":
            return httpx.Response(200, json=[{"id": PATIENT}] if self.patient_visible else [])
        if path == "/rest/v1/report_measurements":
            wanted = params["id"][4:-1].split(",")  # "in.(a,b)" -> ["a", "b"]
            return httpx.Response(200, json=[m for m in self.measurements if m["id"] in wanted])
        if path == "/rest/v1/predictions":
            return httpx.Response(200, json=self.history)
        raise AssertionError(path)

    async def post(self, path, token, json):
        self.posts.append((path, json))
        if path == "/rest/v1/predictions":
            if self.insert_status >= 400:
                return httpx.Response(self.insert_status, json={"code": "42501"})
            return httpx.Response(201, json=[{**json, "id": PRED_ID, "created_at": "2026-11-25T10:00:00+00:00"}])
        return httpx.Response(201, json=[json])

    def saved(self, path):
        return [j for p, j in self.posts if p == path]


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(sb, "supabase_get", fake.get)
    monkeypatch.setattr(sb, "supabase_post", fake.post)

    async def fake_diabetes(features):
        return ml.ModelResult(0.82, 0.82, "Critical", "1.0.0", "Risk elevated due to High BP.",
                              {"HighBP": 0.2, "BMI": 0.1}, 0.45)

    monkeypatch.setattr(ml, "_diabetes", fake_diabetes)
    return fake


def login(role="doctor", status="approved"):
    user = CurrentUser("u1", "d@x.test", "Dr X", role, None, status if role == "doctor" else None, "tok")
    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture(autouse=True)
def reset_login():
    login()
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def body(features=DIABETES, **extra):
    return {"patient_id": PATIENT, "features": features, **extra}


def test_diabetes_prediction_saved_with_inputs_explanation_and_warnings(db):
    r = client.post("/predict/diabetes", json=body())
    assert r.status_code == 201
    out = r.json()
    assert out["disease"] == "Diabetes" and out["severity"] == "Critical"
    assert out["review_status"] == "pending"
    assert out["explanation"]["shap_values"]["HighBP"] == 0.2
    saved = db.saved("/rest/v1/predictions")[0]
    assert saved["input_features"]["BMI"] == 31.5          # exact inputs kept for traceability
    assert saved["patient_id"] == PATIENT
    assert len(db.saved("/rest/v1/explanations")) == 1


def test_missing_input_is_rejected_not_defaulted(db):
    f = {k: v for k, v in DIABETES.items() if k != "BMI"}
    r = client.post("/predict/diabetes", json=body(f))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"
    assert "BMI" in str(r.json()["error"]["details"])
    assert db.posts == []


def test_out_of_range_input_is_rejected(db):
    r = client.post("/predict/diabetes", json=body({**DIABETES, "BMI": 400}))
    assert r.status_code == 422 and db.posts == []


def test_patient_not_visible_is_404_and_nothing_runs_or_saves(db):
    db.patient_visible = False
    r = client.post("/predict/diabetes", json=body())
    assert r.status_code == 404 and db.posts == []


def test_unverified_measurement_is_rejected(db):
    r = client.post("/predict/diabetes", json=body(source_measurement_ids=[M_OK, M_PENDING]))
    assert r.status_code == 409 and db.posts == []
    msg = r.json()["error"]["message"]
    assert M_PENDING in msg and M_OK not in msg   # names only the offending value


def test_measurement_from_another_patient_is_rejected(db):
    r = client.post("/predict/diabetes", json=body(source_measurement_ids=[M_OTHER]))
    assert r.status_code == 409 and db.posts == []
    assert M_OTHER in r.json()["error"]["message"]


def test_verified_measurement_is_linked(db):
    r = client.post("/predict/diabetes", json=body(source_measurement_ids=[M_OK]))
    assert r.status_code == 201
    assert db.saved("/rest/v1/predictions")[0]["source_measurement_ids"] == [M_OK]


@pytest.mark.parametrize("role,status", [("patient", None), ("nurse", None), ("doctor", "pending")])
def test_only_approved_doctors_can_run_predictions(db, role, status):
    login(role, status)
    assert client.post("/predict/diabetes", json=body()).status_code == 403
    assert db.posts == []


def test_rls_denied_insert_becomes_403(db):
    db.insert_status = 403
    assert client.post("/predict/diabetes", json=body()).status_code == 403


@pytest.mark.parametrize("path,features,disease", [("heart", HEART, "Heart Disease"), ("ckd", CKD, "CKD")])
def test_stub_models_work_and_are_clearly_labelled(db, path, features, disease):
    r = client.post(f"/predict/{path}", json=body(features))
    assert r.status_code == 201
    out = r.json()
    assert out["disease"] == disease and out["model_version"] == "stub-0"
    assert any("Placeholder" in w for w in out["warnings"])
    assert out["explanation"] is None


def test_stub_risk_rises_with_risk_factors():
    low = ml._stub("ckd", {**CKD, "sc": 1.0, "hemo": 15, "bp": 70, "htn": 0, "dm": 0}).probability
    high = ml._stub("ckd", CKD).probability
    assert high > low


def test_borderline_probability_gets_uncertainty_warning(db, monkeypatch):
    async def borderline(features):
        return ml.ModelResult(0.52, 0.52, "High", "1.0.0", "x")
    monkeypatch.setattr(ml, "_diabetes", borderline)
    out = client.post("/predict/diabetes", json=body()).json()
    assert any("decision boundary" in w for w in out["warnings"])


def test_history_newest_first_with_explanation_and_review(db):
    db.history = [{
        "id": PRED_ID, "patient_id": PATIENT, "disease": "Diabetes", "probability": 0.8, "confidence": 0.8,
        "severity": "Critical", "model_version": "1.0.0", "warnings": [], "input_features": {"BMI": 30},
        "created_at": "2026-11-25T10:00:00+00:00",
        "explanations": {"clinical_explanation": "why", "shap_payload": {"shap_values": {"BMI": 0.1}, "base_value": 0.4}},
        "clinical_reviews": {"decision": "accepted", "reviewed_at": "2026-11-25T11:00:00+00:00"},
    }]
    r = client.get(f"/patients/{PATIENT}/predictions")
    assert r.status_code == 200
    item = r.json()[0]
    assert item["review_status"] == "accepted" and item["explanation"]["shap_values"] == {"BMI": 0.1}


def test_history_for_hidden_patient_is_404(db):
    db.patient_visible = False
    assert client.get(f"/patients/{PATIENT}/predictions").status_code == 404


def test_patient_can_read_own_history_but_gets_pending_status(db):
    login("patient")
    db.history = [{"id": PRED_ID, "patient_id": PATIENT, "disease": "CKD", "probability": 0.3, "confidence": 0.7,
                   "severity": "Moderate", "model_version": "stub-0", "warnings": [], "input_features": {},
                   "created_at": "2026-11-25T10:00:00+00:00", "explanations": None, "clinical_reviews": None}]
    r = client.get(f"/patients/{PATIENT}/predictions")
    assert r.status_code == 200 and r.json()[0]["review_status"] == "pending"
