-- ============================================================
-- 20260729230000_pakistan_names_and_doctor_status.sql
-- 1. Rename patients/doctors to Pakistani names
-- 2. Set varied doctor availability statuses
-- 3. Add hospital landline numbers & default avatars
-- ============================================================

-- ---------------------------------------------------------------
-- 1. UPDATE PATIENT DEMOGRAPHICS with Pakistani names
-- ---------------------------------------------------------------
DO $$
DECLARE
  pak_first_male   text[] := ARRAY['Ahmed','Muhammad','Bilal','Usman','Faisal','Hamza','Tariq','Imran','Zain','Shahid','Adeel','Kamran','Junaid','Waseem','Naeem'];
  pak_first_female text[] := ARRAY['Ayesha','Fatima','Zara','Sana','Hina','Nadia','Amna','Maryam','Kiran','Saima','Rabia','Noor','Sobia','Sumera','Aisha'];
  pak_last         text[] := ARRAY['Khan','Ahmed','Ali','Sheikh','Malik','Butt','Chaudhry','Qureshi','Akhtar','Hussain','Raza','Mirza','Abbasi','Siddiqui','Ansari'];
  rec              RECORD;
  fname            text;
  lname            text;
  gender_val       text;
BEGIN
  FOR rec IN SELECT id, demographics FROM public.patients LOOP
    gender_val := rec.demographics->>'gender';
    lname := pak_last[1 + (floor(random()*15))::int];
    IF gender_val = 'Female' THEN
      fname := pak_first_female[1 + (floor(random()*15))::int];
    ELSE
      fname := pak_first_male[1 + (floor(random()*15))::int];
    END IF;

    UPDATE public.patients
    SET demographics = demographics
      || jsonb_build_object('first_name', fname, 'last_name', lname)
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 2. UPDATE DOCTOR PROFILES with Pakistani names
-- ---------------------------------------------------------------
DO $$
DECLARE
  pak_first_male   text[] := ARRAY['Ahmed','Muhammad','Bilal','Usman','Faisal','Hamza','Tariq','Imran','Zain','Shahid','Adeel','Kamran','Junaid','Waseem','Naeem'];
  pak_first_female text[] := ARRAY['Ayesha','Fatima','Zara','Sana','Hina','Nadia','Amna','Maryam','Kiran','Saima','Rabia','Noor','Sobia','Sumera','Aisha'];
  pak_last         text[] := ARRAY['Khan','Ahmed','Ali','Sheikh','Malik','Butt','Chaudhry','Qureshi','Akhtar','Hussain','Raza','Mirza','Abbasi','Siddiqui','Ansari'];
  rec              RECORD;
  fname            text;
  lname            text;
  rnd              int;
BEGIN
  rnd := 0;
  FOR rec IN SELECT id FROM public.profiles WHERE role = 'doctor' LOOP
    rnd := rnd + 1;
    IF rnd % 3 = 0 THEN
      fname := pak_first_female[1 + (floor(random()*15))::int];
    ELSE
      fname := pak_first_male[1 + (floor(random()*15))::int];
    END IF;
    lname := pak_last[1 + (floor(random()*15))::int];

    UPDATE public.profiles
    SET first_name = fname,
        last_name  = lname,
        full_name  = fname || ' ' || lname
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 3. SET VARIED AVAILABILITY STATUSES for doctors
--    Roughly: 50% available, 25% on leave, 25% busy
-- ---------------------------------------------------------------
UPDATE public.profiles SET availability_status = 'available'
WHERE role = 'doctor' AND id IN (
  SELECT id FROM public.profiles WHERE role = 'doctor' ORDER BY id LIMIT (
    SELECT (count(*) * 0.5)::int FROM public.profiles WHERE role = 'doctor'
  )
);

UPDATE public.profiles SET availability_status = 'on_leave'
WHERE role = 'doctor' AND id IN (
  SELECT id FROM public.profiles WHERE role = 'doctor' AND (availability_status IS NULL OR availability_status = 'available')
  ORDER BY id DESC LIMIT (
    SELECT (count(*) * 0.25)::int FROM public.profiles WHERE role = 'doctor'
  )
);

UPDATE public.profiles SET availability_status = 'busy'
WHERE role = 'doctor' AND (availability_status IS NULL OR availability_status = '');

-- ---------------------------------------------------------------
-- 4. ADD OFFICIAL HOSPITAL LANDLINE NUMBERS (not personal)
-- ---------------------------------------------------------------
UPDATE public.profiles SET
  contact_number = CASE floor(random()*5)::int
    WHEN 0 THEN '+92-21-3568-' || lpad((floor(random()*9000+1000))::text, 4, '0')
    WHEN 1 THEN '+92-42-3577-' || lpad((floor(random()*9000+1000))::text, 4, '0')
    WHEN 2 THEN '+92-51-2870-' || lpad((floor(random()*9000+1000))::text, 4, '0')
    WHEN 3 THEN '+92-91-9213-' || lpad((floor(random()*9000+1000))::text, 4, '0')
    ELSE        '+92-61-4510-' || lpad((floor(random()*9000+1000))::text, 4, '0')
  END
WHERE role = 'doctor';

-- ---------------------------------------------------------------
-- 5. SET DEFAULT AVATAR URLs for doctors (generic placeholders)
--    Male: ui-avatars with blue, Female: with pink
--    These will be overridden when doctor uploads their own.
-- ---------------------------------------------------------------
UPDATE public.profiles SET
  avatar_url = CASE
    WHEN first_name IN ('Ayesha','Fatima','Zara','Sana','Hina','Nadia','Amna','Maryam','Kiran','Saima','Rabia','Noor','Sobia','Sumera','Aisha')
    THEN 'https://ui-avatars.com/api/?name=' || first_name || '+' || last_name || '&background=be185d&color=fff&size=128&rounded=true'
    ELSE 'https://ui-avatars.com/api/?name=' || first_name || '+' || last_name || '&background=1d4ed8&color=fff&size=128&rounded=true'
  END
WHERE role = 'doctor' AND (avatar_url IS NULL OR avatar_url = '');

-- ---------------------------------------------------------------
-- 6. SEED CRITICAL RISK ALERTS so the Alert Center shows them
-- ---------------------------------------------------------------
INSERT INTO public.alerts (patient_id, type, severity, status)
SELECT
  p.id,
  CASE pr.disease
    WHEN 'Diabetes'       THEN 'Critical Diabetes Risk Detected'
    WHEN 'Heart Disease'  THEN 'Critical Cardiac Risk Detected'
    ELSE                       'Critical Risk Escalation'
  END,
  'Critical'::public.severity_level,
  'New'
FROM public.predictions pr
JOIN public.patients p ON p.id = pr.patient_id
WHERE pr.severity = 'Critical'
  AND NOT EXISTS (
    SELECT 1 FROM public.alerts a
    WHERE a.patient_id = p.id AND a.severity = 'Critical' AND a.status = 'New'
  )
LIMIT 10;

-- Also ensure High risk patients have alerts
INSERT INTO public.alerts (patient_id, type, severity, status)
SELECT
  p.id,
  CASE pr.disease
    WHEN 'Diabetes'       THEN 'High Diabetes Risk Alert'
    WHEN 'Heart Disease'  THEN 'High Cardiac Risk Alert'
    ELSE                       'High Risk Alert'
  END,
  'High'::public.severity_level,
  'New'
FROM public.predictions pr
JOIN public.patients p ON p.id = pr.patient_id
WHERE pr.severity = 'High'
  AND NOT EXISTS (
    SELECT 1 FROM public.alerts a
    WHERE a.patient_id = p.id AND a.severity = 'High' AND a.status = 'New'
  )
LIMIT 10;
