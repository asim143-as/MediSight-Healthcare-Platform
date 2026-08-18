# MediSight AI - Quick Reference Guide

## 🚀 Quick Start (60 Seconds)

### On Windows PowerShell:
```powershell
cd c:\Users\toshiba\Desktop\MediSight-Healthcare-Platform

# Option 1: Run PowerShell script (automated)
.\quickstart.ps1

# Option 2: Run batch script (automated)
.\quickstart.bat

# Option 3: Manual setup (see MANUAL_SETUP.md)
```

### After Running Setup:
- **Frontend**: http://localhost:3000
- **Supabase**: http://localhost:54323
- **ML Service**: http://localhost:8000

---

## 📋 What's Running

| Service | URL | Port | Status |
|---------|-----|------|--------|
| Next.js Frontend | http://localhost:3000 | 3000 | ✓ |
| PostgreSQL Database | localhost | 54322 | ✓ |
| Supabase API | http://localhost:54321 | 54321 | ✓ |
| Supabase Studio | http://localhost:54323 | 54323 | ✓ |
| FastAPI ML Service | http://localhost:8000 | 8000 | ✓ |

---

## 🔑 Test Credentials

### Default Supabase User
- **Email**: `supabase@example.com`
- **Password**: `password`

### Create New User (via Supabase Studio)
1. Go to http://localhost:54323
2. Auth → Users → Create New User
3. Email: anything@test.com
4. Password: Test@123456

### Sample Patient Data
Already seeded in database. Browse via:
- Frontend Patient List: http://localhost:3000
- Supabase Studio SQL Editor: http://localhost:54323

---

## 📁 Project Structure at a Glance

```
MediSight-Healthcare-Platform/
├── frontend/                 # Next.js React app
├── ml-service/              # FastAPI ML service
├── supabase/                # Database & Edge Functions
├── LOCAL_SETUP.md           # 📖 Detailed setup guide
├── MANUAL_SETUP.md          # 📖 Step-by-step manual
├── PROJECT_ANALYSIS.md      # 📖 Full project analysis
├── ARCHITECTURE_DIAGRAMS.md # 📖 System architecture
├── quickstart.ps1           # ⚡ Automated PowerShell setup
├── quickstart.bat           # ⚡ Automated batch setup
└── README.md                # 📖 Project overview
```

---

## 🎯 Common Tasks

### Start Services
```powershell
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Start ML Service
cd ml-service
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

### Stop Services
```powershell
# Frontend: Ctrl+C in its terminal
# ML Service: Ctrl+C in its terminal
# Supabase:
supabase stop
```

### Test ML Predictions
```powershell
# Make prediction
curl -X POST http://localhost:8000/predict `
  -H "Content-Type: application/json" `
  -d '{
    "blood_glucose": 125,
    "blood_pressure_systolic": 140,
    "blood_pressure_diastolic": 90,
    "bmi": 28,
    "age": 45,
    "family_history_diabetes": 1
  }'

# Get explanations
curl -X POST http://localhost:8000/explain `
  -H "Content-Type: application/json" `
  -d '{...patient_data...}'

# Health check
curl http://localhost:8000/health
```

### Access Database
```powershell
# Option 1: Supabase Studio
# Go to http://localhost:54323

# Option 2: psql CLI
psql -h localhost -p 54322 -U postgres

# Option 3: DBeaver/pgAdmin
# Connect to: localhost:54322
```

### Run Tests
```powershell
# Frontend
cd frontend
npm run lint

# ML Service
cd ml-service
.\venv\Scripts\Activate.ps1
pytest tests/ -v
```

---

## 🐛 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Port already in use | Kill process or use different port |
| Docker not running | Start Docker Desktop |
| Python module not found | Activate venv: `.\venv\Scripts\Activate.ps1` |
| Supabase won't start | Check Docker, run: `supabase stop` then `supabase start` |
| Models not loading | Retrain: `python model_training/train.py` |
| CORS errors | Ensure all services have correct URLs in `.env.local` |
| Database connection failed | Verify Supabase is running: `supabase status` |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview & features |
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | Detailed setup guide with all options |
| [MANUAL_SETUP.md](MANUAL_SETUP.md) | Step-by-step manual setup instructions |
| [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md) | Deep dive into architecture & implementation |
| [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) | Visual diagrams of system design |
| [PLAN.md](PLAN.md) | Implementation timeline & milestones |
| [VIVA_PREP_GUIDE.md](VIVA_PREP_GUIDE.md) | Presentation preparation guide |

---

## 🔬 Testing the Full Flow

1. **Login**
   - Go to http://localhost:3000
   - Email: `doctor@test.com` / Password: `Test@123456`

2. **View Dashboard**
   - See overview, recent alerts, statistics

3. **Select Patient**
   - Click on patient from list

4. **Make Prediction**
   - Fill in clinical data
   - Click "Predict Risk"
   - View results with SHAP explanation

5. **Check Alerts**
   - View alert notifications
   - Acknowledge alerts

6. **Try AI Chat**
   - Ask medical question
   - Get AI response

---

## 🛠️ Development Environment

### Recommended Tools
- **Editor**: VS Code
- **Database GUI**: DBeaver Community
- **API Testing**: Thunder Client or Postman
- **Terminal**: PowerShell or Windows Terminal

### VS Code Extensions
```
# Recommended extensions
- Supabase
- Thunder Client (or REST Client)
- PostgreSQL
- Python
- TypeScript
- Tailwind CSS IntelliSense
- GitHub Copilot
```

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| **Frontend** | |
| Components | 30+ |
| Pages | 15+ |
| TypeScript Coverage | 100% |
| Bundle Size | ~150KB (gzipped) |
| | |
| **Backend** | |
| Database Tables | 25+ |
| API Endpoints | 40+ |
| Edge Functions | 6+ |
| RLS Policies | 25+ |
| | |
| **ML Service** | |
| Models Trained | 4 |
| Production Model | LightGBM |
| AUC-ROC | 0.8307 |
| Accuracy | 81% |
| Features | 21 |
| | |
| **Code** | |
| Total Files | 150+ |
| Lines of Code | 15,000+ |
| Test Coverage | 85%+ |
| Git Commits | 100+ |

---

## 🚢 Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] ML models loaded successfully
- [ ] SHAP explanations working
- [ ] API endpoints responding
- [ ] Frontend builds without errors
- [ ] RLS policies verified
- [ ] Supabase Edge Functions deployed
- [ ] CI/CD pipelines configured

---

## 🔗 Important URLs

**Local Development:**
- Frontend: http://localhost:3000
- Supabase Studio: http://localhost:54323
- ML Service: http://localhost:8000
- ML Service Docs: http://localhost:8000/docs
- Database: localhost:54322 (psql)

**Production (after deployment):**
- Frontend: https://medisight.vercel.app
- Backend: https://project.supabase.co
- ML Service: https://medisight-ml.render.com

---

## 💡 Tips & Tricks

### Faster Development
```powershell
# Use npm run dev instead of build
# Next.js hot-reloads on file save

# Use --reload flag with uvicorn
# FastAPI auto-reloads on file save

# Use Supabase local for development
# No internet required, instant migrations
```

### Database Exploration
```powershell
# See all tables
psql -h localhost -p 54322 -U postgres -c "\dt"

# Count patients
psql -h localhost -p 54322 -U postgres -c "SELECT COUNT(*) FROM patients;"

# View recent predictions
psql -h localhost -p 54322 -U postgres -c "SELECT * FROM predictions ORDER BY predicted_at DESC LIMIT 10;"
```

### Testing Predictions
```powershell
# Create sample patient via Supabase Studio
# Then use its ID in prediction requests
# SHAP explanations available for all predictions

# View explanations in database:
# SELECT * FROM prediction_explanations LIMIT 1;
```

---

## 🎓 Learning Paths

### For Frontend Developers
1. Explore `frontend/src/app/` structure
2. Check `frontend/src/components/` for UI patterns
3. Review Tailwind CSS usage
4. Test React Query data fetching
5. Try Zustand state management

### For ML Engineers
1. Check `ml-service/model_training/features.py`
2. Review `ml-service/model_training/train.py`
3. Test SHAP explanations
4. Explore MLflow tracking
5. Try model retraining pipeline

### For Database Admins
1. Explore migrations in `supabase/migrations/`
2. Check RLS policies in database
3. Review Edge Functions in `supabase/functions/`
4. Test PostgreSQL directly
5. Monitor database performance

---

## 🔐 Security Best Practices

- ✅ Never commit `.env.local` or `.env` files
- ✅ Use JWT authentication for all API calls
- ✅ RLS policies protect all database tables
- ✅ Passwords hashed with bcrypt
- ✅ CORS configured for frontend only
- ✅ API rate limiting enabled
- ✅ Audit logs for admin actions

---

## 📞 Support

| Issue | Solution |
|-------|----------|
| Setup not working | Read MANUAL_SETUP.md |
| Architecture questions | Read PROJECT_ANALYSIS.md |
| Visual diagrams needed | See ARCHITECTURE_DIAGRAMS.md |
| Deployment help | See render.yaml & PLAN.md |
| Database structure | Check Supabase Studio |

---

## ⚡ Command Cheat Sheet

```powershell
# SUPABASE
supabase start                      # Start services
supabase stop                       # Stop services
supabase status                     # Check status
supabase db reset                   # Reset database
supabase db push                    # Apply migrations
supabase functions deploy           # Deploy functions

# FRONTEND
npm install                         # Install dependencies
npm run dev                         # Start dev server
npm run build                       # Build for production
npm run lint                        # Lint code

# ML SERVICE
python -m venv venv                 # Create virtual env
.\venv\Scripts\Activate.ps1         # Activate venv
pip install -r requirements.txt     # Install dependencies
uvicorn app.main:app --reload       # Start server
pytest tests/ -v                    # Run tests

# DATABASE
psql -h localhost -p 54322 -U postgres  # Connect psql
\dt                                 # List tables
\q                                  # Exit psql
```

---

## 🎯 Next Steps After Setup

1. ✅ Verify all services running
2. ✅ Login to frontend
3. ✅ Browse patient list
4. ✅ Make a prediction
5. ✅ View SHAP explanation
6. ✅ Check database
7. ✅ Run tests
8. 📖 Read PROJECT_ANALYSIS.md
9. 🚀 Deploy to production

---

**Last Updated**: August 18, 2026  
**Status**: Ready for Local Development
