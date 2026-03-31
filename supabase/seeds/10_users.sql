-- Credenciales dev:
--   admin@atom.local / Admin123!
--   manager@atom.local / Manager123!
--   user@atom.local / User123!

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@atom.local',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"admin","full_name":"Admin Local"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'manager@atom.local',
    crypt('Manager123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"manager","full_name":"Manager Local"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'user@atom.local',
    crypt('User123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"userdemo","full_name":"User Demo"}',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  confirmation_token = EXCLUDED.confirmation_token,
  recovery_token = EXCLUDED.recovery_token,
  email_change_token_new = EXCLUDED.email_change_token_new,
  email_change = EXCLUDED.email_change,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@atom.local"}',
    'email',
    'admin@atom.local',
    now(),
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"manager@atom.local"}',
    'email',
    'manager@atom.local',
    now(),
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"user@atom.local"}',
    'email',
    'user@atom.local',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE
SET
  identity_data = EXCLUDED.identity_data,
  provider_id = EXCLUDED.provider_id,
  last_sign_in_at = EXCLUDED.last_sign_in_at,
  updated_at = now();

UPDATE internal.profiles
SET
  full_name = 'Admin Local',
  username = 'admin',
  department = 'Administración del sistema',
  bio = 'Responsable de la configuración global, los accesos y la supervisión operativa del entorno ATOM.'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE internal.profiles
SET
  full_name = 'Manager Local',
  username = 'manager',
  department = 'Bioinformática',
  bio = 'Coordina análisis, revisiones de resultados y seguimiento técnico de proyectos compartidos.'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE internal.profiles
SET
  full_name = 'User Demo',
  username = 'userdemo',
  department = 'Genómica clínica',
  bio = 'Usuario de demostración para validar flujos de perfil, colaboración y actividad reciente.'
WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO internal.profile_preferences (
  user_id,
  email_notifications,
  security_alerts,
  dark_mode,
  interface_language
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    true,
    true,
    false,
    'es'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    true,
    true,
    true,
    'es'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    false,
    true,
    false,
    'es'
  )
ON CONFLICT (user_id) DO UPDATE
SET
  email_notifications = EXCLUDED.email_notifications,
  security_alerts = EXCLUDED.security_alerts,
  dark_mode = EXCLUDED.dark_mode,
  interface_language = EXCLUDED.interface_language,
  updated_at = now();

INSERT INTO internal.profile_activity (user_id, activity_type, title, description)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'profile_updated',
    'Perfil preparado',
    'Se completó la configuración inicial del perfil de administrador.'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'collaboration',
    'Nueva colaboración',
    'Se asignó una colaboración activa para revisar resultados del equipo.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'profile_updated',
    'Perfil actualizado',
    'Se guardaron las preferencias iniciales del usuario de demostración.'
  );

INSERT INTO internal.user_roles (user_id, role_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin')
ON CONFLICT (user_id, role_id) DO NOTHING;
