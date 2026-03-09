DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(11);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_my_profile'
  ),
  'Debe existir la RPC public.update_my_profile'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project'
  ),
  'Debe existir la RPC public.create_project'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_project'
  ),
  'Debe existir la RPC public.update_project'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_set_user_role'
  ),
  'Debe existir la RPC public.admin_set_user_role'
);

SELECT is(
  (
    SELECT pg_get_function_result(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_my_profile'
    LIMIT 1
  ),
  'TABLE(id uuid, email text, username text, full_name text, avatar_url text, department text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])',
  'public.update_my_profile debe devolver la tabla esperada'
);

SELECT is(
  (
    SELECT pg_get_function_result(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project'
    LIMIT 1
  ),
  'TABLE(id uuid, owner_id uuid, owner_username text, name text, slug text, description text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint)',
  'public.create_project debe devolver la tabla esperada'
);

SELECT is(
  (
    SELECT pg_get_function_result(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_project'
    LIMIT 1
  ),
  'TABLE(id uuid, owner_id uuid, owner_username text, name text, slug text, description text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint)',
  'public.update_project debe devolver la tabla esperada'
);

SELECT is(
  (
    SELECT pg_get_function_result(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_set_user_role'
    LIMIT 1
  ),
  'TABLE(id uuid, email text, username text, full_name text, avatar_url text, department text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])',
  'public.admin_set_user_role debe devolver la tabla esperada'
);

SELECT ok(
  (
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_set_user_role'
    LIMIT 1
  ) LIKE '%auth.role() <> ''service_role''%',
  'public.admin_set_user_role debe validar que la invocacion llegue con service_role'
);

SELECT ok(
  (
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_project'
    LIMIT 1
  ) LIKE '%IF NOT FOUND THEN%',
  'public.update_project debe abortar si no encuentra el proyecto o no hay permiso'
);

SELECT ok(
  (
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_my_profile'
    LIMIT 1
  ) LIKE '%IF NOT FOUND THEN%',
  'public.update_my_profile debe abortar si no encuentra el perfil'
);

SELECT finish();

ROLLBACK;
