# Implementation Plan: MediSight AI (Case Study ML-003)

This document outlines the technical approach, folder structure, build sequence, and milestone breakdown for the MediSight AI project, based on the provided Product Requirements Document (PRD).

## 1. Tech Stack (Confirmed & Refined)
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Recharts, React Hook Form, Zod.
- **Backend/Database**: Supabase (Postgres, Auth, Storage, Edge Functions, Realtime, pgvector).
- **ML Service**: Python 3.10+, FastAPI, Scikit-learn, XGBoost, LightGBM, SHAP, MLflow.
- **AI Assistant**: LLM integration (OpenAI or Anthropic) via Supabase Edge Functions with pgvector for RAG.
- **Infrastructure**: Vercel (Frontend), Supabase Cloud (Backend), Render/Railway/Fly.io (ML Service).

## 2. Monorepo Folder Structure
```text
medisight-ai/
├── .github/workflows/          # CI/CD pipelines
├── frontend/                   # Next.js web application
│   ├── src/app/                # App router pages
│   ├── src/components/         # Reusable UI components
│   ├── src/lib/                # Utilities, API clients
│   └── src/store/              # Zustand state
├── supabase/                   # Supabase configuration & Edge Functions
│   ├── migrations/             # SQL schema definitions
│   ├── functions/              # Deno Edge Functions
│   └── config.toml             # Local Supabase config
├── ml-service/                 # FastAPI ML inference & training service
│   ├── app/                    # FastAPI routers and models
│   ├── model_training/         # Training scripts & feature engineering
│   ├── tests/                  # Pytest cases
│   └── requirements.txt        # Python dependencies
├── docs/                       # PRD, Architecture, Deployment guides
│   └── PRD.md
├── scripts/                    # Helper scripts (DB seeding, data gen)
├── .env.example                # Template for environment variables
├── README.md                   # Main project documentation
└── PLAN.md                     # Implementation plan (this file)
```

## 3. Build Order (Sequence of Execution)
Following the 10-step agent sequence from the prompt guidelines, we execute in this exact order:
1. **[x] Project Scaffolding & Setup**: Initialize git, monorepo folders, base dependencies, and environment files.
2. **[x] Database Schema, RLS & Auth**: Write SQL migrations for all tables, set up RLS policies, and configure Supabase Auth.
3. **[x] Synthetic Data & Feature Engineering**: Generate a realistic synthetic dataset and build the Python feature engineering pipeline.
4. **[x] ML Training & Inference API**: Train models (Logistic Regression, XGBoost, LightGBM), track in MLflow, and build FastAPI endpoints with SHAP.
5. **[x] Supabase Edge Functions**: Implement orchestration layer (`predict-risk`, `ai-assistant-chat`, `send-alert`, etc.) and DB webhooks.
6. **[x] Core Frontend**: Build Auth flows (Login, Signup, Forgot/Reset Password, Onboarding), Dashboard, Patient List, and Patient Detail screens wired to Supabase.
7. **[x] Predictions UI & AI Assistant**: Implement SHAP waterfall charts, Realtime Alerts Center, and the conversational AI interface.
8. **[ ] Admin Panel & MLOps UI**: Build user management, model registry view, drift monitoring, and retraining triggers.
9. **[ ] Testing, Hardening & CI/CD**: Write automated tests, accessibility pass, GitHub Actions pipeline, and deployment prep.

## 4. Confirmed Decisions
1. **ML Service Hosting**: Configured for deployment on Render/Railway using Uvicorn. Local dev runs on port 8000.
2. **Seed Disease Choice**: Selected **Diabetes** using the CDC BRFSS dataset (50-50 split, 70,692 rows) for training our prediction and explainability engine.
3. **LLM Provider**: Programmed to use OpenAI/Anthropic APIs inside the Supabase Edge Function layers.

## 5. Phased Milestone Breakdown (6-8 Week Timeline)
Mapped to the user's 6-8 week timeline:

- **Weeks 1-2 (Ingestion, Seeding & ML Pipeline - Completed):**
  - Next.js UI scaffolding, database schemas, and RLS validation.
  - Ingested 7 de-identified clinical datasets.
  - Built feature engineering calculations and database seeding engine.
  - Trained models (Logistic Regression baseline, Random Forest, XGBoost, LightGBM) with MLflow tracking.
  - Promoted LightGBM (AUC-ROC: 0.8307) and built the FastAPI prediction / SHAP engine.
  - Validated all modules via passing pytest suites.
- **Weeks 3-4 (Edge Functions & Core UI - Completed):**
  - Deno Edge Functions for proxying, alert routing, and reports.
  - Frontend patient registry views, doctor workflows, and dashboard pages.
  - Auth flows: Login, Signup, Forgot Password, Update Password, Onboarding.
- **Weeks 5-6 (Interactive Features & Auditing - Completed):**
  - RAG-grounded AI Chat Assistant, Realtime alerts panel, and SHAP interactive charts.
  - Live Recent Alerts widget on Dashboard, full alert acknowledgement flow.
  - Forgot-password + update-password auth flows completed.
- **Weeks 7-8 (Admin Panel, Analytics & MLOps UI - In Progress):**
  - Admin Panel: user management, model registry view, drift monitoring charts, retraining trigger, audit log viewer.
  - Population-level Analytics: disease distribution, department statistics, risk heatmaps.
- **Weeks 9-10 (Testing, Hardening & Launch - Pending):**
  - End-to-end integration testing, WCAG 2.1 AA audits, CI/CD setup, and cloud deployment.
