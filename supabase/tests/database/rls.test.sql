-- RLS Policy tests for MediSight AI
begin;
select plan(10);

-- 1. Check if pgvector and uuid extensions are installed
select has_extension('vector');
select has_extension('uuid-ossp');

-- 2. Verify all core tables have RLS enabled
select rls_enabled('public', 'hospitals');
select rls_enabled('public', 'profiles');
select rls_enabled('public', 'patients');
select rls_enabled('public', 'predictions');
select rls_enabled('public', 'explanations');
select rls_enabled('public', 'alerts');
select rls_enabled('public', 'audit_logs');

-- 3. Verify audit_logs table is not writable directly by standard users
-- Setup dummy user session
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

-- Try to insert into audit_logs directly and expect it to fail (or be blocked by RLS policies since no insert policy exists)
-- In pgTAP, we can check if inserting throws a policy violation or fails.
-- Since there is no INSERT policy on audit_logs, any direct insert by 'authenticated' role will fail.
select throws_like(
    $$insert into public.audit_logs (action, table_name, row_id) values ('SELECT', 'patients', '00000000-0000-0000-0000-000000000002')$$,
    '%permission denied%',
    'Should not allow direct inserts into audit_logs by authenticated users'
);

select * from finish();
rollback;
