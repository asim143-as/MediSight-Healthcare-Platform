-- Add email to profiles to support Doctor Directory queries
alter table public.profiles
  add column if not exists email text;

-- Update the handle_new_user function to sync email from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, hospital_id, department, avatar_url, email, notification_prefs)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'doctor'::public.user_role),
    (new.raw_user_meta_data->>'hospital_id')::uuid,
    coalesce(new.raw_user_meta_data->>'department', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    '{"in_app": true, "email": true, "sms": false}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create Contact Inquiries table for the new Contact Page
create table public.contact_inquiries (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text not null,
    department text,
    subject text not null,
    message text not null,
    status text not null default 'New',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.contact_inquiries enable row level security;

-- Policies for contact_inquiries (allow public submission, but only admins can read)
create policy "ContactInquiries: allow anonymous insert" on public.contact_inquiries
    for insert with check (true);

create policy "ContactInquiries: admin full access" on public.contact_inquiries
    for all using (public.get_my_role() = 'super_admin');

-- Trigger to update updated_at
create trigger update_contact_inquiries_updated_at before update on public.contact_inquiries for each row execute procedure public.update_updated_at_column();
