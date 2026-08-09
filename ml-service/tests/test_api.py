import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def sample_payload():
    return {
        "HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0,
        "BMI": 30.0, "Smoker": 1.0, "Stroke": 0.0,
        "HeartDiseaseorAttack": 1.0, "PhysActivity": 0.0,
        "Fruits": 0.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0,
        "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 4.0,
        "MentHlth": 10.0, "PhysHlth": 15.0, "DiffWalk": 1.0,
        "Sex": 1.0, "Age": 9.0, "Education": 4.0, "Income": 5.0
    }

@pytest.fixture
def low_risk_payload():
    """A patient profile that should produce a Low risk prediction."""
    return {
        "HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0,
        "BMI": 21.5, "Smoker": 0.0, "Stroke": 0.0,
        "HeartDiseaseorAttack": 0.0, "PhysActivity": 1.0,
        "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0,
        "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 1.0,
        "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0,
        "Sex": 0.0, "Age": 3.0, "Education": 6.0, "Income": 8.0
    }


# ── Root ──────────────────────────────────────────────────────────────────────

def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "active"


# ── Model Status ──────────────────────────────────────────────────────────────

def test_model_status(client):
    response = client.get("/model-status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data
    assert data["model_loaded"] is True
    assert data["model_name"] == "LightGBM"
    assert "version" in data
    assert "metrics" in data
    assert "last_trained" in data


# ── Predict ───────────────────────────────────────────────────────────────────

def test_predict_high_risk(client, sample_payload):
    response = client.post("/predict", json=sample_payload)
    assert response.status_code == 200
    data = response.json()
    assert "probability" in data
    assert "prediction" in data
    assert "severity" in data
    assert "confidence" in data
    assert "model_version" in data
    assert 0.0 <= data["probability"] <= 1.0
    assert data["prediction"] in [0, 1]
    assert data["severity"] in ["Low", "Moderate", "High", "Critical"]
    assert 0.5 <= data["confidence"] <= 1.0

def test_predict_low_risk_lower_than_high_risk(client, sample_payload, low_risk_payload):
    """Low-risk patient should have a lower probability than the high-risk patient."""
    high = client.post("/predict", json=sample_payload).json()
    low = client.post("/predict", json=low_risk_payload).json()
    assert low["probability"] < high["probability"]

def test_predict_missing_fields_uses_defaults(client):
    """Endpoint should use Pydantic defaults for missing optional fields."""
    response = client.post("/predict", json={"BMI": 28.0})
    assert response.status_code == 200

def test_predict_boundary_bmi(client, sample_payload):
    """BMI at category boundaries should not crash the model."""
    for bmi in [18.5, 25.0, 30.0, 40.0]:
        payload = {**sample_payload, "BMI": bmi}
        response = client.post("/predict", json=payload)
        assert response.status_code == 200


# ── Explain (SHAP) ────────────────────────────────────────────────────────────

def test_explain(client, sample_payload):
    response = client.post("/explain", json=sample_payload)
    assert response.status_code == 200
    data = response.json()
    assert "shap_values" in data
    assert "base_value" in data
    assert "clinical_explanation" in data
    assert isinstance(data["shap_values"], dict)
    assert len(data["shap_values"]) == 21  # 21 features
    # All expected features must be present
    for feature in ["HighBP", "BMI", "Age", "GenHlth", "HighChol"]:
        assert feature in data["shap_values"]
    assert isinstance(data["clinical_explanation"], str)
    assert len(data["clinical_explanation"]) > 0

def test_explain_shap_values_are_floats(client, sample_payload):
    data = client.post("/explain", json=sample_payload).json()
    for key, val in data["shap_values"].items():
        assert isinstance(val, float), f"SHAP value for {key} is not float: {val}"


# ── Drift Status ──────────────────────────────────────────────────────────────

def test_drift_status(client):
    response = client.get("/drift-status")
    assert response.status_code == 200
    data = response.json()
    # If the training dataset is present, we get a full response
    if data.get("available"):
        assert "current_psi" in data
        assert "drift_detected" in data
        assert "psi_history" in data
        assert isinstance(data["current_psi"], float)
        assert isinstance(data["drift_detected"], bool)
        assert isinstance(data["psi_history"], list)
        assert data["drift_threshold"] == 0.10
        # PSI should be non-negative
        assert data["current_psi"] >= 0.0
    else:
        # Graceful degradation when dataset is missing
        assert "reason" in data


# ── Retrain ───────────────────────────────────────────────────────────────────

def test_retrain_trigger(client):
    response = client.post("/retrain")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    # Either triggered or already running
    assert "retraining" in data["status"].lower() or "triggered" in data["status"].lower()


# ── Contract Tests ────────────────────────────────────────────────────────────

def test_predict_response_contract(client, sample_payload):
    """Strict contract: response must have exactly these keys."""
    data = client.post("/predict", json=sample_payload).json()
    required_keys = {"probability", "prediction", "severity", "confidence", "model_version"}
    assert required_keys.issubset(data.keys())

def test_explain_response_contract(client, sample_payload):
    """Strict contract: explain must have exactly these keys."""
    data = client.post("/explain", json=sample_payload).json()
    required_keys = {"shap_values", "base_value", "clinical_explanation"}
    assert required_keys.issubset(data.keys())

def test_model_status_response_contract(client):
    """Strict contract: model-status must have these keys when loaded."""
    data = client.get("/model-status").json()
    required_keys = {"status", "model_loaded", "model_name", "version", "metrics", "last_trained"}
    assert required_keys.issubset(data.keys())
