"""
Clinical Feature Engineering Module
Provides calculations for BMI categories, Blood Pressure stages,
eGFR kidney stages, cholesterol ratios, and composite clinical risk indexes.
"""

def calculate_bmi_category(bmi: float) -> str:
    """
    Categorize BMI according to WHO standards.
    """
    if bmi < 18.5:
        return "Underweight"
    elif 18.5 <= bmi < 25.0:
        return "Normal"
    elif 25.0 <= bmi < 30.0:
        return "Overweight"
    else:
        return "Obese"

def calculate_bp_category(systolic: float, diastolic: float) -> str:
    """
    Categorize Blood Pressure according to AHA standards.
    """
    if systolic > 180 or diastolic > 120:
        return "Hypertensive Crisis"
    elif systolic >= 140 or diastolic >= 90:
        return "Stage 2 Hypertension"
    elif 130 <= systolic < 140 or 80 <= diastolic < 90:
        return "Stage 1 Hypertension"
    elif 120 <= systolic < 130 and diastolic < 80:
        return "Elevated"
    elif systolic < 120 and diastolic < 80:
        return "Normal"
    else:
        # Fallback for borderline or unusual cases
        if systolic >= 140 or diastolic >= 90:
            return "Stage 2 Hypertension"
        return "Elevated"

def calculate_kidney_stage(gfr: float) -> str:
    """
    Classify Chronic Kidney Disease (CKD) stages based on eGFR.
    """
    if gfr >= 90.0:
        return "Stage 1"
    elif 60.0 <= gfr < 90.0:
        return "Stage 2"
    elif 45.0 <= gfr < 60.0:
        return "Stage 3a"
    elif 30.0 <= gfr < 45.0:
        return "Stage 3b"
    elif 15.0 <= gfr < 30.0:
        return "Stage 4"
    else:
        return "Stage 5"

def calculate_cholesterol_ratio(total_chol: float, hdl: float) -> float:
    """
    Compute Total Cholesterol to HDL ratio.
    """
    if hdl <= 0:
        return 0.0
    return round(total_chol / hdl, 2)

def calculate_composite_risk_index(
    age: float,
    systolic_bp: float,
    fasting_blood_sugar: float,
    gfr: float,
    smoking: int,
    history_diabetes: int = 0
) -> float:
    """
    Compute a simple composite risk index between 0.0 and 1.0.
    Combines major cardiovascular, diabetic, and kidney risk factors.
    """
    score = 0
    max_score = 0
    
    # Age factor (max 3 points)
    if age >= 65:
        score += 3
    elif age >= 45:
        score += 2
    else:
        score += 1
    max_score += 3
    
    # Blood Pressure factor (max 3 points)
    if systolic_bp >= 140:
        score += 3
    elif systolic_bp >= 130:
        score += 2
    elif systolic_bp >= 120:
        score += 1
    max_score += 3
    
    # Blood Sugar factor (max 3 points)
    if fasting_blood_sugar >= 126 or history_diabetes == 1:
        score += 3
    elif fasting_blood_sugar >= 100:
        score += 2
    else:
        score += 0
    max_score += 3
    
    # Kidney GFR factor (max 3 points)
    if gfr < 30:
        score += 3
    elif gfr < 60:
        score += 2
    elif gfr < 90:
        score += 1
    max_score += 3
    
    # Smoking factor (max 2 points)
    if smoking == 1:
        score += 2
    max_score += 2
    
    return round(score / max_score, 2)
