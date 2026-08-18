# MediSight AI - Viva Preparation Guide

## 🚀 1. The 60-Second Elevator Pitch (Start with this!)
"MediSight AI is an enterprise-grade Clinical Decision Support Platform. Its primary goal is to help healthcare professionals predict early disease risks (starting with Diabetes) using patient data. What makes it unique is that it doesn't just give a prediction—it uses Explainable AI (SHAP) to tell the doctor exactly **why** a patient is at risk, translating complex math into readable clinical insights. It is built with a Next.js frontend, a Supabase PostgreSQL backend, and a FastAPI Machine Learning engine."

---

## 🏗️ 2. Explain the Architecture (The "3 Pillars")
Professors love when you can clearly explain how systems talk to each other. Break it down into three parts:

1. **The Frontend (User Interface):** Built with **Next.js 14 and Tailwind CSS**. It provides a clean, modern dashboard for doctors to view patient records, check real-time alerts, and see risk charts.
2. **The Backend (Data & Security):** Powered by **Supabase (PostgreSQL)**. It handles secure user authentication, stores patient records, and uses "Edge Functions" to securely route data between the frontend and the AI.
3. **The ML Engine (The Brain):** A standalone **Python FastAPI** service. It takes 21 patient data points (like BMI, Age, Blood Pressure), runs them through trained machine learning models (like LightGBM and XGBoost), and returns a risk score and an explanation.

---

## ⭐ 3. Key Technical Highlights to Show Off
If you get to share your screen or talk about specific features, make sure to mention these:

* **Explainable AI (SHAP):** Emphasize that AI in healthcare is often a "black box" (doctors don't trust what they don't understand). You solved this by using SHAP to generate natural language explanations (e.g., *"Risk is elevated primarily due to High Blood Pressure and BMI"*).
* **Model Drift Monitoring:** Mention that your API has a `/drift-status` endpoint that calculates PSI (Population Stability Index). This proves you thought about production MLOps—ensuring the model stays accurate over time.
* **Automated Pipeline:** Mention that your training script automatically evaluates Logistic Regression, Random Forest, XGBoost, and LightGBM, logs the metrics using **MLflow**, and picks the best one (based on AUC-ROC) for production.

---

## ❓ 4. Common Viva Questions & How to Answer Them

**Q: Why did you choose Next.js and FastAPI instead of a single framework like Django?**
> *"Separation of concerns. Next.js is incredible for building fast, interactive user interfaces, while Python (FastAPI) is the industry standard for Data Science and Machine Learning. Keeping them separate allows the ML engine to scale independently from the web traffic."*

**Q: How accurate is your model?**
> *"Our primary model achieved an AUC-ROC score of over 0.80 on the CDC BRFSS Diabetes dataset. However, in healthcare, accuracy isn't everything—recall (catching positive cases) and explainability are just as critical, which is why we integrated SHAP."*

**Q: Is this meant to replace doctors?**
> *"Absolutely not. MediSight AI is a **Clinical Decision Support System**. It is designed to act as a 'second pair of eyes' to flag high-risk patients early, but the final diagnosis always remains with the qualified healthcare professional."*

**Q: How is patient data secured?**
> *"Patient data is highly sensitive. We use Supabase PostgreSQL with Row Level Security (RLS) enabled, ensuring that doctors can only access records for their own patients, and no unauthorized users can read the database."*

---

## 🎙️ 5. Tips for a Confident Online Presentation

1. **Lead the Conversation:** Don't wait for them to ask you what a file does. Say, *"I'd love to show you the most complex part of the system, which is our FastAPI ML pipeline..."* and take them there.
2. **Acknowledge Limitations:** If they point out a flaw, agree with them! Say: *"That is a great point. If we had another 3 months, that would be the very next feature on our roadmap."* (This shows maturity).
3. **Screen Share Preparation:** Close all irrelevant tabs, clear your desktop, and have your code editor, the running app, and your database dashboard open and ready to switch between smoothly.
4. **Pace Yourself:** When explaining the flow of data (Frontend -> Supabase -> FastAPI), trace it slowly with your mouse.
