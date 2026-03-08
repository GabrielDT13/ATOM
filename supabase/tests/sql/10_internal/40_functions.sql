DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(6);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'internal'
      AND p.proname = 'has_role'
  ),
  'Debe existir la funcion internal.has_role'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'internal'
      AND p.proname = 'is_admin'
  ),
  'Debe existir la funcion internal.is_admin'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'internal'
      AND p.proname = 'normalize_department_name'
  ),
  'Debe existir la funcion internal.normalize_department_name'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'internal'
      AND p.proname = 'ensure_department_name'
  ),
  'Debe existir la funcion internal.ensure_department_name'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'sync_auth_user_profile'
  ),
  'Debe existir la funcion app_private.sync_auth_user_profile'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth'
      AND event_object_table = 'users'
      AND trigger_name = 'on_auth_user_saved'
  ),
  'Debe existir el trigger on_auth_user_saved sobre auth.users'
);

SELECT finish();

ROLLBACK;
