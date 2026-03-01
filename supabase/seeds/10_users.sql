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
SET full_name = 'Admin Local', username = 'admin'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE internal.profiles
SET full_name = 'Manager Local', username = 'manager'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE internal.profiles
SET full_name = 'User Demo', username = 'userdemo'
WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO internal.user_roles (user_id, role_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin')
ON CONFLICT (user_id, role_id) DO NOTHING;
