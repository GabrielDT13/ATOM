DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(15);

SELECT has_table('internal', 'dashboard_activity', 'Debe existir internal.dashboard_activity');

SELECT columns_are(
  'internal',
  'dashboard_activity',
  ARRAY[
    'id',
    'user_id',
    'activity_type',
    'title',
    'description',
    'project_owner_username',
    'project_name',
    'analysis_type',
    'design_id',
    'created_at'
  ],
  'internal.dashboard_activity debe tener las columnas esperadas'
);

SELECT col_type_is('internal', 'dashboard_activity', 'id', 'bigint', 'internal.dashboard_activity.id debe ser bigint');
SELECT col_type_is('internal', 'dashboard_activity', 'user_id', 'uuid', 'internal.dashboard_activity.user_id debe ser uuid');
SELECT col_type_is('internal', 'dashboard_activity', 'created_at', 'timestamp with time zone', 'internal.dashboard_activity.created_at debe ser timestamptz');

SELECT has_pk('internal', 'dashboard_activity', 'internal.dashboard_activity debe tener primary key');

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'internal'
      AND tablename = 'dashboard_activity'
      AND policyname = 'dashboard_activity_select_self'
  ),
  'Debe existir la policy dashboard_activity_select_self'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'internal'
      AND indexname = 'idx_internal_dashboard_activity_user_created_at'
  ),
  'Debe existir el indice idx_internal_dashboard_activity_user_created_at'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'internal'
      AND indexname = 'idx_internal_dashboard_activity_project_created_at'
  ),
  'Debe existir el indice idx_internal_dashboard_activity_project_created_at'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name = 'dashboard_activity'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ),
  'authenticated debe poder hacer SELECT sobre internal.dashboard_activity'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name = 'dashboard_activity'
      AND grantee = 'authenticated'
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  ),
  'authenticated no debe poder mutar directamente internal.dashboard_activity'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name = 'dashboard_activity'
      AND grantee = 'service_role'
      AND privilege_type = 'INSERT'
  ),
  'service_role debe poder hacer INSERT sobre internal.dashboard_activity'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name = 'dashboard_activity'
      AND grantee = 'service_role'
      AND privilege_type = 'UPDATE'
  ),
  'service_role debe poder hacer UPDATE sobre internal.dashboard_activity'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'internal'
      AND table_name = 'dashboard_activity'
      AND grantee = 'service_role'
      AND privilege_type = 'DELETE'
  ),
  'service_role debe poder hacer DELETE sobre internal.dashboard_activity'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'internal'
      AND table_name = 'dashboard_activity'
      AND constraint_type = 'FOREIGN KEY'
  ),
  'internal.dashboard_activity debe tener al menos una foreign key'
);

SELECT finish();

ROLLBACK;
