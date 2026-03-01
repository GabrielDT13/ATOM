CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(6);

SELECT has_view('public', 'vw_profiles', 'Debe existir la vista public.vw_profiles');
SELECT has_view('public', 'vw_projects', 'Debe existir la vista public.vw_projects');
SELECT has_view('public', 'vw_projects_with_users', 'Debe existir la vista public.vw_projects_with_users');

SELECT columns_are(
  'public',
  'vw_profiles',
  ARRAY['id', 'email', 'username', 'full_name', 'avatar_url', 'is_active', 'created_at', 'updated_at', 'roles'],
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

SELECT finish();

ROLLBACK;
