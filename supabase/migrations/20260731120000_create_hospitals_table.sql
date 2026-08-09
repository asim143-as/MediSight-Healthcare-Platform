-- 20260729134757_create_hospitals_table.sql
-- Create a minimal hospitals table that the doctor-profile seed can reference.
-- The table is idempotent and includes a simple read‑only policy.

CREATE TABLE IF NOT EXISTS public.hospitals (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT   NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row-Level Security (recommended for Supabase)
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Public read‑only policy (anyone can query hospital names)
CREATE POLICY "Hospitals: public read" ON public.hospitals
    FOR SELECT USING (true);
