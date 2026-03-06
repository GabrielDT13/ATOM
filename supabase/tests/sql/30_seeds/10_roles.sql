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
  (SELECT count(*)::int FROM internal.roles),
  2,
  'Debe haber 2 roles base en internal.roles'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM internal.roles
    WHERE id = 'admin'
  ),
  'Debe existir el rol admin'
);

SELECT finish();

ROLLBACK;
