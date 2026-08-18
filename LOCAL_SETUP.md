# MediSight AI - Local Development Setup Guide

## Project Overview

**MediSight AI** is an enterprise healthcare platform combining:
- 🖥️ **Frontend**: Next.js 14 web application (TypeScript, Tailwind, shadcn/ui)
- 🗄️ **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- 🤖 **ML Service**: FastAPI with ML models (XGBoost, LightGBM), SHAP explainability, MLflow tracking
- 📊 **Features**: Multi-disease risk prediction (Diabetes, Heart Disease, Stroke, etc.), AI Assistant, Alerts, Clinical Decision Support

---

## Prerequisites

Ensure you have installed:
- **Node.js 18+** (for frontend)
- **Python 3.10+** (for ML service)
- **Git** (for version control)
- **Supabase CLI** (for local database)
- **PostgreSQL 17** (required by Supabase local dev)

### Installation Commands

```bash
# Install Node.js (if not already installed)
# Download from https://nodejs.org

# Install Python (if not already installed)
# Download from https://www.python.org

# Install Supabase CLI
npm install -g supabase

# Verify installations
node --version
python --version
supabase --version
```

---

## Setup & Run Instructions

### Step 1: Initialize Supabase Local Development

```bash
cd c:\Users\toshiba\Desktop\MediSight-Healthcare-Platform

# Start Supabase local services (PostgreSQL, API, Auth, etc.)
supabase start

# This will:
# - Start PostgreSQL on port 54322
# - Start API on port 54321
# - Start Studio on http://localhost:54323
# - Load all migrations from supabase/migrations/
```

**Expected Output:**
```
Seeding data for project 'Ezitech_Internship_Task'.
Finished `supabase seed` (in 5.2s)
Started 'auth' (PID 12345).
Started 'storage' (PID 12346).
Started 'functions' (in 1234ms).
Started 'realtime' (PID 12347).
Started 'rest' (PID 12348).
Started 'postgres' (PID 12349).

Supabase local development environment is running.
Studio: http://localhost:54323
API: http://localhost:54321
DB: postgresql://postgres:postgres@localhost:54322/postgres
```

### Step 2: Setup ML Service

```bash
cd c:\Users\toshiba\Desktop\MediSight-Healthcare-Platform\ml-service

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000

# Expected output:
# Uvicorn running on http://127.0.0.1:8000
# Loaded production model: LightGBM (AUC: 0.8307)
```

**API Endpoints Available:**
- `POST /predict` - Make predictions
- `POST /explain` - Get SHAP explanations
- `GET /status` - Health check
- `POST /retrain-trigger` - Trigger model retraining
- `GET /metrics` - Model performance metrics

### Step 3: Setup & Run Frontend

```bash
cd c:\Users\toshiba\Desktop\MediSight-Healthcare-Platform\frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aXRlY2giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMzExMTAxMiwiZXhwIjoxODgwODc3MDEyfQ.1234567890" >> .env.local

# Start development server
npm run dev

# Access application at:
# http://localhost:3000
```

---

## Architecture & Components

### Frontend (Next.js 14)
```
src/
├── app/                          # App Router pages
│   ├── (auth)/                   # Auth flows (login, signup, onboarding)
│   ├── (dashboard)/              # Main dashboard
│   ├── patient/                  # Patient records
│   ├── admin-portal/             # Admin panel
│   └── api/                      # API routes
├── components/
│   ├── layout/                   # Header, Sidebar, Footer
│   ├── shared/                   # Reusable components
│   └── ui/                       # shadcn/ui components
└── lib/
    ├── supabase/                 # Supabase client config
    └── utils.ts                  # Helper functions
```

**Key Pages:**
- `/` - Welcome/Landing
- `/login` - User login
- `/signup` - User registration
- `/dashboard` - Main dashboard with alerts & risk overview
- `/patient` - Patient list & details
- `/admin-portal` - Admin management

### Supabase Backend
```
supabase/
├── migrations/                   # SQL schema definitions (17 migration files)
│   ├── 20260723110308_initial_schema.sql
│   ├── 20260723143100_critical_alert_webhook.sql
│   ├── 20260726120000_seed_model_registry.sql
│   └── ... (14 more)
├── functions/                    # Edge Functions (Deno TypeScript)
│   ├── predict-risk/            # Risk prediction orchestration
│   ├── ai-assistant-chat/       # LLM-powered chat
│   ├── send-alert/              # Alert notification
│   ├── export-report/           # Report generation
│   └── retrain-trigger/         # ML model retraining
└── config.toml                   # Local development config
```

**Database Schema Highlights:**
- `users` - User accounts & authentication
- `doctors` - Doctor profiles & specialization
- `patients` - Patient records
- `clinical_observations` - Vitals, lab results
- `predictions` - AI predictions with SHAP explanations
- `alerts` - Risk alerts for patients
- `model_registry` - ML model versions & metadata

### ML Service (FastAPI)
```
ml-service/
├── app/
│   ├── main.py                  # FastAPI app & endpoints
│   └── models/                  # Pydantic request/response schemas
├── model_training/
│   ├── train.py                 # Model training pipeline
│   ├── features.py              # Feature engineering
│   └── evaluation_report.md     # Results summary
├── models/
│   └── production/              # Trained model artifacts
│       ├── model.joblib         # LightGBM model (0.8307 AUC)
│       └── model_metadata.json  # Feature names, metrics
└── tests/
    ├── test_api.py              # API endpoint tests
    ├── test_features.py         # Feature engineering tests
    └── test_rls_policies.py     # Database security tests
```

**ML Models Trained:**
- Logistic Regression (baseline)
- Random Forest
- **XGBoost** (AUC: 0.8280)
- **LightGBM** (AUC: 0.8307) ⭐ **Production Model**

**Prediction Features:**
- Blood Glucose, Blood Pressure, Cholesterol, BMI
- Family History, Age, Physical Activity
- Health Conditions (Smoker, Heart Disease, etc.)

---

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-studio>
```

### ML Service (.env)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
ML_SERVICE_PORT=8000
MLFLOW_TRACKING_URI=file:./mlruns
```

---

## Database Access

### Via Supabase Studio (Web UI)
```
URL: http://localhost:54323
Credentials:
- Email: supabase@example.com
- Password: password (default)
```

### Via psql (Command Line)
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres

# Common queries:
SELECT COUNT(*) FROM patients;
SELECT COUNT(*) FROM predictions;
SELECT COUNT(*) FROM alerts WHERE status = 'active';
```

---

## Common Development Workflows

### Test API Endpoints

```bash
# ML Service health check
curl http://localhost:8000/status

# Make a prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "blood_glucose": 125,
    "blood_pressure_systolic": 140,
    "blood_pressure_diastolic": 90,
    "bmi": 28,
    "age": 45,
    "family_history_diabetes": 1
  }'

# Get SHAP explanation
curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -d '{...patient_data...}'
```

### Run Tests

```bash
# Frontend tests
cd frontend
npm run lint

# ML Service tests
cd ml-service
pytest tests/ -v
pytest tests/ --cov=app
```

### Check Logs

```bash
# Frontend console
# Check browser DevTools (F12)

# ML Service
# Logs print to terminal where uvicorn is running

# Supabase functions
supabase functions list
supabase functions logs
```

---

## Troubleshooting

### Issue: Port Already in Use
```bash
# Check what's using ports 3000, 8000, 54321, 54322
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or use different ports
npm run dev -- -p 3001
uvicorn app.main:app --port 8001
```

### Issue: Supabase Won't Start
```bash
# Check Docker is running
docker info

# Restart Supabase
supabase stop
supabase start

# Check Supabase logs
supabase status
```

### Issue: Python Dependency Issues
```bash
# Clear pip cache
pip cache purge

# Reinstall dependencies
pip install --no-cache-dir -r requirements.txt

# Check installed packages
pip list
```

### Issue: Model Won't Load
```bash
# Check if model file exists
ls ml-service/models/production/

# If missing, retrain model
python ml-service/model_training/train.py

# Verify model path in main.py
```

---

## Useful Commands Reference

```bash
# Supabase
supabase start                  # Start local environment
supabase stop                   # Stop all services
supabase status                 # Check service status
supabase db push                # Push schema changes
supabase db pull                # Pull remote schema
supabase functions deploy       # Deploy Edge Functions

# Frontend (Next.js)
npm run dev                     # Start development server
npm run build                   # Build for production
npm run lint                    # Run ESLint
npm run start                   # Start production server

# ML Service
uvicorn app.main:app --reload  # Start with auto-reload
pytest tests/ -v                # Run tests with verbose output
python model_training/train.py  # Retrain models
```

---

## API Documentation

### ML Service Endpoints

#### POST /predict
Predict disease risk for a patient.

**Request:**
```json
{
  "blood_glucose": 125,
  "blood_pressure_systolic": 140,
  "blood_pressure_diastolic": 90,
  "bmi": 28,
  "age": 45,
  "family_history_diabetes": 1,
  "smoker": 0,
  "physical_activity": 1
}
```

**Response:**
```json
{
  "prediction": 0.72,
  "disease": "Diabetes",
  "risk_level": "high",
  "confidence": 0.92
}
```

#### POST /explain
Get SHAP explanations for predictions.

**Response:**
```json
{
  "base_value": 0.45,
  "shap_values": [0.15, -0.08, 0.22, ...],
  "feature_names": ["blood_glucose", "bmi", "age", ...],
  "explanation": "High blood glucose (+0.15) and BMI (+0.22) are major risk factors"
}
```

#### GET /metrics
Get model performance metrics.

**Response:**
```json
{
  "model_name": "LightGBM",
  "auc_roc": 0.8307,
  "accuracy": 0.81,
  "precision": 0.79,
  "recall": 0.83
}
```

---

## Project Structure Details

- **Monorepo**: Frontend, ML Service, and Database all in one repo
- **CI/CD Ready**: GitHub Actions workflows configured (see `.github/workflows/`)
- **Deployment Ready**: Configured for Vercel (Frontend), Render (ML Service), Supabase Cloud (Database)
- **Testing**: Comprehensive test suites for API, ML features, and database security

---

## Next Steps After Setup

1. **Explore Dashboard**: Login and view patient data, risk predictions, and alerts
2. **Test Predictions**: Use the Patient Portal to upload clinical data and get risk predictions
3. **Review AI Assistant**: Chat with the LLM-powered clinical assistant
4. **Check Admin Panel**: Explore model registry, drift monitoring, and retraining options
5. **Read Documentation**: See `README.md`, `PLAN.md`, and `docs/PRD.md` for detailed information

---

## Support & Documentation

- Main README: [README.md](README.md)
- Implementation Plan: [PLAN.md](PLAN.md)
- PRD: [docs/PRD.md](docs/PRD.md)
- Viva Prep: [VIVA_PREP_GUIDE.md](VIVA_PREP_GUIDE.md)

---

**Last Updated**: August 18, 2026
