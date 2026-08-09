-- ============================================================================
-- Doctor verification workflow + patient profile details.
--
-- Naming note: the schema already has a `public.patients` table, but that
-- holds hospital-side CLINICAL records (mrn, demographics jsonb) that
-- doctors create and manage — it is not the portal user's own account data.
-- To avoid colliding two very different concepts under one name, the
-- patient-portal user's own phone/gender/date_of_birth live in a new
-- `patient_profiles` table (one row per patient user), separate from the
-- clinical `patients` table.
-- ============================================================================

-- 1) Doctor verification status + doctors table
create type public.doctor_status as enum ('pending', 'approved', 'rejected');

create table public.doctors (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  license_number text not null,
  hospital text,
  specialization text,
  experience integer,
  phone text,
  status public.doctor_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doctors enable row level security;

create trigger update_doctors_updated_at
  before update on public.doctors
  for each row execute procedure public.update_updated_at_column();

-- A doctor can see and (non-status) update their own row; admins see/manage all.
create policy "Doctors: view own"
  on public.doctors for select
  using (user_id = auth.uid());

create policy "Doctors: admin view all"
  on public.doctors for select
  using (public.get_my_role() in ('super_admin', 'hospital_admin'));

create policy "Doctors: update own"
  on public.doctors for update
  using (user_id = auth.uid());

create policy "Doctors: admin manage all"
  on public.doctors for all
  using (public.get_my_role() in ('super_admin', 'hospital_admin'));

-- A doctor must not be able to self-approve by updating their own status.
create or replace function public.prevent_self_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if not (public.get_my_role() in ('super_admin', 'hospital_admin')) then
      raise exception 'Only administrators can approve or reject a doctor account.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists prevent_self_status_change_trigger on public.doctors;
create trigger prevent_self_status_change_trigger
  before update on public.doctors
  for each row execute procedure public.prevent_self_status_change();

-- 2) Patient profile details (phone / gender / date_of_birth), separate from
--    the clinical `patients` table described above.
create table public.patient_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  gender text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patient_profiles enable row level security;

create trigger update_patient_profiles_updated_at
  before update on public.patient_profiles
  for each row execute procedure public.update_updated_at_column();

create policy "PatientProfiles: view own"
  on public.patient_profiles for select
  using (user_id = auth.uid());

create policy "PatientProfiles: update own"
  on public.patient_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "PatientProfiles: admin view all"
  on public.patient_profiles for select
  using (public.get_my_role() in ('super_admin', 'hospital_admin'));

-- 3) Signup trigger: also populate doctors / patient_profiles from the
--    metadata the signup form collects, atomically with the profile row.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role);

  insert into public.profiles (id, full_name, role, hospital_id, department, avatar_url, email, notification_prefs)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    (new.raw_user_meta_data->>'hospital_id')::uuid,
    coalesce(new.raw_user_meta_data->>'department', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    '{"in_app": true, "email": true, "sms": false}'::jsonb
  );

  if v_role = 'doctor' and new.raw_user_meta_data->>'license_number' is not null then
    insert into public.doctors (user_id, license_number, hospital, specialization, experience, phone, status)
    values (
      new.id,
      new.raw_user_meta_data->>'license_number',
      new.raw_user_meta_data->>'hospital',
      new.raw_user_meta_data->>'specialization',
      nullif(new.raw_user_meta_data->>'experience', '')::integer,
      new.raw_user_meta_data->>'phone',
      'pending'
    );
  end if;

  if v_role = 'patient' then
    insert into public.patient_profiles (user_id, phone)
    values (new.id, new.raw_user_meta_data->>'phone');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 4) Controlled self-service path for OAuth users who sign in with Google/
--    Apple as a patient (the only role OAuth can assign directly) and then
--    want to apply as a doctor. Direct client-side updates to profiles.role
--    are blocked by prevent_self_role_escalation_trigger; this function is
--    the one deliberate, audited exception — it only ever moves a `patient`
--    to `doctor` + status `pending`, never to admin/super_admin/etc., and it
--    requires the caller to already be the authenticated `patient` in
--    question. It flips a transaction-local flag
--    (`app.allow_role_change`) that only this function sets, so the
--    role-escalation trigger can distinguish this vetted path from an
--    arbitrary client-side UPDATE. That flag is a Postgres session/txn GUC,
--    not a `public` schema function — PostgREST (Supabase's REST/RPC layer)
--    only exposes functions you explicitly grant in the `public` schema, so
--    a client cannot set it directly; only this function can.
create or replace function public.request_doctor_role(
  p_license_number text,
  p_hospital text,
  p_specialization text,
  p_experience integer,
  p_phone text
) returns void as $$
begin
  if public.get_my_role() <> 'patient' then
    raise exception 'Only a patient account can request doctor verification.';
  end if;
  if p_license_number is null or length(trim(p_license_number)) = 0 then
    raise exception 'A medical license number is required.';
  end if;

  perform set_config('app.allow_role_change', 'true', true); -- true = local to this transaction only
  update public.profiles set role = 'doctor' where id = auth.uid();

  insert into public.doctors (user_id, license_number, hospital, specialization, experience, phone, status)
  values (auth.uid(), p_license_number, p_hospital, p_specialization, p_experience, p_phone, 'pending')
  on conflict (user_id) do update set
    license_number = excluded.license_number,
    hospital = excluded.hospital,
    specialization = excluded.specialization,
    experience = excluded.experience,
    phone = excluded.phone,
    status = 'pending';
end;
$$ language plpgsql security definer;

grant execute on function public.request_doctor_role(text, text, text, integer, text) to authenticated;

-- 5) Re-scope the public "doctor directory" policy (added in
--    20260726170000_add_doctor_profile_fields.sql) to approved doctors
--    only. Without this, a doctor's profiles.role is set to 'doctor'
--    immediately at signup — before any admin review — so unapproved
--    doctors would otherwise appear in the public "Meet our Doctors"
--    listing and be bookable by patients before being vetted.
drop policy if exists "Profiles: public doctor directory read access" on public.profiles;
create policy "Profiles: public doctor directory read access"
  on public.profiles
  for select
  using (
    role = 'doctor'::public.user_role
    and exists (
      select 1 from public.doctors d
      where d.user_id = profiles.id and d.status = 'approved'
    )
  );

-- Teach the existing role-escalation guard about the one legitimate
-- exception above.
create or replace function public.prevent_self_role_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    if not (
      public.get_my_role() = 'super_admin'
      or (public.get_my_role() = 'hospital_admin' and old.hospital_id = public.get_my_hospital_id())
      or coalesce(current_setting('app.allow_role_change', true), 'false') = 'true'
    ) then
      raise exception 'Only administrators can change a user''s role.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;
