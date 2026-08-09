-- Insert a default hospital if the table is empty
INSERT INTO public.hospitals (name)
SELECT 'General Hospital'
WHERE NOT EXISTS (SELECT 1 FROM public.hospitals);
