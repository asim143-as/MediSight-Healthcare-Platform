-- Add 'patient' as a first-class role.
-- Until now, public.user_role only covered clinical staff
-- ('super_admin','hospital_admin','doctor','nurse','data_scientist'),
-- and every self-service signup silently became a 'doctor'. This migration
-- must be applied (and committed) before 20260807120100_patient_portal_schema.sql,
-- since Postgres will not let a newly added enum value be used in the same
-- transaction it was added in.
alter type public.user_role add value if not exists 'patient';
