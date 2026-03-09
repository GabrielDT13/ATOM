DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(4);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = 'admin@atom.local'
  ),
  'Debe existir el usuario admin de seed'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = 'manager@atom.local'
  ),
  'Debe existir el usuario manager de seed'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = 'user@atom.local'
  ),
  'Debe existir el usuario user de seed'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM internal.user_roles ur
    WHERE ur.user_id = '11111111-1111-1111-1111-111111111111'
      AND ur.role_id = 'admin'
  ),
  'El usuario admin debe tener el rol admin'
);

SELECT finish();

ROLLBACK;
