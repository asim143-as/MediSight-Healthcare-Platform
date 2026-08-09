-- ============================================================
-- 20260729210000_add_profile_columns.sql
-- Idempotently add missing profile columns needed by the UI
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name          text,
  ADD COLUMN IF NOT EXISTS last_name           text,
  ADD COLUMN IF NOT EXISTS contact_number      text,
  ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available';
