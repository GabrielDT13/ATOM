DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(18);

SELECT columns_are(
  'internal',
  'profiles',
  ARRAY['id', 'email', 'username', 'full_name', 'avatar_url', 'department', 'is_active', 'created_at', 'updated_at'],
  'internal.profiles debe tener las columnas esperadas'
);

SELECT columns_are(
  'internal',
  'roles',
  ARRAY['id', 'description', 'created_at'],
  'internal.roles debe tener las columnas esperadas'
);

SELECT columns_are(
  'internal',
  'user_roles',
  ARRAY['user_id', 'role_id', 'created_at'],
  'internal.user_roles debe tener las columnas esperadas'
);

SELECT col_type_is('internal', 'profiles', 'id', 'uuid', 'internal.profiles.id debe ser uuid');
SELECT col_type_is('internal', 'profiles', 'email', 'text', 'internal.profiles.email debe ser text');
SELECT col_type_is('internal', 'profiles', 'department', 'text', 'internal.profiles.department debe ser text');
SELECT col_type_is('internal', 'profiles', 'is_active', 'boolean', 'internal.profiles.is_active debe ser boolean');

SELECT has_pk('internal', 'profiles', 'internal.profiles debe tener primary key');
SELECT has_pk('internal', 'roles', 'internal.roles debe tener primary key');
SELECT has_pk('internal', 'user_roles', 'internal.user_roles debe tener primary key');

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_self_or_admin'
  ),
  'Debe existir la policy profiles_update_self_or_admin'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'profiles'
      AND policyname = 'profiles_select_self_or_related_or_admin'
  ),
  'Debe existir la policy profiles_select_self_or_related_or_admin'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name = 'profiles'
      AND grantee = 'authenticated'
      AND privilege_type = 'UPDATE'
  ),
  'authenticated no debe poder hacer UPDATE directo sobre internal.profiles'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name IN ('roles', 'user_roles')
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated no debe poder leer directamente internal.roles ni internal.user_roles'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'roles'
      AND policyname = 'roles_no_direct_access'
  ),
  'Debe existir la policy roles_no_direct_access'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'user_roles'
      AND policyname = 'user_roles_no_direct_access'
  ),
  'Debe existir la policy user_roles_no_direct_access'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'internal'
      AND indexname = 'idx_internal_profiles_username'
  ),
  'No debe existir el indice redundante idx_internal_profiles_username'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'internal'
      AND indexname = 'idx_internal_user_roles_role_id'
  ),
  'Debe existir el indice idx_internal_user_roles_role_id para cubrir la foreign key'
);

SELECT finish();

ROLLBACK;
