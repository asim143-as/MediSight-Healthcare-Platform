/* 20260731121500_seed_hospitals.sql */
-- Insert a default hospital record if the hospitals table is empty.
INSERT INTO public.hospitals (name)
SELECT 'General Hospital'
WHERE NOT EXISTS (SELECT 1 FROM public.hospitals);
