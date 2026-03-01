CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(11);

SELECT has_table('internal', 'projects', 'Debe existir internal.projects');
SELECT has_table('internal', 'project_members', 'Debe existir internal.project_members');

SELECT columns_are(
  'internal',
  'projects',
  ARRAY['id', 'owner_id', 'name', 'slug', 'description', 'status', 'created_at', 'updated_at'],
  'internal.projects debe tener las columnas esperadas'
);

SELECT columns_are(
  'internal',
  'project_members',
  ARRAY['project_id', 'user_id', 'member_role', 'created_at'],
  'internal.project_members debe tener las columnas esperadas'
);

SELECT col_type_is('internal', 'projects', 'id', 'uuid', 'internal.projects.id debe ser uuid');
SELECT col_type_is('internal', 'projects', 'status', 'text', 'internal.projects.status debe ser text');
SELECT col_type_is('internal', 'project_members', 'member_role', 'text', 'internal.project_members.member_role debe ser text');

SELECT has_pk('internal', 'projects', 'internal.projects debe tener primary key');
SELECT has_pk('internal', 'project_members', 'internal.project_members debe tener primary key');

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'projects'
      AND policyname = 'projects_select_member_or_admin'
  ),
  'Debe existir la policy projects_select_member_or_admin'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'project_members'
      AND policyname = 'project_members_mutate_owner_or_admin'
  ),
  'Debe existir la policy project_members_mutate_owner_or_admin'
);

SELECT finish();

ROLLBACK;
