DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(6);

SELECT columns_are(
  'internal',
  'departments',
  ARRAY['id', 'name', 'slug', 'created_at'],
  'internal.departments debe tener las columnas esperadas'
);

SELECT col_type_is('internal', 'departments', 'id', 'uuid', 'internal.departments.id debe ser uuid');
SELECT col_type_is('internal', 'departments', 'name', 'text', 'internal.departments.name debe ser text');
SELECT col_type_is('internal', 'departments', 'slug', 'text', 'internal.departments.slug debe ser text');
SELECT has_pk('internal', 'departments', 'internal.departments debe tener primary key');

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'internal'
      AND indexname = 'idx_internal_departments_slug'
  ),
  'No debe existir el indice redundante idx_internal_departments_slug'
);

SELECT finish();

ROLLBACK;
