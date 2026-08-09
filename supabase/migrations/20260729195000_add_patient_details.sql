-- 20260729195000_add_patient_details.sql
-- Add extra patient detail columns (risk info and previous records) idempotently
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS risk_category text,
  ADD COLUMN IF NOT EXISTS risk_score numeric,
  ADD COLUMN IF NOT EXISTS previous_records jsonb NOT NULL DEFAULT '[]'::jsonb;
