CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(2);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'internal'
      AND p.proname = 'has_role'
  ),
  'Debe existir la funcion internal.has_role'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'internal'
      AND p.proname = 'is_admin'
  ),
  'Debe existir la funcion internal.is_admin'
);

SELECT finish();

ROLLBACK;
