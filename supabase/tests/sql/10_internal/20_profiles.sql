DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(34);

SELECT columns_are(
  'internal',
  'profiles',
  ARRAY['id', 'email', 'username', 'full_name', 'avatar_url', 'department', 'bio', 'is_active', 'created_at', 'updated_at'],
  'internal.profiles debe tener las columnas esperadas'
);

SELECT columns_are(
  'internal',
  'profile_preferences',
  ARRAY['user_id', 'email_notifications', 'security_alerts', 'dark_mode', 'interface_language', 'created_at', 'updated_at'],
  'internal.profile_preferences debe tener las columnas esperadas'
);

SELECT columns_are(
  'internal',
  'profile_activity',
  ARRAY['id', 'user_id', 'activity_type', 'title', 'description', 'created_at'],
  'internal.profile_activity debe tener las columnas esperadas'
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
SELECT col_type_is('internal', 'profiles', 'bio', 'text', 'internal.profiles.bio debe ser text');
SELECT col_type_is('internal', 'profiles', 'is_active', 'boolean', 'internal.profiles.is_active debe ser boolean');
SELECT col_type_is('internal', 'profile_preferences', 'user_id', 'uuid', 'internal.profile_preferences.user_id debe ser uuid');
SELECT col_type_is('internal', 'profile_preferences', 'email_notifications', 'boolean', 'internal.profile_preferences.email_notifications debe ser boolean');
SELECT col_type_is('internal', 'profile_preferences', 'security_alerts', 'boolean', 'internal.profile_preferences.security_alerts debe ser boolean');
SELECT col_type_is('internal', 'profile_preferences', 'dark_mode', 'boolean', 'internal.profile_preferences.dark_mode debe ser boolean');
SELECT col_type_is('internal', 'profile_preferences', 'interface_language', 'text', 'internal.profile_preferences.interface_language debe ser text');
SELECT col_type_is('internal', 'profile_activity', 'user_id', 'uuid', 'internal.profile_activity.user_id debe ser uuid');

SELECT has_pk('internal', 'profiles', 'internal.profiles debe tener primary key');
SELECT has_pk('internal', 'profile_preferences', 'internal.profile_preferences debe tener primary key');
SELECT has_pk('internal', 'profile_activity', 'internal.profile_activity debe tener primary key');
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
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'profile_preferences'
      AND policyname = 'profile_preferences_select_self'
  ),
  'Debe existir la policy profile_preferences_select_self'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'profile_preferences'
      AND policyname = 'profile_preferences_update_self'
  ),
  'Debe existir la policy profile_preferences_update_self'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'profile_activity'
      AND policyname = 'profile_activity_select_self'
  ),
  'Debe existir la policy profile_activity_select_self'
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
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name = 'profile_preferences'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated debe poder leer sus preferencias directas'
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

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'internal'
      AND indexname = 'idx_internal_profile_activity_user_created_at'
  ),
  'Debe existir el indice idx_internal_profile_activity_user_created_at'
);

SELECT finish();

ROLLBACK;
