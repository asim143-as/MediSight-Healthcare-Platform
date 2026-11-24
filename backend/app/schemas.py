"""Request/response shapes. Pydantic rejects bad data before any endpoint code runs.

Rule from the team plan: NO silent defaults. Every model input is required, so a
missing value is an error instead of being quietly replaced by a guess.
"""
from datetime import datetime
from typing import Annotated, Any, Dict, Generic, List, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, Field

Bit = Annotated[int, Field(ge=0, le=1, description="0 = no, 1 = yes")]


class DiabetesFeatures(BaseModel):
    """CDC BRFSS indicators. Names must match what ml-service expects."""
    HighBP: Bit
    HighChol: Bit
    CholCheck: Bit
    BMI: float = Field(ge=10, le=100)
    Smoker: Bit
    Stroke: Bit
    HeartDiseaseorAttack: Bit
    PhysActivity: Bit
    Fruits: Bit
    Veggies: Bit
    HvyAlcoholConsump: Bit
    AnyHealthcare: Bit
    NoDocbcCost: Bit
    GenHlth: int = Field(ge=1, le=5, description="1 = excellent ... 5 = poor")
    MentHlth: int = Field(ge=0, le=30)
    PhysHlth: int = Field(ge=0, le=30)
    DiffWalk: Bit
    Sex: Bit = Field(description="1 = male, 0 = female")
    Age: int = Field(ge=1, le=13, description="BRFSS age group")
    Education: int = Field(ge=1, le=6)
    Income: int = Field(ge=1, le=8)


class HeartFeatures(BaseModel):
    """PROPOSED contract (UCI Heart Disease style). Shubham to confirm with the real model."""
    age: int = Field(ge=1, le=120)
    sex: Bit = Field(description="1 = male, 0 = female")
    cp: int = Field(ge=0, le=3, description="chest pain type")
    trestbps: int = Field(ge=50, le=260, description="resting blood pressure, mmHg")
    chol: int = Field(ge=80, le=700, description="serum cholesterol, mg/dL")
    fbs: Bit = Field(description="fasting blood sugar > 120 mg/dL")
    restecg: int = Field(ge=0, le=2)
    thalach: int = Field(ge=40, le=250, description="max heart rate achieved")
    exang: Bit = Field(description="exercise-induced angina")
    oldpeak: float = Field(ge=0, le=10, description="ST depression")
    slope: int = Field(ge=0, le=2)
    ca: int = Field(ge=0, le=4, description="major vessels coloured by fluoroscopy")
    thal: int = Field(ge=0, le=3)


class CKDFeatures(BaseModel):
    """PROPOSED contract (UCI Chronic Kidney Disease style). Shubham to confirm."""
    age: int = Field(ge=1, le=120)
    bp: int = Field(ge=40, le=250, description="blood pressure, mmHg")
    sg: float = Field(ge=1.000, le=1.040, description="urine specific gravity")
    al: int = Field(ge=0, le=5, description="albumin level")
    su: int = Field(ge=0, le=5, description="sugar level")
    bgr: float = Field(ge=20, le=800, description="random blood glucose, mg/dL")
    bu: float = Field(ge=1, le=400, description="blood urea, mg/dL")
    sc: float = Field(ge=0.1, le=80, description="serum creatinine, mg/dL")
    sod: float = Field(ge=90, le=170, description="sodium, mmol/L")
    pot: float = Field(ge=2, le=10, description="potassium, mmol/L")
    hemo: float = Field(ge=3, le=20, description="haemoglobin, g/dL")
    pcv: float = Field(ge=10, le=60, description="packed cell volume")
    htn: Bit = Field(description="hypertension")
    dm: Bit = Field(description="diabetes mellitus")


F = TypeVar("F", bound=BaseModel)


class PredictRequest(BaseModel, Generic[F]):
    patient_id: UUID
    features: F
    source_measurement_ids: List[UUID] = Field(
        default_factory=list,
        description="Report measurements these values came from. Each must be VERIFIED by a clinician.",
    )


class ExplanationOut(BaseModel):
    clinical_explanation: str
    shap_values: Dict[str, float]
    base_value: Optional[float] = None


class PredictionOut(BaseModel):
    id: UUID
    patient_id: UUID
    disease: str
    probability: float
    confidence: float
    severity: str
    model_version: str
    warnings: List[str]
    explanation: Optional[ExplanationOut]
    review_status: str = "pending"
    created_at: datetime


class PredictionHistoryItem(PredictionOut):
    reviewed_at: Optional[datetime] = None
    input_features: Dict[str, Any] = {}
