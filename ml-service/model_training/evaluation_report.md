# MediSight AI Model Evaluation Report
Date: 2026-07-24 11:33:57
Seed Disease: **Diabetes**
Dataset: **CDC BRFSS 2015 (50-50 Split, 70,692 Rows)**

This report evaluates four machine learning algorithms trained for early prediction of Diabetes risk. The models were evaluated on a held-out test dataset (20% of total rows).

## Model Comparison

| Model | Accuracy | Precision | Recall | F1-Score | AUC-ROC |
|---|---|---|---|---|---|
| LogisticRegression | 0.7457 | 0.7371 | 0.7639 | 0.7503 | 0.8232 |
| RandomForest | 0.7495 | 0.7285 | 0.7953 | 0.7604 | 0.8272 |
| XGBoost | 0.7507 | 0.7295 | 0.7969 | 0.7617 | 0.8300 |
| LightGBM | 0.7529 | 0.7309 | 0.8005 | 0.7641 | 0.8307 |

## Production Selection Rationale
- **Chosen Model**: **LightGBM**
- **Validation AUC-ROC**: **0.8307**
- **Rationale**: 
  - Section 3 of the PRD sets a target success threshold of **AUC-ROC ≥ 0.80**. 
  - **LightGBM** achieved the highest overall AUC-ROC of **0.8307**, exceeding the requirement.
  - Tree-based models (XGBoost/LightGBM) outperform the Logistic Regression baseline due to their ability to capture non-linear feature interactions (such as the interaction between age, BMI, and physical activity).
  - LightGBM / XGBoost are fully supported by SHAP TreeExplainer, guaranteeing 100% explainability coverage.

## Feature Importance Summary
The models rely heavily on the following key predictors:
1. **GenHlth** (General Health self-assessment)
2. **HighBP** (High Blood Pressure status)
3. **BMI** (Body Mass Index)
4. **Age** (Age Category)
5. **HighChol** (High Cholesterol status)
