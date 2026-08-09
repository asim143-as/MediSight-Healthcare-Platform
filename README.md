# MediSight AI

Enterprise Healthcare Early Disease Risk Prediction & Clinical Decision Support Platform.

## Monorepo Architecture

- `frontend/`: Next.js 14 web application (App Router, Tailwind CSS, shadcn/ui).
- `supabase/`: Database schema, migrations, RLS policies, and Edge Functions.
- `ml-service/`: FastAPI service for machine learning inference, explainability (SHAP), experiment tracking (MLflow), and model retraining.

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase CLI

### 1. Supabase Backend Setup
Configure your environment variables and apply migrations to your live Supabase database:
```bash
# Link to your Supabase project (needs project ref from Supabase dashboard)
supabase link --project-ref your-project-ref

# Apply all schema migrations
supabase db push
```

### 2. ML Service Setup
The machine learning pipeline is housed in `ml-service/`.

```bash
cd ml-service

# Create virtual environment
python -m venv venv
# Activate virtual environment (Windows)
venv\Scripts\activate
# Activate virtual environment (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### A. Seed Database (Demo Data)
To truncate tables and seed the Supabase database with 400 patient records (100 per dataset) and their associated vitals, lab results, diagnoses, and compliance data:
```bash
python model_training/seed_db.py
```

#### B. Train Predictive Models
To train the models (Logistic Regression baseline, Random Forest, XGBoost, and LightGBM) on the CDC BRFSS Diabetes health indicators dataset, log runs to MLflow, and save the best model:
```bash
python model_training/train.py
```

#### C. Run the FastAPI Prediction Service
To spin up the local FastAPI service on port 8000:
```bash
uvicorn app.main:app --reload
```

---

## 🧪 Running Unit Tests

Both the clinical feature engineering module and the FastAPI prediction endpoints are fully covered by unit tests.

To run the complete test suite:
```bash
# Make sure you are in the root directory or ml-service directory
pytest ml-service/tests/
```

- **Feature Engineering Tests**: Checks BMI staging, blood pressure AHA categories, kidney eGFR Stages, cholesterol ratios, and composite risk indexes.
- **FastAPI Endpoints Tests**: Asserts correct behavior for `/model-status`, `/predict`, `/explain` (SHAP explanation and clinical text generator), and `/retrain`.

---

## 📊 Clinical Datasets Disclosures

As this is an enterprise clinical predictive platform, we ingest, process, and train models using de-identified clinical datasets containing real health indicators:
1. **Diabetes Health Indicators**: CDC BRFSS 2015 dataset containing 253,680 survey responses.
2. **Heart Disease Health Indicators**: CDC BRFSS 2015 dataset for cardiovascular disease.
3. **Chronic Kidney Disease (CKD) Dataset**: Containing continuous clinical metrics (GFR, Creatinine, Electrolytes, HbA1c).
4. **Stroke Prediction Dataset**: Structured clinical risk factors (hypertension, heart disease, average glucose level, BMI).
5. **Liver Patient Dataset (LPD)**: Continuous enzyme and protein metrics (bilirubin, SGPT, SGOT, albumin).
6. **Breast Cancer Wisconsin Dataset**: Nuclear feature measurements from fine needle aspirates.
7. **Hypertension Health Indicators**: BRFSS 2015 indicators for blood pressure risk factors.

*Note: All data has been de-identified and is formatted in FHIR-like observations (vitals, lab results, medications, and diagnoses) inside the Supabase Postgres database for demonstration and training.*
