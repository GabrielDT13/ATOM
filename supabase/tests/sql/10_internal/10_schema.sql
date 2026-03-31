DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(8);

SELECT has_schema('internal', 'El schema internal debe existir');
SELECT has_table('internal', 'departments', 'Debe existir internal.departments');
SELECT has_table('internal', 'profiles', 'Debe existir internal.profiles');
SELECT has_table('internal', 'profile_preferences', 'Debe existir internal.profile_preferences');
SELECT has_table('internal', 'profile_activity', 'Debe existir internal.profile_activity');
SELECT has_table('internal', 'dashboard_activity', 'Debe existir internal.dashboard_activity');
SELECT has_table('internal', 'roles', 'Debe existir internal.roles');
SELECT has_table('internal', 'user_roles', 'Debe existir internal.user_roles');

SELECT finish();

ROLLBACK;
