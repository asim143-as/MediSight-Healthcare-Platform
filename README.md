# MediSight AI

Minimal project README — concise setup for instructor review.

This repository contains a healthcare ML web platform split into:

- `frontend/` — Next.js frontend
- `supabase/` — database migrations and edge functions
- `ml-service/` — FastAPI ML service and training scripts

Note: Additional documentation files were archived to branch `backup-md` to keep the repository compact for submission.

Quickstart (development)

1. Clone the repository:

```bash
git clone <your-repo-url>
cd MediSight-Healthcare-Platform
```

2. Create local environment file ` .env.local` in the project root (do NOT commit secrets). Example keys required:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Start the ML service (recommended in a Python venv):

```powershell
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API available at `http://localhost:8000` (interactive docs at `/docs`).

4. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server at `http://localhost:3000` by default.

Tests

Run the ML service tests with:

```bash
pytest ml-service/tests/
```

Repository housekeeping performed

- Removed development artifacts (virtualenvs, caches, compiled files).
- Retained only `README.md` in repository root; removed other `.md` docs to reduce clutter. A full copy is available on branch `backup-md` if needed.

If you want any of the archived docs restored into the main branch, tell me which file(s) or I can restore the full `backup-md` branch.

— MediSight quick README
# MediSight AI

### Enterprise Healthcare Early Disease Risk Prediction & Clinical Decision Support Platform

MediSight AI is an AI-powered healthcare platform designed to support **early disease risk prediction, clinical decision making, patient monitoring, and explainable machine learning**.

The platform combines a modern healthcare web application, a secure Supabase backend, and a dedicated machine learning service to provide predictive insights across multiple clinical conditions.

> **Disclaimer:** MediSight AI is a clinical decision support and research platform. It is **not a substitute for professional medical diagnosis, treatment, or clinical judgment**. Predictions should be reviewed and interpreted by qualified healthcare professionals.

---

##  Key Features

*  **Multi-Disease Risk Prediction**

  * Diabetes
  * Heart Disease
  * Chronic Kidney Disease
  * Stroke
  * Liver Disease
  * Breast Cancer
  * Hypertension

*
*   **Clinical Risk Assessment**

  * BMI classification
  * Blood pressure categorization
  * Kidney function / eGFR staging
  * Cholesterol ratios
  * Composite clinical risk indicators

* 🔍 **Explainable AI**

  * SHAP-based model explanations
  * Feature importance
  * Patient-specific prediction reasoning
  * Clinical text explanations

* 👨‍⚕️ **Clinical Decision Support**

  * Patient risk profiles
  * Patient vitals and laboratory results
  * Diagnosis and medication information
  * Risk monitoring

* 📅 **Healthcare Management**

  * Patient records
  * Doctor information
  * Appointment management
  * Clinical observations

* 🧪 **Machine Learning Pipeline**

  * Logistic Regression
  * Random Forest
  * XGBoost
  * LightGBM
  * MLflow experiment tracking
  * Model retraining

* 🔐 **Secure Backend**

  * Supabase PostgreSQL
  * Row Level Security (RLS)
  * Database migrations
  * Supabase Edge Functions

---

# 🏗️ System Architecture

MediSight AI follows a modular monorepo architecture:

```text
MediSight AI
│
├── frontend/
│   ├── Next.js 14
│   ├── App Router
│   ├── Tailwind CSS
│   └── shadcn/ui
│
├── supabase/
│   ├── Database Schema
│   ├── Migrations
│   ├── RLS Policies
│   └── Edge Functions
│
└── ml-service/
    ├── FastAPI
    ├── Model Training
    ├── Feature Engineering
    ├── SHAP Explainability
    ├── MLflow
    └── Model Retraining
```

### High-Level Data Flow

```text
                    ┌──────────────────────┐
                    │      Frontend        │
                    │     Next.js 14       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Supabase        │
                    │ PostgreSQL + RLS     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     ML Service       │
                    │      FastAPI         │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │ Prediction│     │  SHAP    │     │ MLflow   │
        │  Models   │     │ Explain. │     │ Tracking │
        └──────────┘     └──────────┘     └──────────┘
```

---

# 📁 Project Structure

```text
MediSight-AI/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── config.toml
│
├── ml-service/
│   ├── app/
│   │   └── main.py
│   │
│   ├── model_training/
│   │   ├── seed_db.py
│   │   └── train.py
│   │
│   ├── tests/
│   ├── models/
│   ├── requirements.txt
│   └── ...
│
├── .env.local
├── README.md
└── ...
```

---

# 🛠️ Technology Stack

| Layer               | Technologies                    |
| ------------------- | ------------------------------- |
| Frontend            | Next.js 14, React, Tailwind CSS |
| UI                  | shadcn/ui                       |
| Backend             | Supabase, PostgreSQL            |
| API                 | FastAPI                         |
| Machine Learning    | Scikit-learn, XGBoost, LightGBM |
| Explainability      | SHAP                            |
| Experiment Tracking | MLflow                          |
| Testing             | Pytest                          |
| Database Security   | Supabase RLS                    |
| Language            | Python, TypeScript              |

---

# ⚙️ Installation & Setup

## Prerequisites

Make sure the following are installed:

* **Node.js 18+**
* **Python 3.10+**
* **npm**
* **Supabase CLI**
* **Git**

---

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd MediSight-AI
```

---

# 🗄️ 2. Configure Supabase

Create a Supabase project and obtain your project credentials.

Link the local project to your Supabase project:

```bash
supabase link --project-ref your-project-ref
```

Apply all database migrations:

```bash
supabase db push
```

### Environment Variables

Create a `.env.local` file in the project root or frontend directory according to your application configuration.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> **Security:** Never commit `.env.local`, service-role keys, API keys, passwords, or other secrets to GitHub.

---

# 🧠 3. Setup the ML Service

Navigate to the machine learning service:

```bash
cd ml-service
```

Create a Python virtual environment:

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 🌱 4. Seed Demo Data

MediSight AI includes a database seeding pipeline for demonstration and development.

The following command creates demo patient records and associated clinical information:

```bash
python model_training/seed_db.py
```

The demo dataset includes:

* Patient profiles
* Vital signs
* Laboratory results
* Diagnoses
* Medication information
* Clinical compliance data

> **Development Note:** Run database seeding only in a development/demo environment unless you have verified the script's behavior for your production database.

---

# 🤖 5. Train Machine Learning Models

Train and evaluate the predictive models using:

```bash
python model_training/train.py
```

The training pipeline supports:

* Logistic Regression baseline
* Random Forest
* XGBoost
* LightGBM

The pipeline also provides:

* Model evaluation
* Experiment tracking
* MLflow logging
* Best-model selection
* Model persistence

---

# 🚀 6. Start the FastAPI Service

From the `ml-service` directory:

```bash
uvicorn app.main:app --reload
```

The API will be available locally at:

```text
http://localhost:8000
```

FastAPI automatically provides interactive API documentation at:

```text
http://localhost:8000/docs
```

---

# 💻 7. Start the Frontend

Open a new terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:3000
```

---

# 🔌 API Endpoints

The FastAPI service provides endpoints for model monitoring, prediction, explainability, and retraining.

| Endpoint        | Method | Description                                 |
| --------------- | ------ | ------------------------------------------- |
| `/model-status` | GET    | Returns current model status                |
| `/predict`      | POST   | Generates disease-risk predictions          |
| `/explain`      | POST   | Provides SHAP-based prediction explanations |
| `/retrain`      | POST   | Triggers model retraining                   |

Interactive API documentation:

```text
http://localhost:8000/docs
```

---

# 🧪 Testing

MediSight AI includes automated tests for the clinical feature engineering pipeline and FastAPI endpoints.

Run the complete test suite:

```bash
pytest ml-service/tests/
```

### Feature Engineering Tests

Tests include:

* BMI staging
* Blood pressure AHA categories
* Kidney eGFR stages
* Cholesterol ratios
* Composite clinical risk indexes

### API Tests

The FastAPI test suite verifies:

* `/model-status`
* `/predict`
* `/explain`
* `/retrain`

It also validates SHAP explanations and clinical text-generation behavior.

---

# 📊 Clinical Datasets

MediSight AI uses de-identified clinical and health-indicator datasets for research, development, model training, and demonstration purposes.

### 1. Diabetes Health Indicators

CDC BRFSS 2015 dataset containing approximately **253,680 survey responses** and health-related indicators associated with diabetes.

### 2. Heart Disease Health Indicators

CDC BRFSS health indicators used for cardiovascular disease risk modeling.

### 3. Chronic Kidney Disease

Clinical measurements including:

* GFR
* Creatinine
* Electrolytes
* HbA1c
* Other laboratory indicators

### 4. Stroke Prediction Dataset

Structured clinical risk factors including:

* Hypertension
* Heart disease
* Average glucose level
* BMI
* Demographic and lifestyle indicators

### 5. Liver Patient Dataset

Clinical laboratory measurements including:

* Bilirubin
* SGPT
* SGOT
* Albumin
* Other liver-related indicators

### 6. Breast Cancer Wisconsin Dataset

Nuclear feature measurements obtained from fine-needle aspirate samples.

### 7. Hypertension Health Indicators

BRFSS-based indicators associated with blood pressure and hypertension risk.

---

# 🔐 Data Privacy & Security

MediSight AI is designed with healthcare data security considerations in mind.

The platform uses:

* Supabase PostgreSQL
* Row Level Security (RLS)
* Environment-based secret management
* De-identified datasets
* Controlled database access
* Separate frontend and ML-service layers

> **Important:** The included datasets are intended for research, development, and demonstration. Production deployment with real patient information requires appropriate security controls, privacy protections, access management, auditing, regulatory compliance, and clinical validation.

---

# 🧠 Explainable AI

A key component of MediSight AI is **model interpretability**.

Instead of providing only a prediction, the platform can provide an explanation of which clinical features contributed to the model's output.

Example:

```text
Prediction:
High Diabetes Risk

Important Contributing Factors:
• Elevated glucose level
• Increased BMI
• High blood pressure
• Age-related risk
```

SHAP is used to calculate feature contributions and improve model transparency.

---

# 📈 Machine Learning Pipeline

```text
Clinical Dataset
       │
       ▼
Data Preprocessing
       │
       ▼
Feature Engineering
       │
       ▼
Train / Validation Split
       │
       ▼
┌──────────────────────────────┐
│     Model Training           │
│                              │
│ Logistic Regression          │
│ Random Forest                │
│ XGBoost                      │
│ LightGBM                     │
└──────────────┬───────────────┘
               │
               ▼
        Model Evaluation
               │
               ▼
       MLflow Experiment
          Tracking
               │
               ▼
        Best Model Selection
               │
               ▼
       FastAPI Inference API
               │
               ▼
        SHAP Explainability
               │
               ▼
       Clinical Risk Output
```

---

# 🩺 Clinical Decision Support

MediSight AI is designed to assist healthcare professionals by transforming patient information into structured risk insights.

The platform can combine:

```text
Patient Information
       +
Vital Signs
       +
Laboratory Results
       +
Medical History
       +
Existing Diagnoses
       ↓
Clinical Feature Engineering
       ↓
Machine Learning Models
       ↓
Risk Prediction
       ↓
Explainable AI
       ↓
Clinical Decision Support
```

The system is intended to **support**, not replace, professional clinical judgment.

---

# 🗺️ Future Improvements

Planned enhancements may include:

* [ ] Real-time patient monitoring
* [ ] Advanced doctor dashboard
* [ ] Appointment scheduling
* [ ] Patient notification system
* [ ] PDF clinical reports
* [ ] Additional disease prediction models
* [ ] Model version management
* [ ] Advanced MLflow model registry
* [ ] Automated model retraining pipeline
* [ ] Production-grade authentication and authorization
* [ ] Comprehensive audit logging
* [ ] Cloud deployment
* [ ] FHIR-compliant healthcare data integration

---

# 🤝 Contributing

Contributions are welcome.

### Development Workflow

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Run the test suite.

```bash
pytest ml-service/tests/
```

5. Commit your changes.

```bash
git commit -m "Add: your feature"
```

6. Push the branch.

```bash
git push origin feature/your-feature
```

7. Open a Pull Request.

---

# 📄 License

Add your project's license information here.

For example:

```text
MIT License
```

---

# ⚠️ Medical Disclaimer

MediSight AI is an **experimental clinical decision-support and research platform**.

The predictions, risk scores, explanations, and recommendations generated by this system should **not be considered medical advice or a definitive diagnosis**.

Healthcare professionals should independently evaluate patient information and use appropriate clinical judgment before making medical decisions.

The developers and contributors are not responsible for medical decisions, treatment outcomes, or patient harm resulting from the use or misuse of this software.

---

# 👨‍💻 Project

**MediSight AI**
Enterprise Healthcare Early Disease Risk Prediction & Clinical Decision Support Platform

Built with **Next.js, Supabase, FastAPI, Scikit-learn, XGBoost, LightGBM, SHAP, and MLflow**.
