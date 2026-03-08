DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(11);

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

SELECT finish();

ROLLBACK;
