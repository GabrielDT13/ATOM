DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(19);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_departments'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated debe poder hacer SELECT sobre public.vw_departments'
);

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
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_profile_preferences'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated debe poder hacer SELECT sobre public.vw_profile_preferences'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_profile_preferences'
      AND grantee = 'authenticated'
      AND privilege_type = 'UPDATE'
  ),
  'authenticated debe poder hacer UPDATE sobre public.vw_profile_preferences'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_profile_activity'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated debe poder hacer SELECT sobre public.vw_profile_activity'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_profile_activity'
      AND grantee = 'service_role'
      AND privilege_type = 'INSERT'
  ),
  'service_role debe poder hacer INSERT sobre public.vw_profile_activity'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_profiles'
      AND grantee = 'service_role'
      AND privilege_type = 'SELECT'
  ),
  'service_role debe poder hacer SELECT sobre public.vw_profiles'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'vw_profiles'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated no debe poder hacer SELECT directo sobre public.vw_profiles'
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

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'change_my_password'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated debe poder ejecutar public.change_my_password'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'delete_my_account'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated debe poder ejecutar public.delete_my_account'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_set_user_role'
      AND grantee = 'service_role'
      AND privilege_type = 'EXECUTE'
  ),
  'service_role debe poder ejecutar public.admin_set_user_role'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_create_project'
      AND grantee = 'service_role'
      AND privilege_type = 'EXECUTE'
  ),
  'service_role debe poder ejecutar public.admin_create_project'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_set_project_member'
      AND grantee = 'service_role'
      AND privilege_type = 'EXECUTE'
  ),
  'service_role debe poder ejecutar public.admin_set_project_member'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_transfer_project_ownership'
      AND grantee = 'service_role'
      AND privilege_type = 'EXECUTE'
  ),
  'service_role debe poder ejecutar public.admin_transfer_project_ownership'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_set_user_role'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated no debe poder ejecutar public.admin_set_user_role'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_create_project'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated no debe poder ejecutar public.admin_create_project'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_set_project_member'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated no debe poder ejecutar public.admin_set_project_member'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_transfer_project_ownership'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ),
  'authenticated no debe poder ejecutar public.admin_transfer_project_ownership'
);

SELECT finish();

ROLLBACK;
