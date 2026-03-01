INSERT INTO internal.projects (id, owner_id, name, slug, description, status)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    'ATOM Admin Setup',
    'atom-admin-setup',
    'Proyecto base gestionado por el administrador local.',
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '22222222-2222-2222-2222-222222222222',
    'ATOM User Workspace',
    'atom-user-workspace',
    'Proyecto de ejemplo para pruebas funcionales.',
    'draft'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO internal.project_members (project_id, user_id, member_role)
VALUES
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', 'editor'),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', 'owner'),
  ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333333', 'viewer')
ON CONFLICT (project_id, user_id) DO UPDATE
SET member_role = EXCLUDED.member_role;
