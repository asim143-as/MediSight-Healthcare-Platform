-- =====================================================================================
-- GATEWAY ISOLATION CHECK  (manual test, plain SQL)
--
-- Proves, against the REAL database rules, that:
--   * a patient can read only their own data and never another patient's;
--   * a doctor / hospital admin sees only their own hospital's patients;
--   * clinicians cannot sign decisions as someone else or move data across hospitals;
--   * audit rows cannot be edited, and the reports bucket is private.
--
-- HOW TO RUN
--   1. Use a TEST Supabase project with ALL migrations applied (including
--      20261125120000_backend_gateway_schema.sql).
--   2. Supabase Dashboard > SQL Editor > New query > paste this WHOLE file > Run.
--   3. Read the result table: every row should say PASS (first row = summary).
--
-- SAFETY
--   All test users and data are created inside a sub-transaction that is ALWAYS rolled
--   back, so nothing is left in your database. The only object created is a temporary
--   function that disappears when the session ends. Do not edit the rollback at the end.
--   Fixture predictions use severity 'High' on purpose: 'Critical' would queue an
--   outbound alert through pg_net (and would only be discarded by the rollback anyway).
--
-- If you see "TEST HARNESS ERROR", the test could not be set up (for example the
-- auth.users columns differ in your project). That is not a policy result: send the
-- message to whoever maintains the migration.
-- =====================================================================================

create or replace function pg_temp.gateway_isolation_check()
returns table (ord int, result text, check_name text, detail text)
language plpgsql as $fn$
declare
  res jsonb := '[]'::jsonb;
  t text;
  tables text[] := array['vitals','lab_results','medications','diagnoses','predictions',
                         'alerts','reports','doctor_patient_assignments'];
  n1 int; n2 int; ok boolean; msg text;
  tag text := substr(gen_random_uuid()::text, 1, 8);
  v_h1 uuid := gen_random_uuid();  v_h2 uuid := gen_random_uuid();
  v_ua uuid := gen_random_uuid();  v_ub uuid := gen_random_uuid();   -- patient A, patient B (hospital 1)
  v_ln uuid := gen_random_uuid();                                    -- patient login with no record
  v_d1 uuid := gen_random_uuid();  v_d2 uuid := gen_random_uuid();   -- doctor hospital 1, doctor hospital 2
  v_ad uuid := gen_random_uuid();                                    -- hospital admin, hospital 1
  v_pa uuid := gen_random_uuid();  v_pb uuid := gen_random_uuid();  v_pc uuid := gen_random_uuid(); -- patient records A, B (h1), C (h2)
  v_prA uuid := gen_random_uuid(); v_prB uuid := gen_random_uuid(); v_prC uuid := gen_random_uuid(); -- predictions
  v_rA uuid := gen_random_uuid();  v_rB uuid := gen_random_uuid();  v_rC uuid := gen_random_uuid();  -- reports
  v_mA uuid := gen_random_uuid();  v_mB uuid := gen_random_uuid();  v_mC uuid := gen_random_uuid();  -- OCR measurements
begin
  begin  -- ===== sub-transaction: everything inside is rolled back at the end =====

    -- ---------------------------------------------------------------- FIXTURES (as postgres)
    insert into public.hospitals (id, name) values (v_h1, 'ISO Test Hospital 1'), (v_h2, 'ISO Test Hospital 2');

    -- The signup trigger (handle_new_user) turns these into profiles / doctors / patient_profiles.
    insert into auth.users (id, email, raw_user_meta_data) values
      (v_ua, 'iso-pa-'   || tag || '@example.test', jsonb_build_object('role','patient','full_name','Iso Patient A')),
      (v_ub, 'iso-pb-'   || tag || '@example.test', jsonb_build_object('role','patient','full_name','Iso Patient B')),
      (v_ln, 'iso-lone-' || tag || '@example.test', jsonb_build_object('role','patient','full_name','Iso Lone Patient')),
      (v_d1, 'iso-d1-'   || tag || '@example.test', jsonb_build_object('role','doctor','full_name','Iso Doctor 1','hospital_id',v_h1,'license_number','ISO-1')),
      (v_d2, 'iso-d2-'   || tag || '@example.test', jsonb_build_object('role','doctor','full_name','Iso Doctor 2','hospital_id',v_h2,'license_number','ISO-2')),
      (v_ad, 'iso-ad-'   || tag || '@example.test', jsonb_build_object('role','hospital_admin','full_name','Iso Admin','hospital_id',v_h1));
    update public.doctors set status = 'approved' where user_id in (v_d1, v_d2);

    insert into public.patients (id, hospital_id, mrn, demographics, user_id) values
      (v_pa, v_h1, 'ISO-A-' || tag, '{"first_name":"A"}', v_ua),
      (v_pb, v_h1, 'ISO-B-' || tag, '{"first_name":"B"}', v_ub),
      (v_pc, v_h2, 'ISO-C-' || tag, '{"first_name":"C"}', null);

    insert into public.vitals (patient_id, type, value, unit, recorded_at)
      select pid, 'heart_rate', 70, 'bpm', now() from unnest(array[v_pa, v_pb, v_pc]) as p(pid);
    insert into public.lab_results (patient_id, test_name, value, unit, recorded_at)
      select pid, 'HbA1c', 6.5, '%', now() from unnest(array[v_pa, v_pb, v_pc]) as p(pid);
    insert into public.medications (patient_id, name, dosage, start_date)
      select pid, 'IsoMed', '5mg', current_date from unnest(array[v_pa, v_pb, v_pc]) as p(pid);
    insert into public.diagnoses (patient_id, condition, diagnosed_at)
      select pid, 'IsoCondition', current_date from unnest(array[v_pa, v_pb, v_pc]) as p(pid);
    insert into public.alerts (patient_id, type, severity)
      select pid, 'IsoAlert', 'High' from unnest(array[v_pa, v_pb, v_pc]) as p(pid);
    insert into public.doctor_patient_assignments (doctor_id, patient_id, hospital_id) values
      (v_d1, v_pa, v_h1), (v_d1, v_pb, v_h1), (v_d2, v_pc, v_h2);

    insert into public.predictions (id, patient_id, disease, probability, confidence, severity, model_version) values
      (v_prA, v_pa, 'Diabetes', 0.8, 0.8, 'High', 'iso'),
      (v_prB, v_pb, 'Diabetes', 0.8, 0.8, 'High', 'iso'),
      (v_prC, v_pc, 'Diabetes', 0.8, 0.8, 'High', 'iso');
    insert into public.explanations (prediction_id, shap_payload, clinical_explanation)
      select x, '{}'::jsonb, 'iso' from unnest(array[v_prA, v_prB, v_prC]) as p(x);
    insert into public.prediction_evidence (prediction_id, document, excerpt)
      select x, 'iso.pdf', 'iso' from unnest(array[v_prA, v_prB, v_prC]) as p(x);

    insert into public.reports (id, patient_id, uploaded_by, storage_path, original_filename, content_type, size_bytes) values
      (v_rA, v_pa, v_ua, 'iso/' || tag || '/a.pdf', 'a.pdf', 'application/pdf', 100),
      (v_rB, v_pb, v_ub, 'iso/' || tag || '/b.pdf', 'b.pdf', 'application/pdf', 100),
      (v_rC, v_pc, null, 'iso/' || tag || '/c.pdf', 'c.pdf', 'application/pdf', 100);
    insert into public.report_measurements (id, report_id, name, value, unit) values
      (v_mA, v_rA, 'HbA1c', 6.5, '%'), (v_mB, v_rB, 'HbA1c', 6.5, '%'), (v_mC, v_rC, 'HbA1c', 6.5, '%');

    insert into public.api_audit_logs (action, resource_type, patient_id, outcome) values
      ('iso.check', 'patient', v_pa, 'success'), ('iso.check', 'patient', v_pc, 'success');

    -- ------------------------------------------------ DATABASE RULES (as postgres)
    select count(*) into n1 from public.clinical_reviews
      where prediction_id in (v_prA, v_prB, v_prC) and decision = 'pending';
    res := res || jsonb_build_array(jsonb_build_object('t','Every new prediction automatically gets a pending clinical review','p', n1 = 3,'d','pending reviews = ' || n1));

    ok := false; begin update public.api_audit_logs set outcome = 'error' where patient_id = v_pa; exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Audit rows (api_audit_logs) cannot be edited','p', ok,'d',''));
    ok := false; begin delete from public.api_audit_logs where patient_id = v_pa; exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Audit rows (api_audit_logs) cannot be deleted','p', ok,'d',''));

    select count(*) into n1 from storage.buckets where id = 'reports' and public = false;
    res := res || jsonb_build_array(jsonb_build_object('t','The reports storage bucket exists and is private','p', n1 = 1,'d','private reports buckets = ' || n1));

    ok := false; begin
      insert into public.reports (patient_id, storage_path, original_filename, content_type, size_bytes)
      values (v_pa, 'iso/' || tag || '/big.pdf', 'big.pdf', 'application/pdf', 20000000);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','A report larger than 10 MB is rejected by the database','p', ok,'d',''));
    ok := false; begin
      insert into public.reports (patient_id, storage_path, original_filename, content_type, size_bytes)
      values (v_pa, 'iso/' || tag || '/x.html', 'x.html', 'text/html', 100);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','A report that is not PDF/PNG/JPEG is rejected by the database','p', ok,'d',''));

    ok := false; begin
      update public.clinical_reviews set decision = 'overridden', reviewer_id = v_d1, reviewed_at = now(),
             override_severity = 'Low' where prediction_id = v_prB;      -- no written notes
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Overriding a prediction without written notes is rejected','p', ok,'d',''));

    ok := false; begin
      update public.report_measurements set status = 'verified' where id = v_mB;   -- no reviewer
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Verifying an OCR value without naming a reviewer is rejected','p', ok,'d',''));

    ok := false; begin update public.patients set user_id = v_ua where id = v_pc;   -- A is already linked to another record
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','One login cannot be linked to two patient records','p', ok,'d',''));

    -- ------------------------------------------------ PATIENT A  (hospital-less patient login)
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_ua, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ua::text, true);
    execute 'set local role authenticated';

    res := res || jsonb_build_array(jsonb_build_object('t','Fixture sanity: patient A has role patient','p', public.get_my_role()::text = 'patient','d', coalesce(public.get_my_role()::text,'null')));

    select count(*) into n1 from public.patients where id = v_pa;
    select count(*) into n2 from public.patients where id in (v_pb, v_pc);
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A can read own patient record, and nobody else''s','p', n1 = 1 and n2 = 0,'d','own=' || n1 || ' others=' || n2));

    foreach t in array array['vitals','lab_results','predictions','reports'] loop
      execute format('select count(*) from public.%I where patient_id = $1', t) into n1 using v_pa;
      res := res || jsonb_build_array(jsonb_build_object('t','Patient A can read own ' || t,'p', n1 >= 1,'d','rows=' || n1));
    end loop;
    foreach t in array tables loop
      execute format('select count(*) from public.%I where patient_id in ($1, $2)', t) into n2 using v_pb, v_pc;
      res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot read other patients'' ' || t,'p', n2 = 0,'d','leaked rows=' || n2));
    end loop;

    select count(*) into n1 from public.explanations where prediction_id = v_prA;
    select count(*) into n2 from public.explanations where prediction_id in (v_prB, v_prC);
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A sees own explanations only','p', n1 = 1 and n2 = 0,'d','own=' || n1 || ' others=' || n2));
    select count(*) into n1 from public.prediction_evidence where prediction_id = v_prA;
    select count(*) into n2 from public.prediction_evidence where prediction_id in (v_prB, v_prC);
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A sees own prediction evidence only','p', n1 = 1 and n2 = 0,'d','own=' || n1 || ' others=' || n2));
    select count(*) into n1 from public.report_measurements where report_id = v_rA;
    select count(*) into n2 from public.report_measurements where report_id in (v_rB, v_rC);
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A sees own extracted report values only','p', n1 = 1 and n2 = 0,'d','own=' || n1 || ' others=' || n2));
    select count(*) into n1 from public.clinical_reviews where prediction_id in (v_prA, v_prB, v_prC);
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot read clinician reviews (private notes)','p', n1 = 0,'d','rows=' || n1));
    select count(*) into n1 from public.api_audit_logs where patient_id in (v_pa, v_pc);
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot read the audit trail','p', n1 = 0,'d','rows=' || n1));

    ok := false; begin
      insert into public.predictions (patient_id, disease, probability, confidence, severity, model_version)
      values (v_pa, 'Diabetes', 0.5, 0.5, 'Moderate', 'iso'); get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot create predictions','p', ok,'d',''));

    ok := false; begin
      insert into public.reports (patient_id, uploaded_by, storage_path, original_filename, content_type, size_bytes)
      values (v_pb, v_ua, 'iso/' || tag || '/into-b.pdf', 'x.pdf', 'application/pdf', 100); get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot upload a report into patient B''s chart','p', ok,'d',''));

    ok := false; msg := '';
    begin
      insert into public.reports (patient_id, uploaded_by, storage_path, original_filename, content_type, size_bytes)
      values (v_pa, v_ua, 'iso/' || tag || '/self.pdf', 'self.pdf', 'application/pdf', 100); ok := true;
    exception when others then msg := sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A CAN upload a report into own chart','p', ok,'d', msg));

    ok := false; begin update public.patients set mrn = 'HACKED' where id = v_pa; get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot edit own clinical record','p', ok,'d',''));

    ok := false; begin update public.patients set user_id = v_ua where id = v_pb; get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot link themselves to patient B''s record','p', ok,'d',''));

    ok := false; begin update public.profiles set role = 'doctor' where id = v_ua; get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot promote themselves to doctor','p', ok,'d',''));

    ok := false; begin
      update public.report_measurements set status = 'verified', verified_by = v_ua, verified_at = now() where id = v_mA;
      get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Patient A cannot verify OCR values (clinicians only)','p', ok,'d',''));

    -- ------------------------------------------------ PATIENT B
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_ub, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ub::text, true);
    execute 'set local role authenticated';

    select count(*) into n1 from public.patients where id = v_pb;
    select count(*) into n2 from public.patients where id in (v_pa, v_pc);
    res := res || jsonb_build_array(jsonb_build_object('t','Patient B can read own record, and not patient A''s','p', n1 = 1 and n2 = 0,'d','own=' || n1 || ' others=' || n2));
    foreach t in array tables loop
      execute format('select count(*) from public.%I where patient_id in ($1, $2)', t) into n2 using v_pa, v_pc;
      res := res || jsonb_build_array(jsonb_build_object('t','Patient B cannot read other patients'' ' || t,'p', n2 = 0,'d','leaked rows=' || n2));
    end loop;

    -- ------------------------------------------------ PATIENT A AGAIN: the "hospital trick"
    -- A patient may edit their own profile, and the onboarding page saves hospital_id for every role.
    -- Before migration Part 7, setting a hospital here exposed EVERY patient of that hospital.
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_ua, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ua::text, true);
    execute 'set local role authenticated';
    begin update public.profiles set hospital_id = v_h1 where id = v_ua; exception when others then null; end;

    select count(*) into n1 from public.profiles where id = v_ua and hospital_id = v_h1;
    res := res || jsonb_build_array(jsonb_build_object('t','Hospital trick set-up: patient A now has hospital 1 on their profile (informational)','p', true,'d','hospital set=' || n1));
    select count(*) into n2 from public.patients where id in (v_pb, v_pc);
    res := res || jsonb_build_array(jsonb_build_object('t','HOSPITAL TRICK: patient A (hospital set) still cannot read other patient records','p', n2 = 0,'d','leaked rows=' || n2));
    foreach t in array tables loop
      execute format('select count(*) from public.%I where patient_id in ($1, $2)', t) into n2 using v_pb, v_pc;
      res := res || jsonb_build_array(jsonb_build_object('t','HOSPITAL TRICK: patient A (hospital set) cannot read other patients'' ' || t,'p', n2 = 0,'d','leaked rows=' || n2));
    end loop;
    select count(*) into n2 from public.explanations where prediction_id in (v_prB, v_prC);
    res := res || jsonb_build_array(jsonb_build_object('t','HOSPITAL TRICK: patient A (hospital set) cannot read other patients'' explanations','p', n2 = 0,'d','leaked rows=' || n2));
    select count(*) into n2 from public.clinical_reviews where prediction_id in (v_prB, v_prC);
    res := res || jsonb_build_array(jsonb_build_object('t','HOSPITAL TRICK: patient A (hospital set) cannot read clinician reviews','p', n2 = 0,'d','leaked rows=' || n2));
    select count(*) into n2 from public.prediction_evidence where prediction_id in (v_prB, v_prC);
    res := res || jsonb_build_array(jsonb_build_object('t','HOSPITAL TRICK: patient A (hospital set) cannot read other patients'' evidence','p', n2 = 0,'d','leaked rows=' || n2));

    -- ------------------------------------------------ LONE PATIENT (login, no linked record)
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_ln, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ln::text, true);
    execute 'set local role authenticated';
    select count(*) into n1 from public.patients where id in (v_pa, v_pb, v_pc);
    select count(*) into n2 from public.predictions where patient_id in (v_pa, v_pb, v_pc);
    res := res || jsonb_build_array(jsonb_build_object('t','A patient login with no linked record sees no patient data','p', n1 = 0 and n2 = 0,'d','patients=' || n1 || ' predictions=' || n2));

    -- ------------------------------------------------ DOCTOR 1  (hospital 1, approved)
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_d1, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_d1::text, true);
    execute 'set local role authenticated';

    res := res || jsonb_build_array(jsonb_build_object('t','Fixture sanity: doctor 1 has role doctor in hospital 1','p', public.get_my_role()::text = 'doctor' and public.get_my_hospital_id() = v_h1,'d', coalesce(public.get_my_role()::text,'null')));

    select count(*) into n1 from public.patients where id in (v_pa, v_pb);
    select count(*) into n2 from public.patients where id = v_pc;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 sees patients of hospital 1, not hospital 2','p', n1 = 2 and n2 = 0,'d','own hospital=' || n1 || ' other hospital=' || n2));
    select count(*) into n1 from public.predictions where id in (v_prA, v_prB);
    select count(*) into n2 from public.predictions where id = v_prC;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 reads predictions of hospital 1 only','p', n1 = 2 and n2 = 0,'d','own=' || n1 || ' other=' || n2));
    select count(*) into n1 from public.reports where id in (v_rA, v_rB);
    select count(*) into n2 from public.reports where id = v_rC;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 reads reports of hospital 1 only','p', n1 = 2 and n2 = 0,'d','own=' || n1 || ' other=' || n2));
    select count(*) into n1 from public.api_audit_logs where patient_id in (v_pa, v_pc);
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 cannot read the audit trail','p', n1 = 0,'d','rows=' || n1));

    ok := false; msg := '';
    begin
      insert into public.predictions (patient_id, disease, probability, confidence, severity, model_version)
      values (v_pa, 'Diabetes', 0.5, 0.5, 'Moderate', 'iso'); ok := true;
    exception when others then msg := sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 CAN create a prediction for a hospital 1 patient','p', ok,'d', msg));
    ok := false; begin
      insert into public.predictions (patient_id, disease, probability, confidence, severity, model_version)
      values (v_pc, 'Diabetes', 0.5, 0.5, 'Moderate', 'iso'); get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 cannot create a prediction for a hospital 2 patient','p', ok,'d',''));

    ok := false; msg := '';
    begin
      update public.clinical_reviews set decision = 'accepted', reviewer_id = v_d1, reviewed_at = now() where prediction_id = v_prA;
      get diagnostics n1 = row_count; ok := (n1 = 1);
    exception when others then msg := sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 CAN review a hospital 1 prediction','p', ok,'d', msg));
    ok := false; begin
      update public.clinical_reviews set decision = 'accepted', reviewer_id = v_d1, reviewed_at = now() where prediction_id = v_prC;
      get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 cannot review a hospital 2 prediction','p', ok,'d',''));
    ok := false; begin
      update public.clinical_reviews set decision = 'accepted', reviewer_id = v_d2, reviewed_at = now() where prediction_id = v_prB;
      get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 cannot sign a review as another doctor','p', ok,'d',''));

    ok := false; msg := '';
    begin
      update public.report_measurements set status = 'verified', verified_by = v_d1, verified_at = now() where id = v_mA;
      get diagnostics n1 = row_count; ok := (n1 = 1);
    exception when others then msg := sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 CAN verify an OCR value in hospital 1','p', ok,'d', msg));
    ok := false; begin
      update public.report_measurements set status = 'verified', verified_by = v_d1, verified_at = now() where id = v_mC;
      get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 cannot verify an OCR value in hospital 2','p', ok,'d',''));
    ok := false; begin
      update public.report_measurements set report_id = v_rC where id = v_mB;      -- try to move it to hospital 2
      get diagnostics n1 = row_count; ok := (n1 = 0);
    exception when others then ok := true; end;
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 1 cannot move an OCR value to another hospital''s report','p', ok,'d',''));

    -- ------------------------------------------------ DOCTOR 2  (hospital 2)
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_d2, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_d2::text, true);
    execute 'set local role authenticated';
    select count(*) into n1 from public.patients where id = v_pc;
    select count(*) into n2 from public.patients where id in (v_pa, v_pb);
    res := res || jsonb_build_array(jsonb_build_object('t','Doctor 2 sees hospital 2 patients, not hospital 1','p', n1 = 1 and n2 = 0,'d','own=' || n1 || ' other=' || n2));
    foreach t in array tables loop
      execute format('select count(*) from public.%I where patient_id in ($1, $2)', t) into n2 using v_pa, v_pb;
      res := res || jsonb_build_array(jsonb_build_object('t','Doctor 2 cannot read hospital 1 ' || t,'p', n2 = 0,'d','leaked rows=' || n2));
    end loop;

    -- ------------------------------------------------ HOSPITAL ADMIN (hospital 1)
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_ad, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ad::text, true);
    execute 'set local role authenticated';
    select count(*) into n1 from public.patients where id in (v_pa, v_pb);
    select count(*) into n2 from public.patients where id = v_pc;
    res := res || jsonb_build_array(jsonb_build_object('t','Hospital admin sees own hospital''s patients only','p', n1 = 2 and n2 = 0,'d','own=' || n1 || ' other=' || n2));
    select count(*) into n1 from public.api_audit_logs where patient_id = v_pa;
    select count(*) into n2 from public.api_audit_logs where patient_id = v_pc;
    res := res || jsonb_build_array(jsonb_build_object('t','Hospital admin reads the audit trail of own hospital only','p', n1 = 1 and n2 = 0,'d','own=' || n1 || ' other=' || n2));

    -- ------------------------------------------------ NOT LOGGED IN (anon)
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
    foreach t in array array['patients'] || tables || array['predictions','explanations','report_measurements','clinical_reviews','api_audit_logs'] loop
      ok := false;
      begin
        execute format('select count(*) from public.%I', t) into n1;
        ok := (n1 = 0);
      exception when others then ok := true;     -- "permission denied" is also a pass
      end;
      res := res || jsonb_build_array(jsonb_build_object('t','Not logged in: cannot read ' || t,'p', ok,'d',''));
    end loop;

    -- ------------------------------------------------ ALWAYS ROLL BACK
    execute 'reset role';
    raise exception '__iso_rollback__';
  exception when others then
    if sqlerrm <> '__iso_rollback__' then
      res := res || jsonb_build_array(jsonb_build_object('t','TEST HARNESS ERROR (not a policy result)','p', false,'d', sqlerrm));
    end if;
  end;

  select count(*) filter (where (e->>'p')::boolean), count(*) filter (where not (e->>'p')::boolean)
    into n1, n2 from jsonb_array_elements(res) as x(e);
  return query select 0, (case when n2 = 0 then 'ALL PASSED' else 'FAILURES' end)::text, 'SUMMARY'::text,
                      (n1 || ' passed, ' || n2 || ' failed')::text;
  return query select x.i::int, (case when (x.e->>'p')::boolean then 'PASS' else '*** FAIL ***' end)::text,
                      (x.e->>'t')::text, (x.e->>'d')::text
               from jsonb_array_elements(res) with ordinality as x(e, i);
end
$fn$;

select * from pg_temp.gateway_isolation_check() order by ord;
