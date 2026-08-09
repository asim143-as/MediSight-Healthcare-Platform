-- This migration was intentionally disabled because inserting directly into auth.users is not allowed via migrations.
-- The necessary doctor profiles are seeded by 20260730000000_seed_doctors_profiles.sql.
-- No operation needed.


-- OPTIONAL: confirm profiles were created
-- SELECT id, full_name, role, department FROM public.profiles WHERE full_name ILIKE 'Dr.%';
