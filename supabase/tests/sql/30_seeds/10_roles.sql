CREATE EXTENSION IF NOT EXISTS pgtap;

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
