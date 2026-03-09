DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(2);

SELECT is(
  (SELECT count(*)::int FROM internal.departments),
  5,
  'Debe haber 5 departamentos base en internal.departments'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM internal.departments
    WHERE slug = 'bioinformática'
  ),
  'Debe existir el departamento Bioinformática'
);

SELECT finish();

ROLLBACK;
