-- =============================================================================
-- DOCTOR SEED SCRIPT — RUN THIS IN THE SUPABASE SQL EDITOR (NOT via CLI migrations)
-- This inserts 15 doctors into auth.users (which triggers the handle_new_user
-- function to auto-create their public.profiles rows).
-- =============================================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
)
VALUES
  ('10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000000','fatima.ahmed@medisight.ai',crypt('TempPass1!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Fatima Ahmed","role":"doctor","department":"Cardiology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000000','hassan.khan@medisight.ai',crypt('TempPass2!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Hassan Khan","role":"doctor","department":"Endocrinology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000023','00000000-0000-0000-0000-000000000000','amira.malik@medisight.ai',crypt('TempPass3!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Amira Malik","role":"doctor","department":"Nephrology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000024','00000000-0000-0000-0000-000000000000','ali.hussain@medisight.ai',crypt('TempPass4!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Ali Hussain","role":"doctor","department":"Internal Medicine"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000025','00000000-0000-0000-0000-000000000000','zainab.ali@medisight.ai',crypt('TempPass5!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Zainab Ali","role":"doctor","department":"Pulmonology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000026','00000000-0000-0000-0000-000000000000','muhammad.hassan@medisight.ai',crypt('TempPass6!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Muhammad Hassan","role":"doctor","department":"Oncology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000027','00000000-0000-0000-0000-000000000000','hira.nasir@medisight.ai',crypt('TempPass7!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Hira Nasir","role":"doctor","department":"Neurology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000028','00000000-0000-0000-0000-000000000000','tariq.hussain@medisight.ai',crypt('TempPass8!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Tariq Hussain","role":"doctor","department":"Endocrinology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000029','00000000-0000-0000-0000-000000000000','nadia.khan@medisight.ai',crypt('TempPass9!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Nadia Khan","role":"doctor","department":"Cardiology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000000','faisal.ahmed@medisight.ai',crypt('TempPass10!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Faisal Ahmed","role":"doctor","department":"Radiology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000000','iqra.malik@medisight.ai',crypt('TempPass11!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Iqra Malik","role":"doctor","department":"Pathology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000000','usman.raza@medisight.ai',crypt('TempPass12!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Usman Raza","role":"doctor","department":"Emergency Medicine"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000033','00000000-0000-0000-0000-000000000000','saira.khan@medisight.ai',crypt('TempPass13!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Saira Khan","role":"doctor","department":"Nephrology"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000034','00000000-0000-0000-0000-000000000000','bilal.hassan@medisight.ai',crypt('TempPass14!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Bilal Hassan","role":"doctor","department":"Geriatrics"}'::jsonb,now(),now(),'authenticated','authenticated'),
  ('10000000-0000-0000-0000-000000000035','00000000-0000-0000-0000-000000000000','ayesha.malik@medisight.ai',crypt('TempPass15!', gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Dr. Ayesha Malik","role":"doctor","department":"Primary Care"}'::jsonb,now(),now(),'authenticated','authenticated')
ON CONFLICT (id) DO NOTHING;

-- Assign all newly seeded doctors to the first hospital
UPDATE public.profiles
SET hospital_id = (SELECT id FROM public.hospitals LIMIT 1)
WHERE id IN (
  '10000000-0000-0000-0000-000000000021',
  '10000000-0000-0000-0000-000000000022',
  '10000000-0000-0000-0000-000000000023',
  '10000000-0000-0000-0000-000000000024',
  '10000000-0000-0000-0000-000000000025',
  '10000000-0000-0000-0000-000000000026',
  '10000000-0000-0000-0000-000000000027',
  '10000000-0000-0000-0000-000000000028',
  '10000000-0000-0000-0000-000000000029',
  '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000031',
  '10000000-0000-0000-0000-000000000032',
  '10000000-0000-0000-0000-000000000033',
  '10000000-0000-0000-0000-000000000034',
  '10000000-0000-0000-0000-000000000035'
)
AND hospital_id IS NULL;
