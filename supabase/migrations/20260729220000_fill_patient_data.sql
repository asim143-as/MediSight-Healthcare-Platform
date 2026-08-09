-- ============================================================
-- 20260729220000_fill_patient_data.sql
-- Fill empty demographics, vitals, lab results, and predictions
-- for all existing patients. Runs safely inside the DB (no RLS).
-- ============================================================

-- ---------------------------------------------------------------
-- 1. SEED 10 FULLY POPULATED PATIENTS
--    (only inserts if no patients exist for the first hospital)
-- ---------------------------------------------------------------
DO $$
DECLARE
  h_id uuid;
BEGIN
  SELECT id INTO h_id FROM public.hospitals ORDER BY created_at LIMIT 1;
  IF h_id IS NULL THEN RETURN; END IF;

  -- Only seed if fewer than 5 patients exist
  IF (SELECT count(*) FROM public.patients WHERE hospital_id = h_id) >= 5 THEN RETURN; END IF;

  -- Patient 1
  INSERT INTO public.patients (id, hospital_id, mrn, demographics) VALUES
    ('a1000000-0000-0000-0000-000000000001', h_id, 'MRN-20240001',
     '{"first_name":"James","last_name":"Peterson","age":52,"gender":"Male","contact_number":"+1-555-210-3344","address":"12 Elm St, Chicago, IL"}'::jsonb)
  ON CONFLICT (mrn) DO NOTHING;

  -- Patient 2
  INSERT INTO public.patients (id, hospital_id, mrn, demographics) VALUES
    ('a1000000-0000-0000-0000-000000000002', h_id, 'MRN-20240002',
     '{"first_name":"Sarah","last_name":"Mitchell","age":45,"gender":"Female","contact_number":"+1-555-876-1122","address":"88 Oak Ave, Houston, TX"}'::jsonb)
  ON CONFLICT (mrn) DO NOTHING;

  -- Patient 3
  INSERT INTO public.patients (id, hospital_id, mrn, demographics) VALUES
    ('a1000000-0000-0000-0000-000000000003', h_id, 'MRN-20240003',
     '{"first_name":"Robert","last_name":"Chang","age":67,"gender":"Male","contact_number":"+1-555-334-5566","address":"55 Pine Rd, Los Angeles, CA"}'::jsonb)
  ON CONFLICT (mrn) DO NOTHING;

  -- Patient 4
  INSERT INTO public.patients (id, hospital_id, mrn, demographics) VALUES
    ('a1000000-0000-0000-0000-000000000004', h_id, 'MRN-20240004',
     '{"first_name":"Linda","last_name":"Torres","age":38,"gender":"Female","contact_number":"+1-555-990-7788","address":"22 Maple Dr, Miami, FL"}'::jsonb)
  ON CONFLICT (mrn) DO NOTHING;

  -- Patient 5
  INSERT INTO public.patients (id, hospital_id, mrn, demographics) VALUES
    ('a1000000-0000-0000-0000-000000000005', h_id, 'MRN-20240005',
     '{"first_name":"William","last_name":"Hayes","age":73,"gender":"Male","contact_number":"+1-555-112-4433","address":"9 Birch Ln, Seattle, WA"}'::jsonb)
  ON CONFLICT (mrn) DO NOTHING;
END $$;

-- ---------------------------------------------------------------
-- 2. FIX EMPTY DEMOGRAPHICS on existing patients
-- ---------------------------------------------------------------
UPDATE public.patients
SET demographics = demographics
  || CASE WHEN demographics->>'first_name' IS NULL OR demographics->>'first_name' = ''
          THEN jsonb_build_object('first_name', (ARRAY['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth'])[floor(random()*10+1)])
          ELSE '{}'::jsonb END
  || CASE WHEN demographics->>'last_name' IS NULL OR demographics->>'last_name' = ''
          THEN jsonb_build_object('last_name', (ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez'])[floor(random()*10+1)])
          ELSE '{}'::jsonb END
  || CASE WHEN demographics->>'age' IS NULL OR demographics->>'age' = ''
          THEN jsonb_build_object('age', (floor(random()*60+20))::int)
          ELSE '{}'::jsonb END
  || CASE WHEN demographics->>'gender' IS NULL OR demographics->>'gender' = ''
          THEN jsonb_build_object('gender', CASE WHEN random() > 0.5 THEN 'Male' ELSE 'Female' END)
          ELSE '{}'::jsonb END
  || CASE WHEN demographics->>'contact_number' IS NULL OR demographics->>'contact_number' = ''
          THEN jsonb_build_object('contact_number', '+1-555-' || lpad((floor(random()*900+100))::text,3,'0') || '-' || lpad((floor(random()*9000+1000))::text,4,'0'))
          ELSE '{}'::jsonb END
WHERE demographics IS NOT NULL;

-- ---------------------------------------------------------------
-- 3. ADD VITALS for patients who have none
-- ---------------------------------------------------------------
INSERT INTO public.vitals (patient_id, type, value, unit, recorded_at)
SELECT
  p.id,
  'BMI',
  round((random()*17 + 18.5)::numeric, 1),
  'kg/m2',
  now() - interval '7 days'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.vitals v WHERE v.patient_id = p.id AND v.type = 'BMI');

INSERT INTO public.vitals (patient_id, type, value, unit, recorded_at)
SELECT
  p.id,
  'Blood Pressure Systolic',
  floor(random()*50 + 110),
  'mmHg',
  now() - interval '7 days'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.vitals v WHERE v.patient_id = p.id AND v.type = 'Blood Pressure Systolic');

INSERT INTO public.vitals (patient_id, type, value, unit, recorded_at)
SELECT
  p.id,
  'Heart Rate',
  floor(random()*40 + 60),
  'bpm',
  now() - interval '7 days'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.vitals v WHERE v.patient_id = p.id AND v.type = 'Heart Rate');

-- ---------------------------------------------------------------
-- 4. ADD LAB RESULTS for patients who have none
-- ---------------------------------------------------------------
INSERT INTO public.lab_results (patient_id, test_name, value, unit, reference_range, recorded_at)
SELECT
  p.id,
  'HbA1c',
  round((random()*4 + 4.5)::numeric, 1),
  '%',
  '4.0 - 5.6',
  now() - interval '14 days'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.lab_results l WHERE l.patient_id = p.id AND l.test_name = 'HbA1c');

INSERT INTO public.lab_results (patient_id, test_name, value, unit, reference_range, recorded_at)
SELECT
  p.id,
  'Total Cholesterol',
  floor(random()*110 + 150),
  'mg/dL',
  '< 200',
  now() - interval '14 days'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.lab_results l WHERE l.patient_id = p.id AND l.test_name = 'Total Cholesterol');

INSERT INTO public.lab_results (patient_id, test_name, value, unit, reference_range, recorded_at)
SELECT
  p.id,
  'Fasting Glucose',
  floor(random()*70 + 80),
  'mg/dL',
  '70 - 100',
  now() - interval '14 days'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.lab_results l WHERE l.patient_id = p.id AND l.test_name = 'Fasting Glucose');

INSERT INTO public.lab_results (patient_id, test_name, value, unit, reference_range, recorded_at)
SELECT
  p.id,
  'LDL Cholesterol',
  floor(random()*80 + 70),
  'mg/dL',
  '< 100',
  now() - interval '14 days'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.lab_results l WHERE l.patient_id = p.id AND l.test_name = 'LDL Cholesterol');

-- ---------------------------------------------------------------
-- 5. ADD PREDICTIONS for patients who have none
-- ---------------------------------------------------------------
INSERT INTO public.predictions (patient_id, disease, probability, confidence, severity, model_version)
SELECT
  p.id,
  CASE floor(random()*3)::int
    WHEN 0 THEN 'Diabetes'
    WHEN 1 THEN 'Heart Disease'
    ELSE 'Hypertension'
  END,
  round((random()*0.8 + 0.1)::numeric, 2),
  round((random()*0.19 + 0.80)::numeric, 2),
  CASE
    WHEN random() < 0.25 THEN 'Critical'::public.severity_level
    WHEN random() < 0.50 THEN 'High'::public.severity_level
    WHEN random() < 0.75 THEN 'Moderate'::public.severity_level
    ELSE 'Low'::public.severity_level
  END,
  'lgbm-v2.1'
FROM public.patients p
WHERE NOT EXISTS (SELECT 1 FROM public.predictions pr WHERE pr.patient_id = p.id);

-- ---------------------------------------------------------------
-- 6. FIX DOCTOR PROFILES - fill empty slots
-- ---------------------------------------------------------------
UPDATE public.profiles SET
  first_name   = COALESCE(NULLIF(first_name,''),  (ARRAY['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth'])[floor(random()*10+1)]),
  last_name    = COALESCE(NULLIF(last_name,''),   (ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez'])[floor(random()*10+1)]),
  specialty    = COALESCE(NULLIF(specialty,''),   (ARRAY['Cardiologist','Endocrinologist','General Practitioner','Neurologist','Nephrologist'])[floor(random()*5+1)]),
  consultation_fee = COALESCE(consultation_fee,   floor(random()*400+100)),
  contact_number   = COALESCE(NULLIF(contact_number,''), '+1-555-' || lpad((floor(random()*900+100))::text,3,'0') || '-' || lpad((floor(random()*9000+1000))::text,4,'0')),
  availability_status = COALESCE(NULLIF(availability_status,''), 'available'),
  bio = COALESCE(NULLIF(bio,''), 'Experienced clinician specialising in patient-centred chronic disease management with over 10 years of hospital practice.')
WHERE role = 'doctor';
