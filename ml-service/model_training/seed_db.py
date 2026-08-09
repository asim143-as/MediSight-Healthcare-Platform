import os
import random
import uuid
import json
from datetime import datetime, timedelta
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment variables")

print(f"Connecting to database: {DATABASE_URL.split('@')[-1]}")

# Name lists for generating realistic patient names
FIRST_NAMES_MALE = ["John", "James", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth"]
FIRST_NAMES_FEMALE = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Sandra", "Margaret", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White"]

def generate_patient_name(is_male=True):
    first = random.choice(FIRST_NAMES_MALE if is_male else FIRST_NAMES_FEMALE)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"

def map_brfss_age(age_val):
    # BRFSS Age is 1-13: 1=18-24, 2=25-29, 3=30-34, 4=35-39, 5=40-44, 6=45-49, 7=50-54, 8=55-59, 9=60-64, 10=65-69, 11=70-74, 12=75-79, 13=80+
    age_map = {
        1: random.randint(18, 24),
        2: random.randint(25, 29),
        3: random.randint(30, 34),
        4: random.randint(35, 39),
        5: random.randint(40, 44),
        6: random.randint(45, 49),
        7: random.randint(50, 54),
        8: random.randint(55, 59),
        9: random.randint(60, 64),
        10: random.randint(65, 69),
        11: random.randint(70, 74),
        12: random.randint(75, 79),
        13: random.randint(80, 95)
    }
    return age_map.get(int(age_val), random.randint(30, 75))

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Clear existing data for a clean re-seeding
        print("Clearing existing clinical and logging tables...")
        cur.execute("""
            TRUNCATE TABLE 
                public.patients, 
                public.vitals, 
                public.lab_results, 
                public.medications, 
                public.diagnoses, 
                public.doctor_patient_assignments, 
                public.audit_logs, 
                public.alerts, 
                public.ai_chat_sessions, 
                public.ai_messages, 
                public.predictions, 
                public.explanations
            CASCADE;
        """)

        # 1. Create mock hospitals
        hospital_id_1 = str(uuid.uuid4())

        hospital_id_2 = str(uuid.uuid4())
        
        print("Inserting hospitals...")
        cur.execute("""
            INSERT INTO public.hospitals (id, name, address, region)
            VALUES 
                (%s, 'Metro Health Medical Center', '100 Medical Plaza, Mumbai', 'North'),
                (%s, 'St. Jude Clinical Group', '250 Healthcare Way, Delhi', 'South')
            ON CONFLICT (id) DO NOTHING;
        """, (hospital_id_1, hospital_id_2))

        # 2. Insert mock auth users and let trigger create profiles
        doctor_id = "00000000-0000-0000-0000-000000000001"
        nurse_id = "00000000-0000-0000-0000-000000000002"
        admin_id = "00000000-0000-0000-0000-000000000003"
        
        print("Inserting auth users & profiles...")
        # Doctor
        cur.execute("""
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
            VALUES (
                %s, '00000000-0000-0000-0000-000000000000', 'doctor@medisight.ai', 
                crypt('Medisightai69', gen_salt('bf')), now(), 
                '{"provider": "email", "providers": ["email"]}', 
                %s, now(), now(), 'authenticated', 'authenticated'
            ) ON CONFLICT (id) DO NOTHING;
        """, (
            doctor_id, 
            json.dumps({
                "full_name": "Dr. Sarah Jenkins", 
                "role": "doctor", 
                "hospital_id": hospital_id_1, 
                "department": "Cardiology"
            })
        ))

        # Nurse
        cur.execute("""
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
            VALUES (
                %s, '00000000-0000-0000-0000-000000000000', 'nurse@medisight.ai', 
                crypt('Medisightai69', gen_salt('bf')), now(), 
                '{"provider": "email", "providers": ["email"]}', 
                %s, now(), now(), 'authenticated', 'authenticated'
            ) ON CONFLICT (id) DO NOTHING;
        """, (
            nurse_id, 
            json.dumps({
                "full_name": "Nurse Thomas Miller", 
                "role": "nurse", 
                "hospital_id": hospital_id_1, 
                "department": "Emergency Care"
            })
        ))

        # Hospital Admin
        cur.execute("""
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
            VALUES (
                %s, '00000000-0000-0000-0000-000000000000', 'admin@medisight.ai', 
                crypt('Medisightai69', gen_salt('bf')), now(), 
                '{"provider": "email", "providers": ["email"]}', 
                %s, now(), now(), 'authenticated', 'authenticated'
            ) ON CONFLICT (id) DO NOTHING;
        """, (
            admin_id, 
            json.dumps({
                "full_name": "Admin Robert Vance", 
                "role": "hospital_admin", 
                "hospital_id": hospital_id_1, 
                "department": "Administration"
            })
        ))

        # Check if the profiles exist (trigger runs asynchronously or synchronously)
        cur.execute("SELECT count(*) FROM public.profiles")
        p_count = cur.fetchone()[0]
        print(f"Profiles in DB: {p_count}")

        # 3. Load Datasets and Seed Patients
        base_dir = r"c:\Users\toshiba\Desktop\Ezitech Internship Task\ml-service\data"
        
        # We will seed:
        # - 100 Diabetes Patients
        # - 100 Heart Disease Patients
        # - 100 Kidney Disease Patients
        # - 100 Stroke Patients
        
        print("Reading datasets...")
        df_diabetes = pd.read_csv(os.path.join(base_dir, "diabetes-health-indicators-dataset", "diabetes_binary_5050split_health_indicators_BRFSS2015.csv")).sample(100)
        df_heart = pd.read_csv(os.path.join(base_dir, "heart-disease-health-indicators-dataset", "heart_disease_health_indicators_BRFSS2015.csv")).sample(100)
        df_kidney = pd.read_csv(os.path.join(base_dir, "kidney-disease-dataset", "Chronic_Kidney_Dsease_data.csv")).sample(100)
        df_stroke = pd.read_csv(os.path.join(base_dir, "synthetic_stroke_dataset", "synthetic_stroke_data.csv")).sample(100)


        # Helper list for patient batch inserts
        patients_to_insert = []
        patient_details = [] # list of dicts to seed vitals/labs later

        # --- A. Process Diabetes Patients ---
        for idx, row in df_diabetes.iterrows():
            p_id = str(uuid.uuid4())
            is_male = (int(row["Sex"]) == 1)
            name = generate_patient_name(is_male)
            age = map_brfss_age(row["Age"])
            birthdate = (datetime.now() - timedelta(days=age*365.25)).strftime("%Y-%m-%d")
            mrn = f"MRN-DIA-{random.randint(100000, 999999)}"
            
            demographics = {
                "name": name,
                "gender": "male" if is_male else "female",
                "birthdate": birthdate,
                "contact": f"+91 {random.randint(7000000000, 9999999999)}",
                "address": f"{random.randint(1, 99)}, Main St, Mumbai"
            }
            
            patients_to_insert.append((p_id, hospital_id_1, mrn, json.dumps(demographics), json.dumps([])))
            
            # Save for secondary tables
            vitals = {"bmi": float(row["BMI"])}
            # If high BP, simulate it
            if int(row["HighBP"]) == 1:
                vitals["systolic"] = random.randint(140, 160)
                vitals["diastolic"] = random.randint(90, 100)
            else:
                vitals["systolic"] = random.randint(110, 125)
                vitals["diastolic"] = random.randint(70, 80)
                
            labs = {}
            if int(row["HighChol"]) == 1:
                labs["cholesterol_total"] = random.randint(240, 290)
                labs["cholesterol_hdl"] = random.randint(30, 45)
            else:
                labs["cholesterol_total"] = random.randint(150, 199)
                labs["cholesterol_hdl"] = random.randint(50, 70)
                
            # Diabetes diagnosis status
            diagnosis = "Diabetes" if int(row["Diabetes_binary"]) == 1 else None

            patient_details.append({
                "id": p_id,
                "vitals": vitals,
                "labs": labs,
                "medications": [],
                "diagnoses": [diagnosis] if diagnosis else []
            })

        # --- B. Process Heart Disease Patients ---
        for idx, row in df_heart.iterrows():
            p_id = str(uuid.uuid4())
            is_male = (int(row["Sex"]) == 1)
            name = generate_patient_name(is_male)
            age = map_brfss_age(row["Age"])
            birthdate = (datetime.now() - timedelta(days=age*365.25)).strftime("%Y-%m-%d")
            mrn = f"MRN-HRT-{random.randint(100000, 999999)}"
            
            demographics = {
                "name": name,
                "gender": "male" if is_male else "female",
                "birthdate": birthdate,
                "contact": f"+91 {random.randint(7000000000, 9999999999)}",
                "address": f"{random.randint(1, 99)}, Medical Pkwy, Mumbai"
            }
            
            patients_to_insert.append((p_id, hospital_id_1, mrn, json.dumps(demographics), json.dumps([])))
            
            vitals = {"bmi": float(row["BMI"])}
            if int(row["HighBP"]) == 1:
                vitals["systolic"] = random.randint(140, 165)
                vitals["diastolic"] = random.randint(90, 105)
            else:
                vitals["systolic"] = random.randint(110, 125)
                vitals["diastolic"] = random.randint(70, 80)
                
            labs = {}
            if int(row["HighChol"]) == 1:
                labs["cholesterol_total"] = random.randint(240, 310)
                labs["cholesterol_hdl"] = random.randint(25, 40)
            else:
                labs["cholesterol_total"] = random.randint(160, 200)
                labs["cholesterol_hdl"] = random.randint(45, 65)

            diagnosis = "Coronary Heart Disease" if int(row["HeartDiseaseorAttack"]) == 1 else None
            
            patient_details.append({
                "id": p_id,
                "vitals": vitals,
                "labs": labs,
                "medications": [],
                "diagnoses": [diagnosis] if diagnosis else []
            })

        # --- C. Process Kidney Disease Patients ---
        for idx, row in df_kidney.iterrows():
            p_id = str(uuid.uuid4())
            is_male = (int(row["Gender"]) == 1)
            name = generate_patient_name(is_male)
            age = int(row["Age"])
            birthdate = (datetime.now() - timedelta(days=age*365.25)).strftime("%Y-%m-%d")
            mrn = f"MRN-KID-{random.randint(100000, 999999)}"
            
            demographics = {
                "name": name,
                "gender": "male" if is_male else "female",
                "birthdate": birthdate,
                "contact": f"+91 {random.randint(7000000000, 9999999999)}",
                "address": f"{random.randint(1, 99)}, Hospital St, Delhi"
            }
            
            patients_to_insert.append((p_id, hospital_id_1, mrn, json.dumps(demographics), json.dumps([])))
            
            vitals = {
                "bmi": float(row["BMI"]),
                "systolic": int(row["SystolicBP"]),
                "diastolic": int(row["DiastolicBP"]),
                "heart_rate": random.randint(65, 85)
            }
            
            labs = {
                "fasting_blood_sugar": float(row["FastingBloodSugar"]),
                "hba1c": float(row["HbA1c"]),
                "serum_creatinine": float(row["SerumCreatinine"]),
                "bun_levels": float(row["BUNLevels"]),
                "gfr": float(row["GFR"]),
                "protein_in_urine": float(row["ProteinInUrine"]),
                "acr": float(row["ACR"]),
                "hemoglobin": float(row["HemoglobinLevels"]),
                "cholesterol_total": float(row["CholesterolTotal"]),
                "cholesterol_ldl": float(row["CholesterolLDL"]),
                "cholesterol_hdl": float(row["CholesterolHDL"]),
                "cholesterol_triglycerides": float(row["CholesterolTriglycerides"]),
            }
            
            meds = []
            if int(row["ACEInhibitors"]) == 1:
                meds.append({"name": "Lisinopril (ACE Inhibitor)", "dosage": "10mg daily", "adherence": float(row["MedicationAdherence"])})
            if int(row["Diuretics"]) == 1:
                meds.append({"name": "Furosemide (Diuretic)", "dosage": "40mg daily", "adherence": float(row["MedicationAdherence"])})
            if int(row["Statins"]) == 1:
                meds.append({"name": "Atorvastatin (Statin)", "dosage": "20mg daily", "adherence": float(row["MedicationAdherence"])})

            diagnosis = "Chronic Kidney Disease" if int(row["Diagnosis"]) == 1 else None
            
            patient_details.append({
                "id": p_id,
                "vitals": vitals,
                "labs": labs,
                "medications": meds,
                "diagnoses": [diagnosis] if diagnosis else []
            })

        # --- D. Process Stroke Patients ---
        for idx, row in df_stroke.iterrows():
            p_id = str(uuid.uuid4())
            is_male = (str(row["gender"]).lower() == "male")
            name = generate_patient_name(is_male)
            age = int(float(row["age"]))
            birthdate = (datetime.now() - timedelta(days=age*365.25)).strftime("%Y-%m-%d")
            mrn = f"MRN-STR-{random.randint(100000, 999999)}"
            
            demographics = {
                "name": name,
                "gender": "male" if is_male else "female",
                "birthdate": birthdate,
                "contact": f"+91 {random.randint(7000000000, 9999999999)}",
                "address": f"{random.randint(1, 99)}, River Rd, Mumbai"
            }
            
            patients_to_insert.append((p_id, hospital_id_1, mrn, json.dumps(demographics), json.dumps([])))
            
            bmi_val = 22.0
            if not pd.isna(row["bmi"]):
                bmi_val = float(row["bmi"])
            
            vitals = {"bmi": bmi_val}
            if int(row["hypertension"]) == 1:
                vitals["systolic"] = random.randint(145, 170)
                vitals["diastolic"] = random.randint(95, 105)
            else:
                vitals["systolic"] = random.randint(115, 128)
                vitals["diastolic"] = random.randint(75, 83)
                
            labs = {"fasting_blood_sugar": float(row["avg_glucose_level"])}
            
            diagnosis = "Stroke" if int(row["stroke"]) == 1 else None
            
            patient_details.append({
                "id": p_id,
                "vitals": vitals,
                "labs": labs,
                "medications": [],
                "diagnoses": [diagnosis] if diagnosis else []
            })

        # Insert patients in bulk
        print(f"Inserting {len(patients_to_insert)} patients...")
        execute_values(cur, """
            INSERT INTO public.patients (id, hospital_id, mrn, demographics, family_history)
            VALUES %s ON CONFLICT (id) DO NOTHING
        """, patients_to_insert)

        # 4. Insert Vitals, Labs, Medications, Diagnoses, Doctor Assignments
        vitals_inserts = []
        labs_inserts = []
        meds_inserts = []
        diag_inserts = []
        doctor_assigns = []

        now_dt = datetime.now()

        for detail in patient_details:
            p_id = detail["id"]
            
            # Doctor assignment
            doctor_assigns.append((doctor_id, p_id, hospital_id_1))
            
            # Vitals
            for v_type, v_val in detail["vitals"].items():
                unit = "kg/m²" if v_type == "bmi" else "mmHg" if "bp" in v_type or v_type in ["systolic", "diastolic"] else "bpm"
                vitals_inserts.append((
                    str(uuid.uuid4()), p_id, v_type, v_val, unit, now_dt
                ))
                
            # Labs
            for l_name, l_val in detail["labs"].items():
                unit = "mg/dL" if "sugar" in l_name or "creatinine" in l_name or "cholesterol" in l_name or "bun" in l_name or "triglycerides" in l_name else "mL/min/1.73m²" if l_name == "gfr" else "g/dL" if l_name == "hemoglobin" else "mg/g" if l_name == "acr" else "g/L"
                labs_inserts.append((
                    str(uuid.uuid4()), p_id, l_name, l_val, unit, now_dt
                ))
                
            # Medications
            for med in detail["medications"]:
                meds_inserts.append((
                    str(uuid.uuid4()), p_id, med["name"], med["dosage"], now_dt.date() - timedelta(days=30), med["adherence"]
                ))
                
            # Diagnoses
            for diag in detail["diagnoses"]:
                diag_inserts.append((
                    str(uuid.uuid4()), p_id, diag, now_dt.date() - timedelta(days=60), "Clinical Ingestion"
                ))

        print(f"Inserting {len(vitals_inserts)} vital observations...")
        execute_values(cur, """
            INSERT INTO public.vitals (id, patient_id, type, value, unit, recorded_at)
            VALUES %s
        """, vitals_inserts)

        print(f"Inserting {len(labs_inserts)} lab results...")
        execute_values(cur, """
            INSERT INTO public.lab_results (id, patient_id, test_name, value, unit, recorded_at)
            VALUES %s
        """, labs_inserts)

        if meds_inserts:
            print(f"Inserting {len(meds_inserts)} medication records...")
            execute_values(cur, """
                INSERT INTO public.medications (id, patient_id, name, dosage, start_date, adherence_score)
                VALUES %s
            """, meds_inserts)

        if diag_inserts:
            print(f"Inserting {len(diag_inserts)} patient diagnoses...")
            execute_values(cur, """
                INSERT INTO public.diagnoses (id, patient_id, condition, diagnosed_at, source)
                VALUES %s
            """, diag_inserts)

        print("Assigning doctor to patients...")
        execute_values(cur, """
            INSERT INTO public.doctor_patient_assignments (doctor_id, patient_id, hospital_id)
            VALUES %s ON CONFLICT DO NOTHING
        """, doctor_assigns)

        conn.commit()
        print("Database seeding completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
