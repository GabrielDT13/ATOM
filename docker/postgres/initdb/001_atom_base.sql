CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS internal;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  encrypted_password text NOT NULL,
  raw_app_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  department text,
  bio text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(username) >= 3)
);

CREATE TABLE IF NOT EXISTS internal.roles (
  id text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id IN ('admin', 'user'))
);

CREATE TABLE IF NOT EXISTS internal.user_roles (
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES internal.roles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS internal.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal.profile_preferences (
  user_id uuid PRIMARY KEY REFERENCES internal.profiles (id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  security_alerts boolean NOT NULL DEFAULT true,
  dark_mode boolean NOT NULL DEFAULT false,
  interface_language text NOT NULL DEFAULT 'es',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (interface_language IN ('es', 'en'))
);

CREATE TABLE IF NOT EXISTS internal.profile_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal.dashboard_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  project_owner_username text NOT NULL,
  project_name text NOT NULL,
  analysis_type text,
  design_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  CREATE TYPE internal.project_member_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS internal.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE TABLE IF NOT EXISTS internal.project_members (
  project_id uuid NOT NULL REFERENCES internal.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  member_role internal.project_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS internal.analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES internal.projects (id) ON DELETE CASCADE,
  requested_by_user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'queued',
  total_designs integer NOT NULL DEFAULT 0,
  processed_designs integer NOT NULL DEFAULT 0,
  successful_designs integer NOT NULL DEFAULT 0,
  failed_designs integer NOT NULL DEFAULT 0,
  current_design_id text,
  current_analysis_type text,
  error_message text,
  trigger_source text NOT NULL DEFAULT 'manual',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS internal.analysis_run_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES internal.analysis_runs (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  analysis_type text,
  design_id text,
  current_index integer,
  total_designs integer,
  duration_seconds double precision,
  exit_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_user_roles_role_id ON internal.user_roles (role_id);
CREATE INDEX IF NOT EXISTS idx_internal_profile_activity_user_created_at
  ON internal.profile_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_dashboard_activity_user_created_at
  ON internal.dashboard_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_dashboard_activity_project_created_at
  ON internal.dashboard_activity (project_owner_username, project_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_projects_owner_id ON internal.projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_internal_project_members_user_id ON internal.project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_internal_analysis_runs_project_created_at
  ON internal.analysis_runs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_analysis_runs_status_created_at
  ON internal.analysis_runs (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_internal_analysis_run_logs_run_created_at
  ON internal.analysis_run_logs (run_id, created_at ASC);

CREATE OR REPLACE FUNCTION internal.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION internal.normalize_department_name(raw_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(trim(raw_name), '\s+', ' ', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION internal.normalize_department_slug(raw_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(lower(internal.normalize_department_name(raw_name)), ' ', '-');
$$;

CREATE OR REPLACE FUNCTION internal.normalize_project_slug_part(raw_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(
      BOTH '-'
      FROM regexp_replace(
        lower(public.unaccent(COALESCE(trim(raw_value), ''))),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION internal.ensure_project_slug(
  raw_owner_username text,
  raw_project_name text,
  current_project_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
BEGIN
  base_slug := concat_ws(
    '-',
    internal.normalize_project_slug_part(raw_owner_username),
    internal.normalize_project_slug_part(raw_project_name)
  );
  candidate_slug := COALESCE(base_slug, 'project');

  WHILE EXISTS (
    SELECT 1
    FROM internal.projects p
    WHERE p.slug = candidate_slug
      AND (current_project_id IS NULL OR p.id <> current_project_id)
  ) LOOP
    suffix := suffix + 1;
    candidate_slug := format('%s-%s', COALESCE(base_slug, 'project'), suffix);
  END LOOP;

  RETURN candidate_slug;
END;
$$;

CREATE OR REPLACE FUNCTION internal.sync_profile_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO internal.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url,
    department,
    bio,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), ''), split_part(NEW.email, '@', 1)),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'department'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'bio'), ''),
    NEW.is_active,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    department = EXCLUDED.department,
    bio = EXCLUDED.bio,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  INSERT INTO internal.profile_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_sync_profile ON auth.users;
CREATE TRIGGER trg_auth_users_sync_profile
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION internal.sync_profile_from_auth_user();

DROP TRIGGER IF EXISTS trg_auth_users_updated_at ON auth.users;
CREATE TRIGGER trg_auth_users_updated_at
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON internal.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON internal.profiles
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at();

DROP TRIGGER IF EXISTS trg_profile_preferences_updated_at ON internal.profile_preferences;
CREATE TRIGGER trg_profile_preferences_updated_at
BEFORE UPDATE ON internal.profile_preferences
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON internal.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON internal.projects
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at();

DROP TRIGGER IF EXISTS trg_analysis_runs_updated_at ON internal.analysis_runs;
CREATE TRIGGER trg_analysis_runs_updated_at
BEFORE UPDATE ON internal.analysis_runs
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at();

CREATE OR REPLACE VIEW public.vw_departments AS
SELECT
  d.id,
  d.name,
  d.slug
FROM internal.departments d;

CREATE OR REPLACE VIEW public.vw_profiles AS
SELECT
  p.id,
  p.email,
  p.username,
  p.full_name,
  p.avatar_url,
  p.department,
  p.bio,
  p.is_active,
  p.created_at,
  p.updated_at,
  ARRAY(
    SELECT ur.role_id
    FROM internal.user_roles ur
    WHERE ur.user_id = p.id
    ORDER BY ur.role_id
  ) AS roles
FROM internal.profiles p;

CREATE OR REPLACE VIEW public.vw_projects AS
SELECT
  p.id,
  p.owner_id,
  owner_profile.username AS owner_username,
  p.name,
  p.slug,
  p.description,
  p.status,
  p.created_at,
  p.updated_at,
  (
    SELECT count(*)
    FROM internal.project_members pm
    WHERE pm.project_id = p.id
  )::bigint AS member_count
FROM internal.projects p
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id;

CREATE OR REPLACE VIEW public.vw_projects_with_users AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  p.status AS project_status,
  owner_profile.id AS owner_id,
  owner_profile.username AS owner_username,
  member_profile.id AS member_id,
  member_profile.username AS member_username,
  pm.member_role::text AS member_role,
  pm.created_at AS member_created_at
FROM internal.projects p
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.project_members pm
  ON pm.project_id = p.id
JOIN internal.profiles member_profile
  ON member_profile.id = pm.user_id;

CREATE OR REPLACE VIEW public.vw_profile_preferences AS
SELECT
  pp.user_id,
  pp.email_notifications,
  pp.security_alerts,
  pp.dark_mode,
  pp.interface_language,
  pp.created_at,
  pp.updated_at
FROM internal.profile_preferences pp;

CREATE OR REPLACE VIEW public.vw_profile_activity AS
SELECT
  pa.id,
  pa.user_id,
  pa.activity_type,
  pa.title,
  pa.description,
  pa.created_at
FROM internal.profile_activity pa;

CREATE OR REPLACE VIEW public.vw_dashboard_activity AS
SELECT
  da.id,
  da.user_id,
  da.activity_type,
  da.title,
  da.description,
  da.project_owner_username,
  da.project_name,
  da.analysis_type,
  da.design_id,
  da.created_at
FROM internal.dashboard_activity da;

CREATE OR REPLACE VIEW public.vw_analysis_runs AS
SELECT
  ar.id,
  ar.project_id,
  p.name AS project_name,
  owner_profile.username AS project_owner_username,
  ar.requested_by_user_id,
  requester_profile.username AS requested_by_username,
  ar.status,
  ar.total_designs,
  ar.processed_designs,
  ar.successful_designs,
  ar.failed_designs,
  ar.current_design_id,
  ar.current_analysis_type,
  ar.error_message,
  ar.trigger_source,
  ar.started_at,
  ar.finished_at,
  ar.created_at,
  ar.updated_at
FROM internal.analysis_runs ar
JOIN internal.projects p
  ON p.id = ar.project_id
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.profiles requester_profile
  ON requester_profile.id = ar.requested_by_user_id;

INSERT INTO internal.roles (id, description)
VALUES
  ('admin', 'Administrador global de la aplicacion'),
  ('user', 'Usuario autenticado estandar')
ON CONFLICT (id) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO internal.departments (name, slug)
VALUES
  ('Administracion del sistema', 'administracion-del-sistema'),
  ('Bioinformatica', 'bioinformatica'),
  ('Biologia molecular', 'biologia-molecular'),
  ('Genomica clinica', 'genomica-clinica'),
  ('Investigacion traslacional', 'investigacion-traslacional')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'admin@atom.local',
    crypt('Admin123!', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}',
    '{"username":"admin","full_name":"Admin Local"}'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'manager@atom.local',
    crypt('Manager123!', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}',
    '{"username":"manager","full_name":"Manager Local"}'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'user@atom.local',
    crypt('User123!', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}',
    '{"username":"userdemo","full_name":"User Demo"}'
  )
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

UPDATE internal.profiles
SET
  full_name = 'Admin Local',
  username = 'admin',
  department = 'Administracion del sistema',
  bio = 'Responsable de la configuracion global, los accesos y la supervision operativa del entorno ATOM.'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE internal.profiles
SET
  full_name = 'Manager Local',
  username = 'manager',
  department = 'Bioinformatica',
  bio = 'Coordina analisis, revisiones de resultados y seguimiento tecnico de proyectos compartidos.'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE internal.profiles
SET
  full_name = 'User Demo',
  username = 'userdemo',
  department = 'Genomica clinica',
  bio = 'Usuario de demostracion para validar flujos de perfil, colaboracion y actividad reciente.'
WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO internal.profile_preferences (
  user_id,
  email_notifications,
  security_alerts,
  dark_mode,
  interface_language
)
VALUES
  ('11111111-1111-1111-1111-111111111111', true, true, false, 'es'),
  ('22222222-2222-2222-2222-222222222222', true, true, true, 'es'),
  ('33333333-3333-3333-3333-333333333333', false, true, false, 'es')
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
    'Se completo la configuracion inicial del perfil de administrador.'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'collaboration',
    'Nueva colaboracion',
    'Se asigno una colaboracion activa para revisar resultados del equipo.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'profile_updated',
    'Perfil actualizado',
    'Se guardaron las preferencias iniciales del usuario de demostracion.'
  );

INSERT INTO internal.user_roles (user_id, role_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'user'),
  ('33333333-3333-3333-3333-333333333333', 'user')
ON CONFLICT (user_id, role_id) DO NOTHING;
