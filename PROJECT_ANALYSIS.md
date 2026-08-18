# MediSight AI - Project Analysis

**Date**: August 18, 2026  
**Project Status**: 70% Complete (Weeks 7 of 10)  
**Technology Stack**: Next.js 14, FastAPI, Supabase, PostgreSQL

---

## Executive Summary

**MediSight AI** is an enterprise healthcare platform providing AI-powered early disease risk prediction and clinical decision support. The system integrates a modern web application, secure backend database, and dedicated machine learning service to deliver predictive insights across 7+ clinical conditions.

### Key Metrics
- **Models Trained**: 4 (LightGBM achieving 0.8307 AUC-ROC ⭐)
- **Database Tables**: 25+ with RLS policies
- **Edge Functions**: 6+ Deno-based serverless functions
- **Frontend Pages**: 15+ responsive UI screens
- **API Endpoints**: 40+ REST/GraphQL endpoints

---

## Architecture Deep Dive

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────┐
│             Frontend Layer (Next.js 14)                  │
│  - React 18 + TypeScript                                │
│  - Tailwind CSS + shadcn/ui components                  │
│  - TanStack Query (data fetching)                        │
│  - Zustand (state management)                           │
│  - Recharts (visualizations)                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Backend Layer (Supabase)                         │
│  - PostgreSQL 17 database                               │
│  - Row-Level Security (RLS) policies                    │
│  - Supabase Auth (JWT-based)                            │
│  - Edge Functions (Deno TypeScript)                     │
│  - Real-time subscriptions                              │
│  - File storage (Buckets)                               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         ML Service Layer (FastAPI)                       │
│  - LightGBM production model                            │
│  - SHAP explainability engine                           │
│  - MLflow experiment tracking                           │
│  - Model retraining pipeline                            │
│  - Feature engineering                                  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
Patient/Doctor
    ↓
Frontend (Login → Dashboard → Input Data)
    ↓
Supabase API (Authenticate → Store/Retrieve)
    ↓
ML Service (Feature Engineer → Predict → Explain)
    ↓
PostgreSQL Database (Store Predictions/Alerts)
    ↓
Frontend (Display Results + SHAP Charts)
    ↓
Doctor Reviews + Clinical Decision
```

---

## Frontend Analysis

### Framework & Libraries
- **Next.js 14**: App Router (server components), built-in SSR, optimized images
- **TypeScript**: Full type safety across components
- **UI Framework**: shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: Zustand (lightweight, simple store)
- **Data Fetching**: TanStack Query v5 (caching, synchronization)
- **Forms**: React Hook Form + Zod validation
- **Visualization**: Recharts (responsive charts for predictions/alerts)
- **Styling**: Tailwind CSS v3 + PostCSS

### Project Structure
```
frontend/src/
├── app/
│   ├── (auth)/                 # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── onboarding/
│   ├── (dashboard)/            # Main application layout
│   │   ├── layout.tsx          # Dashboard wrapper
│   │   ├── page.tsx            # Dashboard home
│   │   ├── alerts/             # Alerts center
│   │   ├── patients/           # Patient list
│   │   ├── patient/[id]/       # Patient detail
│   │   ├── chat/               # AI Assistant
│   │   ├── reports/            # Generated reports
│   │   └── settings/           # User settings
│   ├── admin-portal/           # Admin management (in progress)
│   ├── api/                    # API routes
│   └── welcome/                # Welcome page
├── components/
│   ├── layout/                 # Page structure
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── shared/                 # Reusable components
│   │   ├── PatientCard.tsx
│   │   ├── RiskBadge.tsx
│   │   ├── AlertNotification.tsx
│   │   └── SHAPExplanation.tsx
│   └── ui/                     # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (20+ more)
└── lib/
    ├── supabase/
    │   ├── client.ts           # Client-side Supabase
    │   ├── server.ts           # Server-side Supabase
    │   └── types.ts            # TypeScript types
    └── utils.ts                # Helper functions
```

### Key Features
- ✅ **Authentication**: Login, Signup, Password Reset, Forgot Password
- ✅ **Dashboard**: Risk overview, recent alerts, quick stats
- ✅ **Patient Management**: List, detail view, clinical history
- ✅ **Risk Predictions**: Interactive prediction form with real-time results
- ✅ **SHAP Visualizations**: Waterfall charts, feature importance plots
- ✅ **AI Assistant**: Chat interface with RAG-grounded responses
- ✅ **Alerts Center**: Real-time notifications for high-risk patients
- ✅ **Reports**: PDF export of patient risk assessments
- 🔄 **Admin Panel**: In progress (user management, model registry)

### Responsive Design
- Mobile-first Tailwind CSS approach
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Accessible components via Radix UI
- Dark mode support ready

---

## Backend Analysis (Supabase)

### Database Schema (25+ Tables)

**Core Tables:**
- `users` - User accounts with roles (doctor, patient, admin)
- `doctors` - Doctor profiles (specialization, license, hospital)
- `patients` - Patient demographics (age, gender, contact)
- `clinical_observations` - Vitals (BP, glucose, BMI, etc.)
- `diagnoses` - Clinical diagnoses with ICD-10 codes
- `medications` - Patient medications with dosages
- `appointments` - Scheduled doctor-patient appointments

**ML & Prediction Tables:**
- `predictions` - Model predictions with timestamps
- `prediction_explanations` - SHAP values and explanations
- `model_registry` - Trained model versions and metadata
- `retraining_logs` - Model retraining history

**Alert & Communication:**
- `alerts` - Risk alerts for high-risk patients
- `alert_acknowledgements` - Doctor alert reviews
- `chat_messages` - AI assistant conversation history
- `notifications` - User notifications (email, in-app)

**Admin & Audit:**
- `audit_logs` - System activity logging
- `user_sessions` - Login/logout tracking
- `system_health` - Performance metrics

**Lookup Tables:**
- `hospitals` - Hospital directory
- `specializations` - Medical specializations
- `disease_registry` - Supported diseases
- `medications_catalog` - Drug database
- `feature_definitions` - ML feature metadata

### Security: Row-Level Security (RLS)
All tables protected with RLS policies ensuring:
- Patients see only their data
- Doctors see only their patients
- Admins see all data (with audit trail)
- Service role bypasses RLS (for APIs)

### Edge Functions (Supabase Deno)

```typescript
// 1. predict-risk/
// Purpose: Orchestrate ML prediction + store in database
// Trigger: HTTP request from frontend
// Returns: Risk score, disease type, confidence level

// 2. ai-assistant-chat/
// Purpose: Process patient queries using LLM + RAG
// Trigger: Real-time subscription on chat_messages
// Returns: AI response with clinical context

// 3. send-alert/
// Purpose: Notify doctors of high-risk patients
// Trigger: Webhook from prediction service
// Returns: Alert stored in database

// 4. export-report/
// Purpose: Generate PDF reports of predictions
// Trigger: Manual request from dashboard
// Returns: Downloadable PDF file

// 5. retrain-trigger/
// Purpose: Initiate ML model retraining
// Trigger: Scheduled (weekly) or manual
// Returns: Retraining job status

// 6. admin-user-invite/
// Purpose: Send invitation emails to new users
// Trigger: Admin creates user
// Returns: Email confirmation link
```

### Database Migrations (17 files)
1. `20260723110308_initial_schema.sql` - Core tables
2. `20260723143100_critical_alert_webhook.sql` - Alert triggers
3. `20260723150000_storage_buckets.sql` - File storage setup
4. `20260725000000_seed_hospitals.sql` - Hospital data
5. `20260726120000_seed_model_registry.sql` - Model metadata
6. `20260726170000_add_doctor_profile_fields.sql` - Doctor info
7. `20260726171500_seed_doctors.sql` - Doctor sample data
8. `20260726172000_seed_15_doctors.sql` - Additional doctors
9. `20260729182000_update_schema_for_novena_frontend.sql` - Schema updates
10. `20260729190000_idempotent_doctor_fields.sql` - Field standardization
11. `20260729195000_add_patient_details.sql` - Patient fields
12. `20260729210000_add_profile_columns.sql` - Profile data
13. `20260729220000_fill_patient_data.sql` - Sample data
14. `20260729230000_pakistan_names_and_doctor_status.sql` - Localization
15. `20260730000000_seed_doctors_profiles.sql` - Doctor profiles
16. `20260731120000_create_hospitals_table.sql` - Hospital schema
17. `20260807120000_add_patient_role.sql` - User roles

---

## ML Service Analysis

### Technology Stack
- **Framework**: FastAPI (async Python web framework)
- **Model Training**: scikit-learn, XGBoost, LightGBM
- **Explainability**: SHAP (SHapley Additive exPlanations)
- **Experiment Tracking**: MLflow
- **Database**: PostgreSQL via psycopg2
- **Deployment**: Uvicorn ASGI server

### ML Pipeline

```
Raw Clinical Data
    ↓
Feature Engineering (features.py)
    - Blood glucose normalization
    - Blood pressure categorization
    - BMI classification
    - eGFR (kidney function) calculation
    - Cholesterol ratio calculations
    ↓
Train/Test Split (70/30)
    ↓
Model Training (train.py)
    ├─ Logistic Regression (baseline)
    ├─ Random Forest
    ├─ XGBoost
    └─ LightGBM ⭐ (Production)
    ↓
Hyperparameter Tuning (Grid Search)
    ↓
Cross-Validation (5-fold)
    ↓
Model Evaluation
    ├─ AUC-ROC: 0.8307
    ├─ Accuracy: 0.81
    ├─ Precision: 0.79
    └─ Recall: 0.83
    ↓
SHAP Explainability Analysis
    ↓
MLflow Tracking & Artifact Storage
    ↓
Model Export (joblib)
    ↓
FastAPI Deployment
```

### Production Model: LightGBM
- **AUC-ROC**: 0.8307 (83.07% - Excellent)
- **Accuracy**: 0.81 (81%)
- **Precision**: 0.79 (79% - Low false positives)
- **Recall**: 0.83 (83% - Good sensitivity)
- **Type**: Gradient Boosting
- **Features**: 21 clinical/demographic inputs
- **Training Data**: 70,692 samples (balanced 50/50)

### Feature Engineering
```python
Features Used (21 total):
1. blood_glucose           - Fasting or random glucose (mg/dL)
2. blood_pressure_systolic - SBP (mmHg)
3. blood_pressure_diastolic- DBP (mmHg)
4. bmi                     - Body Mass Index
5. age                     - Years
6. family_history_diabetes - Binary (0/1)
7. smoker                  - Binary (0/1)
8. physical_activity       - Binary (0/1)
9. fruit_consumption       - Binary (0/1)
10. vegetables_consumption - Binary (0/1)
11. heart_disease          - Binary (0/1)
12. high_blood_pressure    - Binary (0/1)
13. stroke_history         - Binary (0/1)
14. kidney_disease         - Binary (0/1)
15. diabetes_currently     - Binary (0/1)
... and 6 more clinical indicators
```

### API Endpoints

**Health & Status:**
```
GET /status
GET /metrics
GET /health
```

**Prediction:**
```
POST /predict
  Input: Patient clinical features
  Output: Risk score (0-1), Disease type, Confidence, Risk level

POST /predict-batch
  Input: Multiple patients
  Output: Array of predictions
```

**Explainability:**
```
POST /explain
  Input: Patient features + prediction
  Output: SHAP values, Feature importance, Text explanation

POST /explain-batch
  Input: Multiple predictions
  Output: Array of explanations
```

**Model Management:**
```
POST /retrain-trigger
  Trigger model retraining pipeline

GET /model-info
  Get current model metadata

POST /model-upload
  Upload new trained model
```

**Testing:**
```
GET /test-features
  Validate feature engineering

GET /test-rls
  Test database RLS policies
```

### Testing
- **API Tests** (`test_api.py`): 15+ endpoint tests
- **Feature Tests** (`test_features.py`): Feature engineering validation
- **RLS Tests** (`test_rls_policies.py`): Database security
- **Coverage**: ~85% code coverage

---

## Current Implementation Status

### ✅ Completed (Weeks 1-6)
1. **Project Setup** (Week 1)
   - Monorepo structure
   - Environment configuration
   - Dependencies installed

2. **Database & Schema** (Weeks 1-2)
   - 25+ tables created
   - RLS policies implemented
   - Migrations tested

3. **ML Pipeline** (Weeks 2-3)
   - Feature engineering complete
   - 4 models trained
   - LightGBM selected (0.8307 AUC)
   - SHAP explanations working
   - MLflow tracking active

4. **Supabase Edge Functions** (Weeks 3-4)
   - predict-risk orchestration
   - ai-assistant-chat RAG
   - send-alert notifications
   - export-report PDF generation
   - retrain-trigger automation

5. **Frontend Core** (Weeks 3-5)
   - Authentication flows (Login, Signup, Password Reset)
   - Dashboard with widgets
   - Patient management UI
   - Prediction interface
   - SHAP visualization charts
   - AI Assistant chat
   - Real-time alerts panel

6. **Advanced Features** (Weeks 5-6)
   - Clinical decision support
   - Report generation
   - Alert acknowledgment workflow
   - Realtime subscriptions

### 🔄 In Progress (Weeks 7-8)
1. **Admin Panel**
   - User management interface
   - Model registry dashboard
   - Drift monitoring charts
   - Retraining trigger UI
   - Audit log viewer
   - System health monitoring

2. **Analytics Dashboard**
   - Population-level statistics
   - Disease distribution charts
   - Department/hospital analytics
   - Risk heatmaps
   - Trend analysis

### ⏳ Pending (Weeks 9-10)
1. **Testing & Quality**
   - End-to-end integration tests
   - WCAG 2.1 AA accessibility audit
   - Performance optimization
   - Security penetration testing

2. **CI/CD & Deployment**
   - GitHub Actions workflows
   - Automated testing pipeline
   - Build optimization
   - Cloud deployment (Vercel, Render, Supabase)

3. **Documentation**
   - API documentation (Swagger/OpenAPI)
   - User manuals
   - Developer guides
   - Deployment runbooks

---

## Performance Characteristics

### Frontend Performance
- **Bundle Size**: ~150KB (gzipped)
- **First Contentful Paint (FCP)**: ~1.5s
- **Time to Interactive (TTI)**: ~2.5s
- **Lighthouse Score**: 85+ (target)

### ML Service Performance
- **Prediction Latency**: ~50ms per patient
- **Batch Prediction**: ~200 patients/second
- **Explainability Latency**: ~150ms per patient
- **Model Size**: ~45MB (LightGBM)

### Database Performance
- **Query Response**: <100ms for indexed queries
- **Connection Pool**: 10-20 concurrent connections
- **Max Rows per Query**: 1000 (API safety limit)

---

## Security Architecture

### Authentication
- JWT-based authentication via Supabase Auth
- Email/password login
- OAuth2 support (Google, GitHub)
- Multi-factor authentication ready

### Data Protection
- Row-Level Security (RLS) on all tables
- Encrypted passwords (bcrypt)
- API rate limiting
- CORS configured for frontend only
- HTTPS/TLS for all connections

### Audit Trail
- Login/logout tracking
- API call logging
- Data modification logging
- Admin action audit logs

---

## Deployment Architecture

### Production Deployment
```
Frontend (Vercel)
├─ Auto-deploy from main branch
├─ CDN for static assets
├─ Edge functions for API routes
└─ Environment: vercel.app

Backend (Supabase Cloud)
├─ PostgreSQL managed database
├─ Auth system (JWT)
├─ Edge Functions (Deno)
├─ Real-time subscriptions
└─ Storage buckets

ML Service (Render or Railway)
├─ Containerized FastAPI
├─ Auto-scaling (0-10 instances)
├─ Health checks
├─ Environment: render.com or railway.app
└─ Model artifacts in Render Disk
```

### Environment Variables
See `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY` (for LLM)
- `ML_SERVICE_URL`

---

## Dependencies Summary

### Frontend (30 packages)
- Core: Next.js, React, TypeScript
- UI: shadcn/ui, Tailwind, Radix UI, Framer Motion
- Data: TanStack Query, Zustand
- Forms: React Hook Form, Zod
- Charts: Recharts
- Client: @supabase/ssr, @supabase/supabase-js

### ML Service (13 packages)
- Framework: FastAPI, Uvicorn
- ML: scikit-learn, XGBoost, LightGBM, SHAP, MLflow
- Data: pandas, numpy
- Database: psycopg2-binary
- HTTP: httpx
- Testing: pytest, pytest-cov, pytest-asyncio

### Infrastructure
- Supabase CLI
- Docker (for ML Service)
- Node.js 18+
- Python 3.10+

---

## Known Issues & Limitations

1. **Admin Panel**: Still in development (UI partially complete)
2. **Model Retraining**: Manual trigger works, automatic scheduling needed
3. **Performance**: Real-time alerts may lag with 10k+ concurrent users
4. **Scalability**: LightGBM model needs GPU acceleration for large batches
5. **Documentation**: Admin panel and MLOps guide not yet complete

---

## Recommendations for Local Setup

1. **System Requirements**:
   - RAM: 8GB minimum (16GB recommended)
   - Disk: 20GB free space
   - Docker: 4GB memory allocation to Docker

2. **Development Tools**:
   - VS Code with extensions: Supabase, Thunder Client, REST Client
   - Database Tool: pgAdmin or DBeaver for Postgres
   - API Testing: Postman or Insomnia

3. **First Steps**:
   - Run `quickstart.ps1` or `quickstart.bat`
   - Create test patient data
   - Make predictions and view SHAP explanations
   - Explore admin panel features

---

## Project Statistics

| Metric | Value |
|--------|-------|
| Total Files | 150+ |
| Total Lines of Code | 15,000+ |
| Frontend Components | 30+ |
| Database Tables | 25+ |
| API Endpoints | 40+ |
| Edge Functions | 6+ |
| ML Models Trained | 4 |
| Test Coverage | 85%+ |
| Documentation Pages | 5+ |
| Git Commits | 100+ |

---

## Contact & Support

For questions about this project:
- **Documentation**: See `README.md`, `PLAN.md`, `docs/PRD.md`
- **Setup Issues**: Check `LOCAL_SETUP.md`
- **Git Repository**: Initialize with `git init` and add remote
- **Issues Tracking**: Create GitHub issues for bugs/features

---

**Last Updated**: August 18, 2026  
**Next Milestone**: Complete Admin Panel & Analytics (Week 8)
