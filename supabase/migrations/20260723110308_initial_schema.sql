-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Enum Types
create type public.user_role as enum ('super_admin', 'hospital_admin', 'doctor', 'nurse', 'data_scientist');
create type public.severity_level as enum ('Low', 'Moderate', 'High', 'Critical');
create type public.alert_status as enum ('New', 'Acknowledged', 'Resolved');

-- 1. Hospitals Table
create table public.hospitals (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text,
    region text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Profiles Table (extends auth.users)
create table public.profiles (
    id uuid primary key references auth.users on delete cascade,
    full_name text not null,
    role public.user_role not null default 'doctor',
    hospital_id uuid references public.hospitals(id) on delete set null,
    department text,
    avatar_url text,
    notification_prefs jsonb not null default '{"in_app": true, "email": true, "sms": false}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Patients Table (FHIR-shaped)
create table public.patients (
    id uuid primary key default gen_random_uuid(),
    hospital_id uuid not null references public.hospitals(id) on delete cascade,
    mrn text not null unique,
    demographics jsonb not null default '{}'::jsonb, -- name, gender, birthdate, contact, address
    family_history jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. Vitals Table (Time-series observations)
create table public.vitals (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    type text not null, -- 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', etc.
    value numeric not null,
    unit text not null,
    recorded_at timestamptz not null,
    created_at timestamptz not null default now()
);

-- 5. Lab Results Table (Time-series lab data)
create table public.lab_results (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    test_name text not null,
    value numeric not null,
    unit text not null,
    reference_range text,
    recorded_at timestamptz not null,
    created_at timestamptz not null default now()
);

-- 6. Medications Table
create table public.medications (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    name text not null,
    dosage text not null,
    start_date date not null,
    end_date date,
    adherence_score numeric,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 7. Diagnoses Table
create table public.diagnoses (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    condition text not null,
    diagnosed_at date not null,
    source text,
    created_at timestamptz not null default now()
);

-- 8. Predictions Table
create table public.predictions (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    disease text not null,
    probability numeric not null check (probability >= 0 and probability <= 1),
    confidence numeric not null check (confidence >= 0 and confidence <= 1),
    severity public.severity_level not null,
    model_version text not null,
    created_at timestamptz not null default now()
);

-- 9. Explanations Table (1:1 with Predictions)
create table public.explanations (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null references public.predictions(id) on delete cascade unique,
    shap_payload jsonb not null default '{}'::jsonb,
    clinical_explanation text not null,
    created_at timestamptz not null default now()
);

-- 10. Doctor Patient Assignments Table
create table public.doctor_patient_assignments (
    doctor_id uuid not null references public.profiles(id) on delete cascade,
    patient_id uuid not null references public.patients(id) on delete cascade,
    hospital_id uuid not null references public.hospitals(id) on delete cascade,
    assigned_at timestamptz not null default now(),
    primary key (doctor_id, patient_id)
);

-- 11. Alerts Table
create table public.alerts (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    type text not null, -- 'Critical Risk', 'Vital Deviation', etc.
    severity public.severity_level not null,
    status public.alert_status not null default 'New',
    created_at timestamptz not null default now(),
    acknowledged_by uuid references public.profiles(id) on delete set null,
    resolved_at timestamptz,
    updated_at timestamptz not null default now()
);

-- 12. AI Chat Sessions Table
create table public.ai_chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    patient_id uuid not null references public.patients(id) on delete cascade,
    created_at timestamptz not null default now()
);

-- 13. AI Messages Table
create table public.ai_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamptz not null default now()
);

-- 14. Model Registry Table
create table public.model_registry (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    version text not null,
    stage text not null check (stage in ('Staging', 'Production')),
    metrics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    unique(name, version)
);

-- 15. Audit Logs Table (Append-Only)
create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references public.profiles(id) on delete set null,
    action text not null check (action in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
    table_name text not null,
    row_id uuid not null,
    old_values jsonb,
    new_values jsonb,
    created_at timestamptz not null default now()
);

-- RLS Helper Functions (Security Definer to bypass RLS recursion)
create or replace function public.get_my_role()
returns public.user_role as $$
declare
  r public.user_role;
begin
  select role into r from public.profiles where id = auth.uid();
  return r;
end;
$$ language plpgsql security definer;

create or replace function public.get_my_hospital_id()
returns uuid as $$
declare
  h_id uuid;
begin
  select hospital_id into h_id from public.profiles where id = auth.uid();
  return h_id;
end;
$$ language plpgsql security definer;

-- Enable Row Level Security (RLS) on all tables
alter table public.hospitals enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.vitals enable row level security;
alter table public.lab_results enable row level security;
alter table public.medications enable row level security;
alter table public.diagnoses enable row level security;
alter table public.predictions enable row level security;
alter table public.explanations enable row level security;
alter table public.doctor_patient_assignments enable row level security;
alter table public.alerts enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_messages enable row level security;
alter table public.model_registry enable row level security;
alter table public.audit_logs enable row level security;

-- RLS Policies

-- Hospitals policies
create policy "Hospitals: super_admin full access" on public.hospitals
    for all using (public.get_my_role() = 'super_admin');
create policy "Hospitals: staff view own hospital" on public.hospitals
    for select using (id = public.get_my_hospital_id());

-- Profiles policies
create policy "Profiles: view own or admin view scoped" on public.profiles
    for select using (
        id = auth.uid() 
        or public.get_my_role() = 'super_admin' 
        or (public.get_my_role() = 'hospital_admin' and hospital_id = public.get_my_hospital_id())
    );
create policy "Profiles: allow self registration" on public.profiles
    for insert with check (id = auth.uid());
create policy "Profiles: update own profile or admin update scoped" on public.profiles
    for update using (
        id = auth.uid()
        or public.get_my_role() = 'super_admin'
        or (public.get_my_role() = 'hospital_admin' and hospital_id = public.get_my_hospital_id())
    );
create policy "Profiles: super_admin delete profiles" on public.profiles
    for delete using (public.get_my_role() = 'super_admin');

-- Patients policies
create policy "Patients: super_admin full access" on public.patients
    for all using (public.get_my_role() = 'super_admin');
create policy "Patients: hospital_admin read/write scoped" on public.patients
    for all using (public.get_my_role() = 'hospital_admin' and hospital_id = public.get_my_hospital_id());
create policy "Patients: doctor read/write assigned or same hospital" on public.patients
    for all using (
        public.get_my_role() = 'doctor' 
        and (
            hospital_id = public.get_my_hospital_id()
            or exists (
                select 1 from public.doctor_patient_assignments dpa 
                where dpa.patient_id = id and dpa.doctor_id = auth.uid()
            )
        )
    );
create policy "Patients: nurse read scoped" on public.patients
    for select using (
        public.get_my_role() = 'nurse' 
        and hospital_id = public.get_my_hospital_id()
    );

-- Vitals policies
create policy "Vitals: super_admin full access" on public.vitals for all using (public.get_my_role() = 'super_admin');
create policy "Vitals: staff read same hospital" on public.vitals for select using (
    exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Vitals: doctor read/write same hospital" on public.vitals for all using (
    public.get_my_role() = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Vitals: hospital_admin read/write same hospital" on public.vitals for all using (
    public.get_my_role() = 'hospital_admin'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);

-- LabResults policies
create policy "LabResults: super_admin full access" on public.lab_results for all using (public.get_my_role() = 'super_admin');
create policy "LabResults: staff read same hospital" on public.lab_results for select using (
    exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "LabResults: doctor read/write same hospital" on public.lab_results for all using (
    public.get_my_role() = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "LabResults: hospital_admin read/write same hospital" on public.lab_results for all using (
    public.get_my_role() = 'hospital_admin'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);

-- Medications policies
create policy "Medications: super_admin full access" on public.medications for all using (public.get_my_role() = 'super_admin');
create policy "Medications: staff read same hospital" on public.medications for select using (
    exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Medications: doctor read/write same hospital" on public.medications for all using (
    public.get_my_role() = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Medications: hospital_admin read/write same hospital" on public.medications for all using (
    public.get_my_role() = 'hospital_admin'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);

-- Diagnoses policies
create policy "Diagnoses: super_admin full access" on public.diagnoses for all using (public.get_my_role() = 'super_admin');
create policy "Diagnoses: staff read same hospital" on public.diagnoses for select using (
    exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Diagnoses: doctor read/write same hospital" on public.diagnoses for all using (
    public.get_my_role() = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Diagnoses: hospital_admin read/write same hospital" on public.diagnoses for all using (
    public.get_my_role() = 'hospital_admin'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);

-- Predictions policies
create policy "Predictions: super_admin full access" on public.predictions for all using (public.get_my_role() = 'super_admin');
create policy "Predictions: data_scientist read all" on public.predictions for select using (public.get_my_role() = 'data_scientist');
create policy "Predictions: staff read same hospital" on public.predictions for select using (
    exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Predictions: doctor insert same hospital" on public.predictions for insert with check (
    public.get_my_role() = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);

-- Explanations policies
create policy "Explanations: super_admin full access" on public.explanations for all using (public.get_my_role() = 'super_admin');
create policy "Explanations: data_scientist read all" on public.explanations for select using (public.get_my_role() = 'data_scientist');
create policy "Explanations: staff read same hospital" on public.explanations for select using (
    exists (
        select 1 from public.predictions pr
        join public.patients p on p.id = pr.patient_id
        where pr.id = prediction_id and p.hospital_id = public.get_my_hospital_id()
    )
);
create policy "Explanations: doctor insert same hospital" on public.explanations for insert with check (
    public.get_my_role() = 'doctor'
    and exists (
        select 1 from public.predictions pr
        join public.patients p on p.id = pr.patient_id
        where pr.id = prediction_id and p.hospital_id = public.get_my_hospital_id()
    )
);

-- Doctor Patient Assignments policies
create policy "Assignments: super_admin full access" on public.doctor_patient_assignments for all using (public.get_my_role() = 'super_admin');
create policy "Assignments: hospital_admin read/write scoped" on public.doctor_patient_assignments for all using (
    public.get_my_role() = 'hospital_admin' and hospital_id = public.get_my_hospital_id()
);
create policy "Assignments: staff read own hospital" on public.doctor_patient_assignments for select using (
    hospital_id = public.get_my_hospital_id()
);

-- Alerts policies
create policy "Alerts: super_admin full access" on public.alerts for all using (public.get_my_role() = 'super_admin');
create policy "Alerts: staff read same hospital" on public.alerts for select using (
    exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);
create policy "Alerts: staff update alert status same hospital" on public.alerts for update using (
    public.get_my_role() in ('hospital_admin', 'doctor', 'nurse')
    and exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
) with check (
    public.get_my_role() in ('hospital_admin', 'doctor', 'nurse')
);
create policy "Alerts: system insert" on public.alerts for insert with check (
    exists (select 1 from public.patients p where p.id = patient_id and p.hospital_id = public.get_my_hospital_id())
);

-- AI Chat Sessions policies
create policy "ChatSessions: super_admin full" on public.ai_chat_sessions for all using (public.get_my_role() = 'super_admin');
create policy "ChatSessions: user full" on public.ai_chat_sessions for all using (user_id = auth.uid());

-- AI Messages policies
create policy "ChatMessages: super_admin full" on public.ai_messages for all using (public.get_my_role() = 'super_admin');
create policy "ChatMessages: user full" on public.ai_messages for all using (
    exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- Model Registry policies
create policy "ModelRegistry: staff view" on public.model_registry for select using (
    public.get_my_role() in ('super_admin', 'hospital_admin', 'doctor', 'nurse', 'data_scientist')
);
create policy "ModelRegistry: admin/DS write" on public.model_registry for all using (
    public.get_my_role() in ('super_admin', 'data_scientist')
);

-- Audit Logs policies (Append-only)
create policy "AuditLogs: super_admin and hospital_admin view" on public.audit_logs for select using (
    public.get_my_role() in ('super_admin', 'hospital_admin')
);

-- Triggers for updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_hospitals_updated_at before update on public.hospitals for each row execute procedure public.update_updated_at_column();
create trigger update_profiles_updated_at before update on public.profiles for each row execute procedure public.update_updated_at_column();
create trigger update_patients_updated_at before update on public.patients for each row execute procedure public.update_updated_at_column();
create trigger update_medications_updated_at before update on public.medications for each row execute procedure public.update_updated_at_column();
create trigger update_alerts_updated_at before update on public.alerts for each row execute procedure public.update_updated_at_column();

-- Audit Logging Trigger function
create or replace function public.log_phi_access()
returns trigger as $$
declare
    actor uuid := auth.uid();
    act text;
    r_id uuid;
    old_val jsonb := null;
    new_val jsonb := null;
begin
    if TG_OP = 'INSERT' then
        act := 'INSERT';
        r_id := new.id;
        new_val := to_jsonb(new);
    elsif TG_OP = 'UPDATE' then
        act := 'UPDATE';
        r_id := new.id;
        old_val := to_jsonb(old);
        new_val := to_jsonb(new);
    elsif TG_OP = 'DELETE' then
        act := 'DELETE';
        r_id := old.id;
        old_val := to_jsonb(old);
    end if;

    insert into public.audit_logs (actor_id, action, table_name, row_id, old_values, new_values)
    values (actor, act, TG_TABLE_NAME, r_id, old_val, new_val);
    
    return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Attach Audit Log triggers to PHI-relevant tables
create trigger audit_patients after insert or update or delete on public.patients for each row execute procedure public.log_phi_access();
create trigger audit_predictions after insert or update or delete on public.predictions for each row execute procedure public.log_phi_access();
create trigger audit_lab_results after insert or update or delete on public.lab_results for each row execute procedure public.log_phi_access();

-- Hook up profiles auto-create from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, hospital_id, department, avatar_url, notification_prefs)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'doctor'::public.user_role),
    (new.raw_user_meta_data->>'hospital_id')::uuid,
    coalesce(new.raw_user_meta_data->>'department', ''),
    new.raw_user_meta_data->>'avatar_url',
    '{"in_app": true, "email": true, "sms": false}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
