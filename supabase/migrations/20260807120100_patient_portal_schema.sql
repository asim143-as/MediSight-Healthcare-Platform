-- ============================================================================
-- Patient portal schema: fixes the default-signup-role security gap, exposes
-- a public doctor directory, and introduces appointments with RLS scoped so
-- patients can only ever see/manage their own bookings and doctors can only
-- see/manage bookings assigned to them.
-- ============================================================================

-- 1) SECURITY FIX: self-service signups used to default to 'doctor' when no
--    role was supplied. Anyone who signed up through the public /signup form
--    without an explicit role therefore got full clinical-staff access. New
--    self-service signups now default to 'patient'; doctor accounts must be
--    explicitly created with role='doctor' in signup metadata (see the
--    updated signup flow) or provisioned by an admin.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, hospital_id, department, avatar_url, email, notification_prefs)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role),
    (new.raw_user_meta_data->>'hospital_id')::uuid,
    coalesce(new.raw_user_meta_data->>'department', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    '{"in_app": true, "email": true, "sms": false}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

-- (A public "doctor directory" read policy already exists from
-- 20260726170000_add_doctor_profile_fields.sql — it's re-scoped to
-- approved-only doctors in 20260807140000_doctor_verification.sql, once
-- the `doctors` table that tracks approval status exists.)

-- 2) CRITICAL FIX: close a privilege-escalation hole. The pre-existing
--    "update own profile" policy has no WITH CHECK, so under Postgres RLS
--    the USING clause doubles as the check — meaning any authenticated user
--    could update their own `role` column directly (e.g. via a client-side
--    `.from('profiles').update({ role: 'doctor' })` call, or through the
--    /onboarding page's role picker) and grant themselves doctor/admin
--    access. This is the real mechanism behind patients being able to reach
--    doctor-only areas. A trigger is used instead of a WITH CHECK subquery
--    because RLS checks can't reliably compare NEW vs OLD via a self-join.
create or replace function public.prevent_self_role_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    if not (
      public.get_my_role() = 'super_admin'
      or (public.get_my_role() = 'hospital_admin' and old.hospital_id = public.get_my_hospital_id())
    ) then
      raise exception 'Only administrators can change a user''s role.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists prevent_self_role_escalation_trigger on public.profiles;
create trigger prevent_self_role_escalation_trigger
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_escalation();

-- 3) Appointments
create type public.appointment_status as enum ('Requested', 'Confirmed', 'Completed', 'Cancelled');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'Requested',
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_patient_id_idx on public.appointments(patient_id);
create index appointments_doctor_id_idx on public.appointments(doctor_id);

alter table public.appointments enable row level security;

create trigger update_appointments_updated_at
  before update on public.appointments
  for each row execute procedure public.update_updated_at_column();

-- Patients: can create, view, and update (e.g. cancel) only their own bookings.
create policy "Appointments: patient view own"
  on public.appointments for select
  using (patient_id = auth.uid());

create policy "Appointments: patient create own"
  on public.appointments for insert
  with check (patient_id = auth.uid() and public.get_my_role() = 'patient');

create policy "Appointments: patient update own"
  on public.appointments for update
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- Doctors: can view and update (confirm/complete/cancel) appointments assigned to them.
create policy "Appointments: doctor view own"
  on public.appointments for select
  using (doctor_id = auth.uid());

create policy "Appointments: doctor update own"
  on public.appointments for update
  using (doctor_id = auth.uid());

-- Admin oversight.
create policy "Appointments: super_admin full access"
  on public.appointments for all
  using (public.get_my_role() = 'super_admin');

create policy "Appointments: hospital_admin scoped"
  on public.appointments for all
  using (
    public.get_my_role() = 'hospital_admin'
    and exists (
      select 1 from public.profiles dp
      where dp.id = doctor_id and dp.hospital_id = public.get_my_hospital_id()
    )
  );
