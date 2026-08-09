-- Add extended doctor profile fields only if they don't already exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS specialty          text,
  ADD COLUMN IF NOT EXISTS phone              text,
  ADD COLUMN IF NOT EXISTS bio                text,
  ADD COLUMN IF NOT EXISTS available          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consultation_fee  numeric,
  ADD COLUMN IF NOT EXISTS services           jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Re‑create the read‑only policy safely
DROP POLICY IF EXISTS "Profiles: public doctor directory read access" ON public.profiles;
CREATE POLICY "Profiles: public doctor directory read access"
  ON public.profiles
  FOR SELECT
  USING (role = 'doctor');
