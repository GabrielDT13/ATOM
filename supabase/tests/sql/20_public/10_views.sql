DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(18);

SELECT has_view('public', 'vw_departments', 'Debe existir la vista public.vw_departments');
SELECT has_view('public', 'vw_profiles', 'Debe existir la vista public.vw_profiles');
SELECT has_view('public', 'vw_projects', 'Debe existir la vista public.vw_projects');
SELECT has_view('public', 'vw_projects_with_users', 'Debe existir la vista public.vw_projects_with_users');
SELECT has_view('public', 'vw_profile_preferences', 'Debe existir la vista public.vw_profile_preferences');
SELECT has_view('public', 'vw_profile_activity', 'Debe existir la vista public.vw_profile_activity');

SELECT columns_are(
  'public',
  'vw_departments',
  ARRAY['id', 'name', 'slug'],
  'public.vw_departments debe exponer las columnas esperadas'
);

SELECT columns_are(
  'public',
  'vw_profiles',
  ARRAY['id', 'email', 'username', 'full_name', 'avatar_url', 'department', 'bio', 'is_active', 'created_at', 'updated_at', 'roles'],
  'public.vw_profiles debe exponer las columnas esperadas'
);

SELECT columns_are(
  'public',
  'vw_projects',
  ARRAY['id', 'owner_id', 'owner_username', 'name', 'slug', 'description', 'status', 'created_at', 'updated_at', 'member_count'],
  'public.vw_projects debe exponer las columnas esperadas'
);

SELECT columns_are(
  'public',
  'vw_projects_with_users',
  ARRAY['project_id', 'project_name', 'project_slug', 'project_status', 'owner_id', 'owner_username', 'member_id', 'member_username', 'member_role', 'member_created_at'],
  'public.vw_projects_with_users debe exponer las columnas esperadas'
);

SELECT columns_are(
  'public',
  'vw_profile_preferences',
  ARRAY['user_id', 'email_notifications', 'security_alerts', 'dark_mode', 'interface_language', 'created_at', 'updated_at'],
  'public.vw_profile_preferences debe exponer las columnas esperadas'
);

SELECT columns_are(
  'public',
  'vw_profile_activity',
  ARRAY['id', 'user_id', 'activity_type', 'title', 'description', 'created_at'],
  'public.vw_profile_activity debe exponer las columnas esperadas'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'vw_departments'
      AND c.relkind = 'v'
      AND COALESCE(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=true%'
  ),
  'public.vw_departments debe usar security_invoker'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'vw_profiles'
      AND c.relkind = 'v'
      AND COALESCE(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=true%'
  ),
  'public.vw_profiles debe usar security_invoker'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'vw_projects'
      AND c.relkind = 'v'
      AND COALESCE(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=true%'
  ),
  'public.vw_projects debe usar security_invoker'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'vw_projects_with_users'
      AND c.relkind = 'v'
      AND COALESCE(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=true%'
  ),
  'public.vw_projects_with_users debe usar security_invoker'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'vw_profile_preferences'
      AND c.relkind = 'v'
      AND COALESCE(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=true%'
  ),
  'public.vw_profile_preferences debe usar security_invoker'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'vw_profile_activity'
      AND c.relkind = 'v'
      AND COALESCE(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=true%'
  ),
  'public.vw_profile_activity debe usar security_invoker'
);

SELECT finish();

ROLLBACK;
