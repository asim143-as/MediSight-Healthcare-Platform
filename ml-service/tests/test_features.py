import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from model_training.features import (
    calculate_bmi_category,
    calculate_bp_category,
    calculate_kidney_stage,
    calculate_cholesterol_ratio,
    calculate_composite_risk_index
)


# ── BMI Categories ────────────────────────────────────────────────────────────

class TestBMICategory:
    def test_underweight(self):
        assert calculate_bmi_category(17.5) == "Underweight"
        assert calculate_bmi_category(10.0) == "Underweight"

    def test_normal(self):
        assert calculate_bmi_category(22.0) == "Normal"
        assert calculate_bmi_category(18.5) == "Normal"   # exact lower boundary

    def test_overweight(self):
        assert calculate_bmi_category(27.5) == "Overweight"
        assert calculate_bmi_category(25.0) == "Overweight"  # exact lower boundary

    def test_obese(self):
        assert calculate_bmi_category(35.0) == "Obese"
        assert calculate_bmi_category(30.0) == "Obese"  # exact lower boundary
        assert calculate_bmi_category(50.0) == "Obese"  # extreme value

    def test_bmi_categories_return_strings(self):
        for bmi in [10, 20, 28, 40]:
            result = calculate_bmi_category(float(bmi))
            assert isinstance(result, str)
            assert result in ["Underweight", "Normal", "Overweight", "Obese"]


# ── Blood Pressure Categories ─────────────────────────────────────────────────

class TestBPCategory:
    def test_normal(self):
        assert calculate_bp_category(115, 75) == "Normal"
        assert calculate_bp_category(119, 79) == "Normal"

    def test_elevated(self):
        assert calculate_bp_category(125, 78) == "Elevated"
        assert calculate_bp_category(120, 79) == "Elevated"

    def test_stage1_hypertension(self):
        assert calculate_bp_category(135, 82) == "Stage 1 Hypertension"
        assert calculate_bp_category(130, 80) == "Stage 1 Hypertension"

    def test_stage2_hypertension(self):
        assert calculate_bp_category(145, 95) == "Stage 2 Hypertension"
        assert calculate_bp_category(140, 90) == "Stage 2 Hypertension"

    def test_hypertensive_crisis(self):
        assert calculate_bp_category(185, 125) == "Hypertensive Crisis"
        assert calculate_bp_category(181, 115) == "Hypertensive Crisis"

    def test_return_type(self):
        result = calculate_bp_category(120, 80)
        assert isinstance(result, str)


# ── Kidney Stages (eGFR) ──────────────────────────────────────────────────────

class TestKidneyStage:
    def test_stage1(self):
        assert calculate_kidney_stage(95.0) == "Stage 1"
        assert calculate_kidney_stage(90.0) == "Stage 1"

    def test_stage2(self):
        assert calculate_kidney_stage(75.0) == "Stage 2"
        assert calculate_kidney_stage(60.0) == "Stage 2"

    def test_stage3a(self):
        assert calculate_kidney_stage(50.0) == "Stage 3a"
        assert calculate_kidney_stage(45.0) == "Stage 3a"

    def test_stage3b(self):
        assert calculate_kidney_stage(35.0) == "Stage 3b"
        assert calculate_kidney_stage(30.0) == "Stage 3b"

    def test_stage4(self):
        assert calculate_kidney_stage(20.0) == "Stage 4"
        assert calculate_kidney_stage(15.0) == "Stage 4"

    def test_stage5(self):
        assert calculate_kidney_stage(10.0) == "Stage 5"
        assert calculate_kidney_stage(0.0) == "Stage 5"


# ── Cholesterol Ratio ─────────────────────────────────────────────────────────

class TestCholesterolRatio:
    def test_normal_ratio(self):
        assert calculate_cholesterol_ratio(200, 50) == 4.0

    def test_high_ratio(self):
        assert calculate_cholesterol_ratio(250, 40) == 6.25

    def test_zero_hdl_returns_zero(self):
        """HDL of zero should return 0.0 to avoid division by zero."""
        assert calculate_cholesterol_ratio(180, 0) == 0.0

    def test_negative_hdl_returns_zero(self):
        """Negative HDL should also be safe."""
        assert calculate_cholesterol_ratio(200, -10) == 0.0

    def test_ratio_is_float(self):
        result = calculate_cholesterol_ratio(200, 50)
        assert isinstance(result, float)

    def test_ratio_precision(self):
        result = calculate_cholesterol_ratio(195, 65)
        assert round(result, 2) == 3.0


# ── Composite Risk Index ──────────────────────────────────────────────────────

class TestCompositeRiskIndex:
    def test_high_risk_greater_than_low_risk(self):
        high = calculate_composite_risk_index(
            age=70, systolic_bp=155, fasting_blood_sugar=140,
            gfr=20, smoking=1, history_diabetes=1
        )
        low = calculate_composite_risk_index(
            age=28, systolic_bp=110, fasting_blood_sugar=85,
            gfr=95, smoking=0, history_diabetes=0
        )
        assert high > low

    def test_output_range(self):
        """Score must always be in [0, 1]."""
        for age in [20, 45, 65, 80]:
            for sbp in [110, 130, 145, 160]:
                score = calculate_composite_risk_index(
                    age=age, systolic_bp=sbp, fasting_blood_sugar=100,
                    gfr=70, smoking=0
                )
                assert 0.0 <= score <= 1.0, f"Score {score} out of range for age={age}, sbp={sbp}"

    def test_smoking_increases_risk(self):
        base = calculate_composite_risk_index(50, 130, 100, 70, smoking=0)
        smoker = calculate_composite_risk_index(50, 130, 100, 70, smoking=1)
        assert smoker > base

    def test_diabetes_history_increases_risk(self):
        without = calculate_composite_risk_index(50, 130, 126, 70, smoking=0, history_diabetes=0)
        with_dm = calculate_composite_risk_index(50, 130, 126, 70, smoking=0, history_diabetes=1)
        # With history should be >= without (fasting_blood_sugar already triggers diabetic score)
        assert with_dm >= without

    def test_return_type(self):
        result = calculate_composite_risk_index(50, 120, 95, 75, 0)
        assert isinstance(result, float)

    def test_precision(self):
        result = calculate_composite_risk_index(50, 120, 95, 75, 0)
        # Should be rounded to 2 decimal places
        assert result == round(result, 2)
