-- ============================================================================
-- Backend gateway schema (Member 2).
-- Built one part at a time. Each part is explained in the chat as it is added.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: Link a patient LOGIN (profiles) to a clinical patient RECORD (patients)
--
-- Until now nothing connected the two, so a user with role 'patient' matched
-- none of the RLS policies and could see nothing. We add the link and give
-- patients READ-ONLY access to their own data.
-- ----------------------------------------------------------------------------

-- 1a. The link. Nullable (staff-created records may have no login yet) and
--     unique (one login per patient record, one record per login).
alter table public.patients
  add column if not exists user_id uuid unique
  references public.profiles(id) on delete set null;

-- 1b. Helper: "which patients.id belongs to the logged-in user?" (NULL for staff).
--     security definer = runs past RLS, same reason as get_my_role().
--     set search_path = pins which schema it reads, a standard hardening step.
create or replace function public.get_my_patient_id()
returns uuid as $$
  select id from public.patients where user_id = auth.uid();
$$ language sql security definer stable set search_path = public;

-- 1c. Read-only policies. We only create SELECT policies, so a patient cannot
--     insert, update or delete anything. These are OR-ed with the existing
--     staff policies, so staff access is unchanged.
create policy "Patients: patient read own record" on public.patients
  for select using (user_id = auth.uid());

create policy "Vitals: patient read own" on public.vitals
  for select using (patient_id = public.get_my_patient_id());

create policy "LabResults: patient read own" on public.lab_results
  for select using (patient_id = public.get_my_patient_id());

create policy "Predictions: patient read own" on public.predictions
  for select using (patient_id = public.get_my_patient_id());

create policy "Explanations: patient read own" on public.explanations
  for select using (
    exists (
      select 1 from public.predictions pr
      where pr.id = prediction_id
        and pr.patient_id = public.get_my_patient_id()
    )
  );

-- ----------------------------------------------------------------------------
-- PART 2: reports (metadata for uploaded medical reports)
--
-- The FILE lives in Supabase Storage (private bucket). This TABLE stores
-- information about the file: whose it is, where it is, and how far OCR got.
-- ----------------------------------------------------------------------------

-- 2a. Processing lifecycle as an enum, so no typo like 'procesing' can be saved.
create type public.report_status as enum ('uploaded', 'processing', 'processed', 'failed');

-- 2b. Private bucket. No storage policies are created on purpose: with RLS on
--     and no policy, browsers and normal users are denied. Only the backend
--     (service role) can read/write files and hand out short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- 2c. The table.
create table public.reports (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    uploaded_by uuid references public.profiles(id) on delete set null,
    storage_path text not null unique,
    original_filename text not null,
    content_type text not null check (content_type in ('application/pdf', 'image/png', 'image/jpeg')),
    size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760), -- max 10 MB
    status public.report_status not null default 'uploaded',
    error_message text,
    processed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index reports_patient_id_idx on public.reports (patient_id);

alter table public.reports enable row level security;

-- Reuse the existing triggers: keep updated_at fresh, and audit every change
-- (reports are patient health information, like patients/predictions).
create trigger update_reports_updated_at before update on public.reports
  for each row execute procedure public.update_updated_at_column();
create trigger audit_reports after insert or update or delete on public.reports
  for each row execute procedure public.log_phi_access();

-- 2d. RLS policies.
create policy "Reports: super_admin full access" on public.reports
  for all using (public.get_my_role() = 'super_admin');

create policy "Reports: doctor/hospital_admin manage same hospital" on public.reports
  for all using (
    public.get_my_role() in ('doctor', 'hospital_admin')
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.hospital_id = public.get_my_hospital_id()
    )
  );

create policy "Reports: nurse read same hospital" on public.reports
  for select using (
    public.get_my_role() = 'nurse'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.hospital_id = public.get_my_hospital_id()
    )
  );

create policy "Reports: patient read own" on public.reports
  for select using (patient_id = public.get_my_patient_id());

create policy "Reports: patient upload own" on public.reports
  for insert with check (
    patient_id = public.get_my_patient_id()
    and uploaded_by = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- PART 3: report_measurements (values the OCR pulled out of a report)
--
-- Team rule: OCR values must be checked by a human before reaching the models.
-- Every value starts as 'extracted'. Only a clinician can move it to 'verified'
-- (or 'rejected'). The prediction endpoints will accept ONLY verified values.
-- ----------------------------------------------------------------------------

create type public.measurement_status as enum ('extracted', 'verified', 'rejected');

create table public.report_measurements (
    id uuid primary key default gen_random_uuid(),
    report_id uuid not null references public.reports(id) on delete cascade,
    name text not null,                  -- e.g. 'HbA1c', 'serum_creatinine'
    value numeric not null,
    unit text not null,                  -- e.g. '%', 'mg/dL'
    measured_at timestamptz,             -- date printed on the report, if found
    source_text text,                    -- the raw OCR snippet, so a doctor can compare
    ocr_confidence numeric check (ocr_confidence >= 0 and ocr_confidence <= 1),
    status public.measurement_status not null default 'extracted',
    verified_by uuid references public.profiles(id) on delete set null,
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    -- A value can't be 'verified' or 'rejected' without saying who and when.
    constraint measurement_review_has_reviewer check (
        status = 'extracted' or (verified_by is not null and verified_at is not null)
    )
);

create index report_measurements_report_id_idx on public.report_measurements (report_id);

alter table public.report_measurements enable row level security;

create trigger audit_report_measurements after insert or update or delete on public.report_measurements
  for each row execute procedure public.log_phi_access();

-- RLS. Rows are inserted by the backend (service role, bypasses RLS) when OCR
-- finishes, so there is no INSERT policy for ordinary users.
create policy "ReportMeasurements: super_admin full access" on public.report_measurements
  for all using (public.get_my_role() = 'super_admin');

-- Doctors/hospital_admins review values for patients in their hospital.
-- WITH CHECK stops them recording someone else's name as the verifier.
create policy "ReportMeasurements: doctor/hospital_admin review same hospital" on public.report_measurements
  for all
  using (
    public.get_my_role() in ('doctor', 'hospital_admin')
    and exists (
      select 1 from public.reports r
      join public.patients p on p.id = r.patient_id
      where r.id = report_id and p.hospital_id = public.get_my_hospital_id()
    )
  )
  with check (
    verified_by is null or verified_by = auth.uid()
  );

create policy "ReportMeasurements: nurse read same hospital" on public.report_measurements
  for select using (
    public.get_my_role() = 'nurse'
    and exists (
      select 1 from public.reports r
      join public.patients p on p.id = r.patient_id
      where r.id = report_id and p.hospital_id = public.get_my_hospital_id()
    )
  );

-- Patients can see what was extracted from their reports, but cannot verify it.
create policy "ReportMeasurements: patient read own" on public.report_measurements
  for select using (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.patient_id = public.get_my_patient_id()
    )
  );

-- ----------------------------------------------------------------------------
-- PART 4: traceability + evidence
--
-- Team rule: the model's prediction, the retrieved medical evidence and the
-- clinician's decision are THREE distinct records.
--   prediction  -> predictions (+ explanations)      already exists
--   evidence    -> prediction_evidence                added here
--   decision    -> clinical_reviews                   next part
-- ----------------------------------------------------------------------------

-- 4a. Make a prediction reproducible: remember exactly what went in.
--     input_features        the values sent to the model
--     source_measurement_ids which verified report_measurements they came from
--     warnings              uncertainty warnings (e.g. "near decision boundary")
alter table public.predictions
  add column if not exists input_features jsonb not null default '{}'::jsonb,
  add column if not exists source_measurement_ids uuid[] not null default '{}',
  add column if not exists warnings text[] not null default '{}';

-- 4b. Evidence passages retrieved by the RAG service for a prediction.
--     Columns mirror what Kanishk's ask_medical_question() returns per source.
create table public.prediction_evidence (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null references public.predictions(id) on delete cascade,
    document text not null,              -- source document name
    page integer,                        -- NULL when the source has no page number
    category text check (category in ('diabetes', 'heart', 'kidney')),
    excerpt text not null,               -- the passage text that supports the claim
    distance numeric,                    -- vector distance (smaller = more similar)
    rank smallint not null default 1,    -- 1 = best match
    created_at timestamptz not null default now()
);

create index prediction_evidence_prediction_id_idx on public.prediction_evidence (prediction_id);

alter table public.prediction_evidence enable row level security;

-- Same access pattern as `explanations`: whoever may see a prediction may see
-- its evidence, and doctors of the same hospital may attach evidence.
create policy "Evidence: super_admin full access" on public.prediction_evidence
  for all using (public.get_my_role() = 'super_admin');

create policy "Evidence: data_scientist read all" on public.prediction_evidence
  for select using (public.get_my_role() = 'data_scientist');

create policy "Evidence: staff read same hospital" on public.prediction_evidence
  for select using (
    exists (
      select 1 from public.predictions pr
      join public.patients p on p.id = pr.patient_id
      where pr.id = prediction_id and p.hospital_id = public.get_my_hospital_id()
    )
  );

create policy "Evidence: doctor insert same hospital" on public.prediction_evidence
  for insert with check (
    public.get_my_role() = 'doctor'
    and exists (
      select 1 from public.predictions pr
      join public.patients p on p.id = pr.patient_id
      where pr.id = prediction_id and p.hospital_id = public.get_my_hospital_id()
    )
  );

create policy "Evidence: patient read own" on public.prediction_evidence
  for select using (
    exists (
      select 1 from public.predictions pr
      where pr.id = prediction_id and pr.patient_id = public.get_my_patient_id()
    )
  );

-- ----------------------------------------------------------------------------
-- PART 5: clinical_reviews (the clinician's decision about a prediction)
--
-- Kept separate from `predictions`: the model's answer is never edited. If a
-- doctor disagrees, the disagreement is recorded HERE, with a reason.
-- Every prediction gets one review row, created automatically as 'pending'.
-- ----------------------------------------------------------------------------

create type public.review_decision as enum ('pending', 'accepted', 'overridden', 'needs_more_data');

create table public.clinical_reviews (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null unique references public.predictions(id) on delete cascade,
    decision public.review_decision not null default 'pending',
    reviewer_id uuid references public.profiles(id) on delete set null,
    override_severity public.severity_level,   -- the clinician's own severity, if overridden
    notes text,
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Any real decision must say who made it and when.
    constraint review_has_reviewer check (
        decision = 'pending' or (reviewer_id is not null and reviewed_at is not null)
    ),
    -- Disagreeing with the model requires a new severity and a written reason.
    constraint override_has_reason check (
        decision <> 'overridden'
        or (override_severity is not null and notes is not null and length(trim(notes)) > 0)
    )
);

alter table public.clinical_reviews enable row level security;

create trigger update_clinical_reviews_updated_at before update on public.clinical_reviews
  for each row execute procedure public.update_updated_at_column();
create trigger audit_clinical_reviews after insert or update or delete on public.clinical_reviews
  for each row execute procedure public.log_phi_access();

-- 5a. Auto-create the 'pending' row whenever a prediction is saved, so a
--     prediction can never exist without a review status (even if the API
--     code forgets). security definer lets it insert past RLS.
create or replace function public.create_pending_review()
returns trigger as $$
begin
  insert into public.clinical_reviews (prediction_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger predictions_create_review after insert on public.predictions
  for each row execute procedure public.create_pending_review();

-- Backfill: predictions saved before this migration get a pending review too.
insert into public.clinical_reviews (prediction_id)
select id from public.predictions
on conflict (prediction_id) do nothing;

-- 5b. RLS. No INSERT/DELETE policy for users: rows are created by the trigger
--     above and are never deleted except by cascade.
create policy "Reviews: super_admin full access" on public.clinical_reviews
  for all using (public.get_my_role() = 'super_admin');

create policy "Reviews: staff read same hospital" on public.clinical_reviews
  for select using (
    exists (
      select 1 from public.predictions pr
      join public.patients p on p.id = pr.patient_id
      where pr.id = prediction_id and p.hospital_id = public.get_my_hospital_id()
    )
  );

-- Only doctors make clinical decisions. WITH CHECK stops a doctor putting
-- another doctor's name on the decision.
create policy "Reviews: doctor decide same hospital" on public.clinical_reviews
  for update
  using (
    public.get_my_role() = 'doctor'
    and exists (
      select 1 from public.predictions pr
      join public.patients p on p.id = pr.patient_id
      where pr.id = prediction_id and p.hospital_id = public.get_my_hospital_id()
    )
  )
  with check (reviewer_id is null or reviewer_id = auth.uid());

-- Deliberately NO patient policy: `notes` are clinician-internal and RLS cannot
-- hide single columns. The backend will return only the review STATUS to
-- patients (a patient-safe field), never the notes.

-- ----------------------------------------------------------------------------
-- PART 6: api_audit_logs (what people DID through the API)
--
-- The existing `audit_logs` records data CHANGES (via triggers). Triggers cannot
-- see READS, uploads, prediction requests or denied attempts, so the backend
-- writes those here. Append-only: nobody can edit or delete a row.
-- ----------------------------------------------------------------------------

create table public.api_audit_logs (
    id uuid primary key default gen_random_uuid(),
    -- actor_id / patient_id are plain uuids with NO foreign key on purpose:
    -- an audit row must survive (unchanged) even if the account or patient is
    -- later deleted. A foreign key with "on delete set null" would have to
    -- UPDATE the audit row, which the append-only trigger below forbids.
    actor_id uuid,
    actor_role text,
    action text not null,            -- e.g. 'prediction.create', 'report.upload', 'patient.read'
    resource_type text not null,     -- e.g. 'prediction', 'report', 'patient'
    resource_id uuid,
    patient_id uuid,                 -- whose data was touched (enables "who accessed patient X?")
    outcome text not null check (outcome in ('success', 'denied', 'error')),
    status_code integer,
    ip_address text,
    details jsonb not null default '{}'::jsonb,  -- never put PHI values in here, only ids/reasons
    created_at timestamptz not null default now()
);

create index api_audit_logs_patient_idx on public.api_audit_logs (patient_id, created_at desc);
create index api_audit_logs_actor_idx on public.api_audit_logs (actor_id, created_at desc);

alter table public.api_audit_logs enable row level security;

-- Append-only. RLS alone is not enough: the backend's service-role key bypasses
-- RLS, so a trigger blocks UPDATE/DELETE for everyone, including the backend.
create or replace function public.block_audit_mutation()
returns trigger as $$
begin
  raise exception 'api_audit_logs is append-only';
end;
$$ language plpgsql;

create trigger api_audit_logs_append_only before update or delete on public.api_audit_logs
  for each row execute procedure public.block_audit_mutation();

-- No INSERT policy: only the backend (service role) writes rows, so a user can
-- never forge an audit entry. Reading is for administrators.
create policy "ApiAudit: super_admin read" on public.api_audit_logs
  for select using (public.get_my_role() = 'super_admin');

create policy "ApiAudit: hospital_admin read own hospital" on public.api_audit_logs
  for select using (
    public.get_my_role() = 'hospital_admin'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.hospital_id = public.get_my_hospital_id()
    )
  );
