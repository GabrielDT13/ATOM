DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(2);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_projects'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated debe poder hacer SELECT sobre public.vw_projects'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'create_project'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated debe poder ejecutar public.create_project'
);

SELECT finish();

ROLLBACK;
