DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(3);

SELECT is(
  (SELECT count(*)::int FROM internal.projects),
  2,
  'Debe haber 2 proyectos de seed'
);

SELECT is(
  (SELECT count(*)::int FROM internal.project_members),
  4,
  'Debe haber 4 membresias de seed'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM internal.projects
    WHERE slug = 'atom-admin-setup'
  ),
  'Debe existir el proyecto atom-admin-setup'
);

SELECT finish();

ROLLBACK;
