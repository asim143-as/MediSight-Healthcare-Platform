# MediSight AI - Manual Setup Instructions (Step-by-Step)

This guide provides detailed manual setup instructions for running MediSight AI locally without using the quick-start scripts.

---

## Part 1: Environment Verification

### Step 1a: Verify Node.js
```powershell
node --version
npm --version
```
Expected: Node 18.x or higher

If not installed: https://nodejs.org/

### Step 1b: Verify Python
```powershell
python --version
python -m pip --version
```
Expected: Python 3.10 or higher, pip 20+

If not installed: https://www.python.org/

### Step 1c: Install Supabase CLI
```powershell
npm install -g supabase

# Verify installation
supabase --version
```

### Step 1d: Docker Desktop
Download and install: https://www.docker.com/products/docker-desktop

Start Docker Desktop and keep it running.

---

## Part 2: Start Supabase Local Development

### Step 2a: Open Terminal in Project Root
```powershell
cd c:\Users\toshiba\Desktop\MediSight-Healthcare-Platform
```

### Step 2b: Start Supabase Services
```powershell
supabase start
```

**This will:**
- Download Supabase Docker images
- Start PostgreSQL database on port 54322
- Start API server on port 54321
- Start Auth on port 54320
- Start Studio web UI on port 54323
- Load all migrations from `supabase/migrations/`
- Seed sample data

**Expected Output:**
```
Started auth (in 534ms).
Started rest (PID 12345).
Started realtime (PID 12346).
Started storage (in 234ms).
Started functions (in 456ms).
Started postgres (in 789ms).
Started inbucket (in 234ms).

Seeding data for project 'Ezitech_Internship_Task'...
✓ Database seeded successfully
```

### Step 2c: Verify Supabase is Running
```powershell
# In a new terminal, try accessing the API
curl http://localhost:54321/rest/v1/
```

Expected: JSON response from API

### Step 2d: Access Supabase Studio
Open browser and go to: http://localhost:54323

Login with:
- Email: `supabase@example.com`
- Password: `password`

You can explore the database, run SQL, manage auth, etc.

---

## Part 3: Setup ML Service

### Step 3a: Open New Terminal Window
```powershell
cd c:\Users\toshiba\Desktop\MediSight-Healthcare-Platform\ml-service
```

### Step 3b: Create Python Virtual Environment
```powershell
python -m venv venv
```

### Step 3c: Activate Virtual Environment
```powershell
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

# On Windows Command Prompt:
venv\Scripts\activate.bat

# On macOS/Linux:
source venv/bin/activate
```

After activation, your prompt should show `(venv)` prefix.

### Step 3d: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

**This installs:**
- FastAPI & Uvicorn (web framework)
- scikit-learn, XGBoost, LightGBM (ML models)
- SHAP (explainability)
- MLflow (experiment tracking)
- pandas, numpy (data processing)
- psycopg2-binary (PostgreSQL driver)
- pytest (testing)

**Expected Output:**
```
Successfully installed fastapi uvicorn scikit-learn xgboost lightgbm shap mlflow ...
```

### Step 3e: Verify Models are Available
```powershell
# List model artifacts
ls models\production\

# Expected files:
# - model.joblib (trained LightGBM model)
# - model_metadata.json (model metadata)
```

If models don't exist, see troubleshooting section.

### Step 3f: Start ML Service
```powershell
uvicorn app.main:app --reload --port 8000
```

**Expected Output:**
```
Loaded production model: LightGBM (AUC: 0.8307)
Uvicorn running on http://127.0.0.1:8000
INFO:     Uvicorn server process started [12345]
INFO:     Application startup complete
```

### Step 3g: Test ML Service
Open new terminal:
```powershell
# Test health endpoint
curl http://localhost:8000/health

# Test metrics endpoint
curl http://localhost:8000/metrics

# Test prediction
curl -X POST http://localhost:8000/predict `
  -H "Content-Type: application/json" `
  -d '{
    "blood_glucose": 125,
    "blood_pressure_systolic": 140,
    "blood_pressure_diastolic": 90,
    "bmi": 28,
    "age": 45,
    "family_history_diabetes": 1,
    "smoker": 0,
    "physical_activity": 1,
    "fruit_consumption": 1,
    "vegetables_consumption": 1,
    "heart_disease": 0,
    "high_blood_pressure": 1,
    "stroke_history": 0,
    "kidney_disease": 0,
    "diabetes_currently": 0
  }'
```

Expected: JSON response with prediction score and risk level

---

## Part 4: Setup Frontend

### Step 4a: Open New Terminal Window
```powershell
cd c:\Users\toshiba\Desktop\MediSight-Healthcare-Platform\frontend
```

### Step 4b: Install Node Dependencies
```powershell
npm install
```

**This installs ~150 packages:**
- Next.js 14, React 18, TypeScript
- Tailwind CSS, shadcn/ui components
- TanStack Query, Zustand, Framer Motion
- Recharts, Lucide icons
- Supabase client libraries

**Expected Output:**
```
added 154 packages in 2m 15s
up to date, audited 154 packages
```

### Step 4c: Create Environment File
```powershell
# Create .env.local file with Supabase credentials
$env_content = @"
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aXRlY2giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMzExMTAxMiwiZXhwIjoxODgwODc3MDEyfQ.1234567890
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000
"@

$env_content | Out-File -FilePath ".env.local" -Encoding UTF8
```

**Or manually create `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aXRlY2giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMzExMTAxMiwiZXhwIjoxODgwODc3MDEyfQ.1234567890
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000
```

### Step 4d: Start Frontend Development Server
```powershell
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 14.2.35
  - ready started server on 0.0.0.0:3000, url: http://localhost:3000
  - event compiled client and server successfully
  - warn Fast Refresh had to perform a full reload
```

### Step 4e: Access Frontend
Open browser: http://localhost:3000

You should see the MediSight AI welcome page.

---

## Part 5: Test the Complete System

### Step 5a: Create Test User (Option 1: Via Supabase Studio)
1. Go to http://localhost:54323
2. Click "Authentication" → "Users"
3. Click "Create new user"
4. Email: `doctor@test.com`
5. Password: `Test@123456`
6. Click "Create user"

### Step 5b: Login to Frontend
1. Go to http://localhost:3000
2. Click "Login"
3. Email: `doctor@test.com`
4. Password: `Test@123456`
5. Click "Sign In"

### Step 5c: Explore Dashboard
1. After login, you should see the main dashboard
2. View patient list
3. Click on a patient
4. Fill prediction form
5. Submit and see predictions with SHAP explanations

### Step 5d: Test Predictions
1. Navigate to Patient Detail page
2. Scroll to "Risk Prediction" section
3. Fill in clinical data:
   - Blood Glucose: 125
   - Blood Pressure: 140/90
   - BMI: 28
   - Age: 45
   - Other checkboxes as desired
4. Click "Predict Risk"
5. View the result and SHAP explanation chart

### Step 5e: Test AI Chat
1. Click "Chat" or "AI Assistant"
2. Type a medical question
3. Get AI-powered response with clinical context

---

## Part 6: Database Access

### Option A: Via Supabase Studio Web UI
```
URL: http://localhost:54323
Tab: "SQL Editor"
Run queries directly
```

### Option B: Via psql Command Line
```powershell
# Connect to PostgreSQL
psql -h localhost -p 54322 -U postgres -d postgres

# Default password: postgres (when prompted)

# Useful commands:
\dt                          # List tables
SELECT COUNT(*) FROM patients;   # Count patients
SELECT * FROM predictions LIMIT 5;  # View predictions
\q                           # Exit psql
```

### Option C: Via Database Tools
- **DBeaver**: https://dbeaver.io/ (recommended)
- **pgAdmin**: http://localhost:54323 (included with Supabase)
- **VS Code Extension**: "SQLTools"

**Connection Details:**
```
Host: localhost
Port: 54322
Username: postgres
Password: postgres
Database: postgres
```

---

## Part 7: Run Tests

### Frontend Tests
```powershell
cd frontend

# Lint check
npm run lint

# Note: More comprehensive tests can be added in src/__tests__/
```

### ML Service Tests
```powershell
cd ml-service

# Ensure venv is activated
.\venv\Scripts\Activate.ps1

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app

# Run specific test file
pytest tests/test_api.py -v
```

---

## Part 8: Stopping Services

### Stop ML Service
```powershell
# In ML Service terminal
# Press Ctrl+C
```

### Stop Frontend
```powershell
# In Frontend terminal
# Press Ctrl+C
```

### Stop Supabase
```powershell
# In any terminal
supabase stop
```

---

## Troubleshooting

### Issue: "Port 3000 already in use"
```powershell
# Find process using port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# Kill it (replace PID with actual process ID)
Stop-Process -Id PID -Force

# Or use different port:
npm run dev -- -p 3001
```

### Issue: "Port 8000 already in use"
```powershell
# Find process using port 8000
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess

# Kill it
Stop-Process -Id PID -Force

# Or run on different port:
uvicorn app.main:app --port 8001
```

### Issue: Supabase won't start
```powershell
# Check if Docker is running
docker info

# If Docker not running, start Docker Desktop and wait

# Check Supabase status
supabase status

# View logs
docker logs <container-id>

# Force restart
supabase stop -V
supabase start --no-verify
```

### Issue: "ModuleNotFoundError: No module named 'fastapi'"
```powershell
# Ensure venv is activated (should see (venv) in prompt)
.\venv\Scripts\Activate.ps1

# Reinstall requirements
pip install -r requirements.txt
```

### Issue: Models not loading
```powershell
# Check if model files exist
ls ml-service\models\production\

# If missing, retrain:
cd ml-service
python model_training/train.py

# This will train all models and save the best one
```

### Issue: "CORS error" in browser console
```powershell
# Make sure ML service is running on port 8000
# Make sure .env.local has correct URLs:
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000
```

### Issue: Can't connect to Supabase API
```powershell
# Test API connection
curl http://localhost:54321/rest/v1/users

# If fails, check Supabase is running:
supabase status

# Check if postgres is running:
docker ps | findstr postgres
```

---

## Performance Tips

### Frontend
```powershell
# Build optimization
npm run build

# This creates .next/ folder with optimized bundle
# Serve production build:
npm run start
```

### ML Service
```powershell
# Use gunicorn for production (instead of uvicorn)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

### Database
```powershell
# Check slow queries in Supabase Studio
# SQL Editor → "Explain" query plan
# Identify missing indexes

# View query performance
# Dashboard → "Database" tab
```

---

## Development Workflow

### Making Frontend Changes
1. Edit files in `frontend/src/`
2. Next.js auto-reloads on save (Fast Refresh)
3. Check browser for changes
4. No restart needed

### Making ML Changes
1. Edit files in `ml-service/app/`
2. API auto-reloads (--reload flag)
3. Test endpoint changes immediately
4. No restart needed

### Making Database Changes
1. Create new migration: `supabase migration new <name>`
2. Write SQL in `supabase/migrations/<new-file>.sql`
3. Apply: `supabase db push`
4. If issues, `supabase db reset`

---

## Next Steps

1. ✅ Verify all three services are running
2. ✅ Test login and predictions
3. ✅ Explore database via Supabase Studio
4. ✅ Review SHAP explanations
5. 📖 Read [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md)
6. 📖 Read [LOCAL_SETUP.md](LOCAL_SETUP.md)
7. 🔧 Explore admin panel (in progress)
8. 🧪 Run test suite

---

## Getting Help

| Issue | File | Command |
|-------|------|---------|
| Setup problem | LOCAL_SETUP.md | Read full guide |
| Architecture questions | PROJECT_ANALYSIS.md | Read analysis |
| API details | API docs (Swagger) | Visit http://localhost:8000/docs |
| Database structure | Supabase Studio | Check schema |
| Code issues | Error message | Search in code files |

---

**Last Updated**: August 18, 2026
