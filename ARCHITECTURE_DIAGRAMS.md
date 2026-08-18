# MediSight AI - Architecture & Deployment Diagrams

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MediSight AI Platform                            │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER (Frontend)                      │
│                          Next.js 14 (React 18)                           │
│                        http://localhost:3000                             │
│                                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │    Auth     │  │  Dashboard  │  │   Patient   │  │    Admin    │   │
│  │  Pages      │  │  Overview   │  │  Management │  │    Portal   │   │
│  │             │  │             │  │             │  │             │   │
│  │ • Login     │  │ • Alerts    │  │ • List      │  │ • Users     │   │
│  │ • Signup    │  │ • Stats     │  │ • Detail    │  │ • Models    │   │
│  │ • Password  │  │ • Charts    │  │ • Predict   │  │ • Analytics │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                           │
│  Built with: TypeScript, Tailwind CSS, shadcn/ui, Framer Motion         │
│  State: Zustand, React Query, React Hook Form                           │
│  Charts: Recharts (for SHAP visualizations)                             │
└────────────────────────────────────────────────────────────────────────┬┘
                                 │
                    ┌────────────┴────────────┐
                    │   HTTP/WebSocket       │
                    │   JSON API Calls       │
                    │                        │
        ┌───────────▼──────────┐   ┌────────▼──────────┐
        │                      │   │                   │
┌───────┴──────────────────────▼─┐ │ ┌────────────────▼──────┐
│   BACKEND LAYER (Supabase)     │ │ │  ML SERVICE (FastAPI) │
│   PostgreSQL + Edge Functions  │ │ │  http://localhost:8000│
│   http://localhost:54321        │ │ │                      │
│                                 │ │ │ ┌─────────────────┐  │
│ ┌─────────────────────────────┐ │ │ │ │ LightGBM Model  │  │
│ │    Database (PostgreSQL)    │ │ │ │ │ AUC: 0.8307     │  │
│ │                             │ │ │ │ └─────────────────┘  │
│ │  Core Tables:               │ │ │ │                      │
│ │  • users (Auth)             │ │ │ │ ┌─────────────────┐  │
│ │  • patients                 │ │ │ │ │ SHAP Explainer  │  │
│ │  • doctors                  │ │ │ │ │ Feature Importance
│ │  • clinical_observations    │ │ │ │ └─────────────────┘  │
│ │  • predictions              │ │ │ │                      │
│ │  • alerts                   │ │ │ │ Endpoints:           │
│ │  • chat_messages            │ │ │ │ • POST /predict      │
│ │  • diagnoses                │ │ │ │ • POST /explain      │
│ │  • medications              │ │ │ │ • GET /metrics       │
│ │  ... 25+ tables total       │ │ │ │ • POST /retrain      │
│ │                             │ │ │ └─────────────────────┘
│ │ Security: RLS on all tables │ │ │                      │
│ └─────────────────────────────┘ │ │ Technology Stack:     │
│                                 │ │ • scikit-learn        │
│ ┌─────────────────────────────┐ │ │ • XGBoost             │
│ │   Edge Functions (Deno)     │ │ │ • LightGBM            │
│ │                             │ │ │ • SHAP                │
│ │ • predict-risk              │ │ │ • MLflow              │
│ │ • ai-assistant-chat         │ │ │ • PostgreSQL driver   │
│ │ • send-alert                │ │ │ • Uvicorn ASGI        │
│ │ • export-report             │ │ └───────────────────────┘
│ │ • retrain-trigger           │ │
│ │ • admin-user-invite         │ │
│ │                             │ │
│ │ Webhook handlers:           │ │
│ │ • Alert notifications       │ │
│ │ • Model retraining trigger  │ │
│ └─────────────────────────────┘ │
│                                 │
│ Auth: JWT (via Supabase Auth)   │
│ API: PostgreSQL REST API        │
│ Real-time: WebSocket via REST   │
│ Storage: Buckets for reports    │
└─────────────────────────────────┘

```

---

## 2. Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Data Flow - Prediction Request                 │
└──────────────────────────────────────────────────────────────────────┘

 Patient/Doctor Uses App
 │
 ├─ Enters clinical data
 │  (Blood glucose, BP, BMI, etc.)
 │
 ▼
[Frontend - Prediction Form]
 │
 ├─ Validates input with Zod
 │ ├─ Range checks
 │ └─ Required field checks
 │
 ├─ Sends POST request to
 │  http://localhost:8000/predict
 │
 ▼
[ML Service - FastAPI]
 │
 ├─ Receives JSON with patient features
 │
 ├─ Feature Engineering
 │  ├─ Blood pressure categorization
 │  ├─ BMI classification
 │  ├─ eGFR calculation
 │  └─ Cholesterol ratio calculations
 │
 ├─ Load LightGBM Model
 │  └─ From: ml-service/models/production/model.joblib
 │
 ├─ Generate Prediction
 │  ├─ Input features (21 total)
 │  └─ Output: Risk score (0-1)
 │
 ├─ Generate SHAP Explanation
 │  ├─ Calculate SHAP values for each feature
 │  ├─ Base value: 0.45
 │  └─ Feature contributions: +/- per feature
 │
 ├─ Return JSON Response
 │  ├─ prediction: 0.72
 │  ├─ risk_level: "high"
 │  ├─ shap_values: [...]
 │  └─ explanation: "High blood glucose..."
 │
 ▼
[Frontend - Display Results]
 │
 ├─ Show Prediction Score
 │  └─ Colored badge (green/yellow/red)
 │
 ├─ Show SHAP Waterfall Chart
 │  ├─ Base value on left
 │  ├─ Feature contributions as bars
 │  └─ Final prediction on right
 │
 ├─ Show Clinical Explanation
 │  └─ Text summary of key risk factors
 │
 └─ (Optional) Store in Supabase
    ├─ INSERT into predictions table
    ├─ INSERT into prediction_explanations table
    └─ Trigger alert if risk is high
        └─ Call Edge Function: send-alert
           └─ Notify doctor via Supabase

```

---

## 3. Database Schema - Key Tables

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION & USERS                        │
└──────────────────────────────────────────────────────────────────┘

users (Supabase Auth)
├─ id (UUID) [PK]
├─ email
├─ role: 'doctor' | 'patient' | 'admin'
├─ created_at
└─ updated_at

┌──────────────────────────────────────────────────────────────────┐
│                    CLINICAL DATA                                 │
└──────────────────────────────────────────────────────────────────┘

patients
├─ id (UUID) [PK]
├─ user_id (FK → users)
├─ name
├─ age
├─ gender
├─ medical_history
└─ created_at

doctors
├─ id (UUID) [PK]
├─ user_id (FK → users)
├─ name
├─ specialization
├─ hospital_id (FK → hospitals)
├─ license_number
└─ verified_at

clinical_observations
├─ id (UUID) [PK]
├─ patient_id (FK → patients)
├─ recorded_at
├─ blood_glucose
├─ blood_pressure_systolic
├─ blood_pressure_diastolic
├─ bmi
├─ cholesterol
└─ ... (20+ vital fields)

diagnoses
├─ id (UUID) [PK]
├─ patient_id (FK → patients)
├─ icd_code
├─ diagnosis_name
├─ diagnosed_date
└─ status: 'active' | 'resolved'

medications
├─ id (UUID) [PK]
├─ patient_id (FK → patients)
├─ medication_name
├─ dosage
├─ frequency
└─ prescribed_date

┌──────────────────────────────────────────────────────────────────┐
│                    ML PREDICTIONS                                │
└──────────────────────────────────────────────────────────────────┘

predictions
├─ id (UUID) [PK]
├─ patient_id (FK → patients)
├─ model_id (FK → model_registry)
├─ disease: 'diabetes' | 'heart_disease' | ...
├─ prediction_score (0-1)
├─ risk_level: 'low' | 'medium' | 'high'
├─ confidence
├─ predicted_at
└─ status: 'active' | 'reviewed' | 'acknowledged'

prediction_explanations
├─ id (UUID) [PK]
├─ prediction_id (FK → predictions)
├─ base_value
├─ shap_values (JSON array)
├─ feature_names (JSON array)
├─ explanation_text
└─ created_at

model_registry
├─ id (UUID) [PK]
├─ model_name: 'LightGBM', 'XGBoost', ...
├─ version: '1.0.0'
├─ auc_roc: 0.8307
├─ accuracy: 0.81
├─ precision: 0.79
├─ recall: 0.83
├─ training_data_size: 70692
├─ is_production: true | false
├─ trained_at
└─ deployment_date

retraining_logs
├─ id (UUID) [PK]
├─ model_id (FK → model_registry)
├─ started_at
├─ completed_at
├─ status: 'pending' | 'running' | 'success' | 'failed'
├─ metrics_json
└─ error_message

┌──────────────────────────────────────────────────────────────────┐
│                    ALERTS & NOTIFICATIONS                        │
└──────────────────────────────────────────────────────────────────┘

alerts
├─ id (UUID) [PK]
├─ patient_id (FK → patients)
├─ doctor_id (FK → doctors)
├─ prediction_id (FK → predictions)
├─ severity: 'low' | 'medium' | 'high' | 'critical'
├─ message
├─ created_at
├─ status: 'active' | 'acknowledged' | 'resolved'
└─ resolved_at

alert_acknowledgements
├─ id (UUID) [PK]
├─ alert_id (FK → alerts)
├─ doctor_id (FK → doctors)
├─ acknowledged_at
├─ notes
└─ action_taken

notifications
├─ id (UUID) [PK]
├─ user_id (FK → users)
├─ type: 'alert' | 'message' | 'system'
├─ title
├─ body
├─ read: boolean
└─ created_at

┌──────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION                                 │
└──────────────────────────────────────────────────────────────────┘

chat_messages
├─ id (UUID) [PK]
├─ user_id (FK → users)
├─ message_text
├─ is_ai_response: boolean
├─ context_data (JSON)
├─ created_at
└─ deleted_at

appointments
├─ id (UUID) [PK]
├─ doctor_id (FK → doctors)
├─ patient_id (FK → patients)
├─ scheduled_time
├─ duration_minutes
├─ status: 'scheduled' | 'completed' | 'cancelled'
└─ notes

┌──────────────────────────────────────────────────────────────────┐
│                    LOOKUP / REFERENCE                            │
└──────────────────────────────────────────────────────────────────┘

hospitals
├─ id (UUID) [PK]
├─ name
├─ address
├─ city
├─ country
└─ contact_phone

feature_definitions
├─ id (UUID) [PK]
├─ feature_name: 'blood_glucose'
├─ data_type: 'numeric'
├─ min_value: 70
├─ max_value: 500
└─ unit: 'mg/dL'

disease_registry
├─ id (UUID) [PK]
├─ disease_code: 'E11' (ICD-10 for Diabetes Type 2)
├─ disease_name: 'Diabetes Mellitus Type 2'
├─ description
└─ model_id (FK → model_registry)

```

---

## 4. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
└──────────────────────────────────────────────────────────────────┘

DEVELOPMENT (Local)          │         PRODUCTION (Cloud)
─────────────────────────────┼─────────────────────────────
                             │
Frontend:                    │         Frontend:
  http://localhost:3000      │           https://medisight.vercel.app
  Next.js dev server         │           Vercel (CDN, Edge Functions)
  (with Hot Reload)          │           Auto-deploy from main branch
                             │
Backend:                     │         Backend:
  http://localhost:54321     │           https://project.supabase.co
  Supabase Local             │           Supabase Cloud
  PostgreSQL 17              │           PostgreSQL managed
  Port 54322                 │           Real-time subscriptions
  Docker containers          │           Auto-scaling
                             │
ML Service:                  │         ML Service:
  http://localhost:8000      │           https://medisight-ml.render.com
  FastAPI (Uvicorn)          │           Render or Railway
  Single instance            │           Auto-scaling (0-10 instances)
  Port 8000                  │           Health checks enabled
                             │           Persistent disk for models
                             │

┌──────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT FLOW                               │
└──────────────────────────────────────────────────────────────────┘

Developer Commits to GitHub
        │
        ├─ Frontend: .github/workflows/deploy-frontend.yml
        │   └─ Trigger Vercel deploy
        │       └─ Build & test
        │       └─ Deploy to CDN
        │       └─ Preview URL for PR
        │
        ├─ ML Service: .github/workflows/deploy-ml.yml
        │   └─ Trigger Render deploy
        │       └─ Build Docker image
        │       └─ Run tests
        │       └─ Deploy to production
        │       └─ Health check
        │
        └─ Backend: Supabase (manual via CLI or web)
            └─ Run migrations
            └─ Verify schema
            └─ Update Edge Functions

```

---

## 5. Request Flow Sequence Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMPLETE REQUEST FLOW                         │
└──────────────────────────────────────────────────────────────────┘

User                Frontend             ML Service            Database
 │                    │                      │                   │
 ├─ Click Login       │                      │                   │
 │                    ├─ POST /auth/login     │                   │
 │                    ├────────────────────────────────────────────┤
 │                    │                      │                   ├─ Check email
 │                    │                      │                   ├─ Verify password
 │                    │◀─ JWT Token ─────────────────────────────◀┤
 │                    │                      │                   │
 ├◀ Redirect to Dashboard                    │                   │
 │                    │                      │                   │
 ├─ Click Patient ID  │                      │                   │
 │                    ├─ GET /patients/:id    │                   │
 │                    │                      │                   ├─ Query patients
 │                    │◀ Patient Data ─────────────────────────────◀┤
 │                    │                      │                   │
 ├─ Fill Prediction   │                      │                   │
 │  Form              │                      │                   │
 │                    │                      │                   │
 ├─ Click Predict     │                      │                   │
 │                    ├─ POST /predict ──────┤                   │
 │                    │    {features}        │                   │
 │                    │                      ├─ Feature Engineer  │
 │                    │                      ├─ Load Model        │
 │                    │                      ├─ Predict           │
 │                    │                      ├─ Calculate SHAP    │
 │                    │◀ {prediction, shap}◀─┤                   │
 │                    │                      │                   │
 │                    ├─ POST /predictions ───────────────────────┤
 │                    │    {pred, shap}      │                   ├─ INSERT prediction
 │                    │                      │                   ├─ INSERT explanation
 │                    │◀ stored ─────────────────────────────────◀┤
 │                    │                      │                   │
 ├◀ Show Results      │                      │                   │
 │  ├─ Score badge   │                      │                   │
 │  ├─ SHAP chart    │                      │                   │
 │  └─ Explanation   │                      │                   │

```

---

## 6. Technology Stack Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND STACK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  React 18 ──────┬──── JSX Components                           │
│                 ├──── Hooks (useState, useEffect, etc.)        │
│                 └──── Server Components (Next.js)              │
│                                                                 │
│  Next.js 14 ────┬──── App Router                               │
│                 ├──── API Routes                               │
│                 ├──── Middleware                               │
│                 └──── Image Optimization                       │
│                                                                 │
│  TypeScript ────┬──── Type Safety                              │
│                 ├──── Interface Definitions                    │
│                 └──── Compile-time Checks                      │
│                                                                 │
│  Tailwind CSS ──┬──── Utility Classes                          │
│                 ├──── Responsive Design                        │
│                 └──── Dark Mode                                │
│                                                                 │
│  shadcn/ui ─────┬──── Pre-built Components                     │
│                 ├──── Radix UI Primitives                      │
│                 └──── Copy-paste Customizable                  │
│                                                                 │
│  TanStack Query ┬──── Server State Management                  │
│                 ├──── Caching & Synchronization                │
│                 └──── Automatic Refetching                     │
│                                                                 │
│  Zustand ───────┬──── Client State Store                       │
│                 ├──── Lightweight                              │
│                 └──── Subscribe to State Changes               │
│                                                                 │
│  React Hook Form ├──── Form State Management                   │
│  Zod ───────────┤─── Schema Validation                         │
│                 └──── Type-safe Validation                     │
│                                                                 │
│  Recharts ──────┬──── Chart Visualization                      │
│                 ├──── SHAP Waterfall Charts                    │
│                 └──── Patient Statistics Graphs                │
│                                                                 │
│  Framer Motion ─┬──── Animation Library                        │
│                 ├──── Smooth Transitions                       │
│                 └──── Interactive Effects                      │
│                                                                 │
│  @supabase/ssr ─┬──── Supabase Client (SSR)                    │
│                 ├──── Auth Management                          │
│                 └──── Real-time Subscriptions                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND STACK                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Supabase ──────┬──── Managed PostgreSQL                       │
│                 ├──── Authentication (JWT)                     │
│                 ├──── Real-time Engine                         │
│                 ├──── Edge Functions (Deno)                    │
│                 ├──── File Storage                             │
│                 └──── Vector Database (pgvector)               │
│                                                                 │
│  PostgreSQL 17 ─┬──── Relational Database                      │
│                 ├──── Row-Level Security (RLS)                 │
│                 ├──── Complex Queries                          │
│                 ├──── JSON Support                             │
│                 └──── 25+ Normalized Tables                    │
│                                                                 │
│  Deno (Edge) ───┬──── TypeScript Runtime                       │
│                 ├──── Serverless Functions                     │
│                 ├──── Webhook Handlers                         │
│                 └──── Zero Cold Start                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ML STACK                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FastAPI ───────┬──── Modern Web Framework                     │
│                 ├──── Async Support                            │
│                 ├──── Automatic API Documentation              │
│                 └──── Built-in Validation                      │
│                                                                 │
│  Uvicorn ───────┬──── ASGI Application Server                  │
│                 ├──── High Performance                         │
│                 └──── Auto-reload in Development               │
│                                                                 │
│  scikit-learn ──┬──── Machine Learning Library                 │
│                 ├──── Logistic Regression                      │
│                 ├──── Random Forest                            │
│                 └──── Model Pipelines                          │
│                                                                 │
│  XGBoost ───────┬──── Gradient Boosting                        │
│                 ├──── High Performance                         │
│                 └──── Feature Importance                       │
│                                                                 │
│  LightGBM ──────┬──── Production Model ⭐                       │
│                 ├──── Fast Training & Inference                │
│                 ├──── AUC: 0.8307                              │
│                 └──── Memory Efficient                         │
│                                                                 │
│  SHAP ──────────┬──── Model Explainability                     │
│                 ├──── Feature Contributions                    │
│                 ├──── Waterfall Charts                         │
│                 └──── Local Explanations                       │
│                                                                 │
│  MLflow ────────┬──── Experiment Tracking                      │
│                 ├──── Model Registry                           │
│                 ├──── Artifacts Storage                        │
│                 └──── Versioning                               │
│                                                                 │
│  pandas ────────┬──── Data Manipulation                        │
│  numpy ─────────┤─── Numerical Computing                       │
│  scipy ─────────┤─── Scientific Computing                      │
│                 └──── Feature Engineering                      │
│                                                                 │
│  psycopg2 ──────┬──── PostgreSQL Driver                        │
│                 └──── Database Connectivity                    │
│                                                                 │
│  pytest ────────┬──── Testing Framework                        │
│                 ├──── Unit Tests                               │
│                 └──── Coverage Reports                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

```

---

## 7. CI/CD Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS WORKFLOW                       │
└──────────────────────────────────────────────────────────────────┘

Trigger: Push to main branch
         or Pull Request created

    │
    ├─→ [Frontend Tests]
    │   ├─ npm install
    │   ├─ npm run lint
    │   ├─ npm run build
    │   └─ Report results
    │
    ├─→ [ML Service Tests]
    │   ├─ pip install -r requirements.txt
    │   ├─ pytest tests/ --cov=app
    │   ├─ Lint with pylint/flake8
    │   └─ Report results
    │
    └─→ [Database Validation]
        ├─ Check migrations
        ├─ Verify RLS policies
        └─ Schema compatibility check

If all pass and merged to main:

    │
    ├─→ [Deploy Frontend to Vercel]
    │   ├─ Build Next.js app
    │   ├─ Run tests
    │   ├─ Deploy to production
    │   └─ DNS CNAME update (automatic)
    │
    ├─→ [Deploy ML Service to Render]
    │   ├─ Build Docker image
    │   ├─ Push to container registry
    │   ├─ Deploy to Render
    │   └─ Health check
    │
    └─→ [Deploy to Supabase]
        ├─ Push migrations
        ├─ Update Edge Functions
        └─ Verify schema

Status: ✓ Production Ready
```

---

## 8. Local Development Setup Ports

```
┌──────────────────────────────────────────────────────────────────┐
│                    LOCAL PORT MAPPING                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend               http://localhost:3000                    │
│  ├─ Next.js dev server                                           │
│  └─ Hot Module Reload enabled                                   │
│                                                                  │
│  Supabase API           http://localhost:54321                   │
│  ├─ REST API (PostgreSQL)                                        │
│  ├─ GraphQL API                                                  │
│  └─ Real-time WebSocket                                          │
│                                                                  │
│  Supabase Studio        http://localhost:54323                   │
│  ├─ Web UI for database management                               │
│  ├─ SQL Editor                                                   │
│  ├─ Auth viewer                                                  │
│  └─ Function testing                                             │
│                                                                  │
│  PostgreSQL             localhost:54322                          │
│  ├─ Direct database connection                                   │
│  ├─ Via psql CLI                                                 │
│  └─ Via DBeaver/pgAdmin                                          │
│                                                                  │
│  ML Service             http://localhost:8000                    │
│  ├─ FastAPI application                                          │
│  ├─ Swagger UI: http://localhost:8000/docs                       │
│  └─ ReDoc: http://localhost:8000/redoc                           │
│                                                                  │
│  Inbucket (Email)       http://localhost:54324                   │
│  ├─ Catch-all email service (for testing)                        │
│  └─ View sent emails                                             │
│                                                                  │
│  Docker (Supabase)                                               │
│  ├─ Multiple containers running                                  │
│  ├─ Postgres, API, Auth, Storage, Functions, etc.                │
│  └─ Monitor via `docker ps`                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    JWT AUTHENTICATION FLOW                       │
└──────────────────────────────────────────────────────────────────┘

User Signup
    │
    ├─ Enter email & password in Frontend
    ├─ POST /auth/v1/signup (via Supabase)
    │
    ▼
Supabase Auth
    │
    ├─ Validate email format
    ├─ Hash password with bcrypt
    ├─ Create user record in auth.users table
    ├─ Generate JWT token
    │  ├─ Header: {alg: "HS256", typ: "JWT"}
    │  ├─ Payload: {user_id, email, role, iat, exp}
    │  └─ Signature: HMAC-SHA256
    │
    ├─ Send confirmation email
    │  └─ Click link to verify email
    │
    ▼
Frontend
    │
    ├─ Store JWT in localStorage
    ├─ Refresh token in secure httpOnly cookie
    │
    ├─ Subsequent API requests include:
    │  ├─ Authorization: Bearer <JWT>
    │  ├─ Sent to both Supabase API & ML Service
    │  └─ JWT verified server-side
    │
    ▼
Supabase RLS
    │
    ├─ Extract user_id from JWT
    ├─ Apply RLS policies to queries
    │
    ├─ Example policy:
    │  └─ SELECT * FROM patients
    │     WHERE user_id = auth.uid()
    │
    ▼
Database Query
    │
    └─ Return only user's own data

JWT Token Structure (Example):
┌────────────────────────────────────────────────┐
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9          │ Header
│ .                                              │
│ eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a...     │ Payload
│ .                                              │
│ 1234567890ABCDEFGHIJ                          │ Signature
└────────────────────────────────────────────────┘
```

---

## 10. Model Training Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    ML MODEL TRAINING FLOW                        │
└──────────────────────────────────────────────────────────────────┘

Step 1: Data Acquisition
    └─ 70,692 clinical samples (CDC BRFSS)
       ├─ 50-50 balanced (diabetes positive/negative)
       └─ 21 features per record

Step 2: Exploratory Data Analysis
    ├─ Statistical summaries
    ├─ Feature distributions
    ├─ Correlation analysis
    └─ Missing value handling

Step 3: Feature Engineering (features.py)
    ├─ Blood glucose normalization (70-500 mg/dL)
    ├─ Blood pressure categorization
    │  ├─ Normal, Elevated, Stage 1/2 Hypertension
    │  └─ Systolic & Diastolic
    │
    ├─ BMI classification
    │  ├─ Underweight, Normal, Overweight, Obese
    │  └─ Obesity Type I, II, III
    │
    ├─ Kidney function (eGFR staging)
    ├─ Cholesterol ratios
    ├─ Risk factor encoding
    └─ Scaling & normalization

Step 4: Train-Test Split
    ├─ 70% Training (49,484 samples)
    ├─ 30% Testing (21,208 samples)
    └─ Stratified by target variable

Step 5: Model Training (train.py)
    │
    ├─→ Model 1: Logistic Regression
    │   ├─ Fast baseline
    │   ├─ Interpretable
    │   └─ AUC: 0.78
    │
    ├─→ Model 2: Random Forest
    │   ├─ Feature importance available
    │   ├─ Handles non-linearity
    │   └─ AUC: 0.82
    │
    ├─→ Model 3: XGBoost
    │   ├─ Gradient boosting
    │   ├─ Fast training
    │   └─ AUC: 0.8280 ⭐
    │
    └─→ Model 4: LightGBM
        ├─ Optimized gradient boosting
        ├─ Fastest inference
        ├─ Smallest model size
        └─ AUC: 0.8307 ⭐⭐ SELECTED

Step 6: Hyperparameter Tuning
    ├─ Grid Search over parameter space
    ├─ 5-fold Cross-Validation
    ├─ Evaluate on validation set
    └─ Select best parameters

Step 7: Final Model Evaluation
    ├─ Metrics on Test Set:
    │  ├─ AUC-ROC: 0.8307 (Area Under Curve)
    │  ├─ Accuracy: 0.81 (81% correct predictions)
    │  ├─ Precision: 0.79 (79% of positive predictions correct)
    │  ├─ Recall: 0.83 (83% of true positives found)
    │  ├─ F1-Score: 0.81
    │  └─ Confusion Matrix visualization
    │
    └─ Confusion Matrix:
       ┌─────────────────────────────────┐
       │       Predicted Negative Positive│
       │ Actual                          │
       │ Negative │  TN       FP         │
       │ Positive │  FN       TP         │
       └─────────────────────────────────┘

Step 8: SHAP Explainability Analysis
    ├─ Calculate SHAP values for all predictions
    ├─ Feature importance ranking
    ├─ Dependence plots
    ├─ Force plots for individual predictions
    └─ Store explanations in database

Step 9: MLflow Tracking
    ├─ Log all experiments
    ├─ Compare model performance
    ├─ Track hyperparameters
    ├─ Store model artifacts
    ├─ Version model registry
    └─ Promote best model to production

Step 10: Model Export
    ├─ Serialize best model to joblib format
    ├─ Save model.joblib (45 MB)
    ├─ Save model_metadata.json
    │  ├─ Feature names
    │  ├─ Training metrics
    │  ├─ Hyperparameters
    │  └─ Model version
    │
    └─ Path: ml-service/models/production/

Step 11: Deployment
    ├─ Copy artifacts to ML Service
    ├─ Load model on FastAPI startup
    ├─ Initialize SHAP explainer
    ├─ Ready for predictions
    └─ Monitor performance metrics

Continuous Retraining (Weekly)
    ├─ Query new predictions from database
    ├─ Accumulate recent patient data
    ├─ Check for data drift
    ├─ If drift detected → retrain
    ├─ Compare performance
    ├─ If better → deploy new model
    └─ Log in retraining_logs table

```

---

**Last Updated**: August 18, 2026
**Diagrams Generated**: Project Architecture Complete
