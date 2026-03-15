DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(9);

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

SELECT results_eq(
  $$ SELECT department, bio FROM internal.profiles WHERE id = '11111111-1111-1111-1111-111111111111' $$,
  $$ VALUES ('Administración del sistema'::text, 'Responsable de la configuración global, los accesos y la supervisión operativa del entorno ATOM.'::text) $$,
  'El perfil admin de seed debe incluir departamento y biografía'
);

SELECT results_eq(
  $$ SELECT department, bio FROM internal.profiles WHERE id = '33333333-3333-3333-3333-333333333333' $$,
  $$ VALUES ('Genómica clínica'::text, 'Usuario de demostración para validar flujos de perfil, colaboración y actividad reciente.'::text) $$,
  'El perfil userdemo de seed debe incluir departamento y biografía'
);

SELECT is(
  (SELECT count(*)::int FROM internal.profile_preferences),
  3,
  'Deben existir preferencias de perfil para los tres usuarios de seed'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM internal.profile_preferences
    WHERE user_id = '22222222-2222-2222-2222-222222222222'
      AND dark_mode = true
      AND interface_language = 'es'
  ),
  'El usuario manager debe tener preferencias iniciales de seed'
);

SELECT is(
  (SELECT count(*)::int FROM internal.profile_activity),
  3,
  'Deben existir eventos iniciales de actividad para los usuarios de seed'
);

SELECT finish();

ROLLBACK;
