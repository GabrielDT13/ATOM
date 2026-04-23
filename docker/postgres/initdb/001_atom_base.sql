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

CREATE TABLE IF NOT EXISTS internal.entities (
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
  must_change_password boolean NOT NULL DEFAULT false,
  welcome_tour_seen boolean NOT NULL DEFAULT true,
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

DO $$
BEGIN
  CREATE TYPE internal.team_member_role AS ENUM ('owner', 'member');
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

CREATE TABLE IF NOT EXISTS internal.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE RESTRICT,
  entity_id uuid REFERENCES internal.entities (id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal.team_members (
  team_id uuid NOT NULL REFERENCES internal.teams (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  member_role internal.team_member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS internal.project_members (
  project_id uuid NOT NULL REFERENCES internal.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  member_role internal.project_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS internal.project_teams (
  project_id uuid NOT NULL REFERENCES internal.projects (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES internal.teams (id) ON DELETE CASCADE,
  member_role internal.project_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, team_id)
);

CREATE TABLE IF NOT EXISTS internal.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES internal.profiles (id) ON DELETE SET NULL,
  project_id uuid REFERENCES internal.projects (id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_label text,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    notification_type IN (
      'analysis_completed',
      'analysis_failed',
      'project_access_changed',
      'project_ownership_transferred',
      'project_shared'
    )
  ),
  CHECK ((is_read = false AND read_at IS NULL) OR is_read = true)
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

ALTER TABLE internal.profiles
  ADD COLUMN IF NOT EXISTS entity_id uuid;

ALTER TABLE internal.projects
  ADD COLUMN IF NOT EXISTS entity_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_entity_id_fkey'
      AND conrelid = 'internal.profiles'::regclass
  ) THEN
    ALTER TABLE internal.profiles
      ADD CONSTRAINT profiles_entity_id_fkey
      FOREIGN KEY (entity_id) REFERENCES internal.entities (id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_entity_id_fkey'
      AND conrelid = 'internal.projects'::regclass
  ) THEN
    ALTER TABLE internal.projects
      ADD CONSTRAINT projects_entity_id_fkey
      FOREIGN KEY (entity_id) REFERENCES internal.entities (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_internal_user_roles_role_id ON internal.user_roles (role_id);
CREATE INDEX IF NOT EXISTS idx_internal_profile_activity_user_created_at
  ON internal.profile_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_dashboard_activity_user_created_at
  ON internal.dashboard_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_dashboard_activity_project_created_at
  ON internal.dashboard_activity (project_owner_username, project_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_user_created_at
  ON internal.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_user_unread_created_at
  ON internal.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_profiles_entity_id ON internal.profiles (entity_id);
CREATE INDEX IF NOT EXISTS idx_internal_projects_owner_id ON internal.projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_internal_projects_entity_id ON internal.projects (entity_id);
CREATE INDEX IF NOT EXISTS idx_internal_project_members_user_id ON internal.project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_internal_project_teams_team_id ON internal.project_teams (team_id);
CREATE INDEX IF NOT EXISTS idx_internal_teams_owner_id ON internal.teams (owner_id);
CREATE INDEX IF NOT EXISTS idx_internal_teams_entity_id ON internal.teams (entity_id);
CREATE INDEX IF NOT EXISTS idx_internal_team_members_user_id ON internal.team_members (user_id);
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

CREATE OR REPLACE FUNCTION internal.normalize_entity_name(raw_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(trim(raw_name), '\s+', ' ', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION internal.normalize_entity_slug(raw_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(lower(internal.normalize_entity_name(raw_name)), ' ', '-');
$$;

CREATE OR REPLACE FUNCTION internal.ensure_entity(raw_name text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_name text;
  normalized_slug text;
  entity_id uuid;
  suffix integer := 1;
BEGIN
  normalized_name := internal.normalize_entity_name(raw_name);
  IF normalized_name IS NULL THEN
    RETURN NULL;
  END IF;

  normalized_slug := COALESCE(internal.normalize_entity_slug(normalized_name), 'entity');

  LOOP
    BEGIN
      INSERT INTO internal.entities (name, slug)
      VALUES (normalized_name, normalized_slug)
      RETURNING id INTO entity_id;
      RETURN entity_id;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT id
        INTO entity_id
        FROM internal.entities
        WHERE name = normalized_name
        LIMIT 1;

        IF entity_id IS NOT NULL THEN
          RETURN entity_id;
        END IF;

        suffix := suffix + 1;
        normalized_slug := format('%s-%s', COALESCE(internal.normalize_entity_slug(normalized_name), 'entity'), suffix);
    END;
  END LOOP;
END;
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

CREATE OR REPLACE FUNCTION internal.ensure_team_slug(
  raw_owner_username text,
  raw_team_name text,
  current_team_id uuid DEFAULT NULL
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
    internal.normalize_project_slug_part(raw_team_name)
  );
  candidate_slug := COALESCE(base_slug, 'team');

  WHILE EXISTS (
    SELECT 1
    FROM internal.teams t
    WHERE t.slug = candidate_slug
      AND (current_team_id IS NULL OR t.id <> current_team_id)
  ) LOOP
    suffix := suffix + 1;
    candidate_slug := format('%s-%s', COALESCE(base_slug, 'team'), suffix);
  END LOOP;

  RETURN candidate_slug;
END;
$$;

CREATE OR REPLACE FUNCTION internal.enforce_team_membership_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  membership_total integer;
BEGIN
  SELECT count(*)
  INTO membership_total
  FROM internal.team_members tm
  WHERE tm.user_id = NEW.user_id
    AND tm.team_id <> NEW.team_id;

  IF membership_total >= 5 THEN
    RAISE EXCEPTION 'Cada usuario solo puede pertenecer a un máximo de 5 equipos';
  END IF;

  RETURN NEW;
END;
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
    entity_id,
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
    internal.ensure_entity(NEW.raw_user_meta_data ->> 'entity_name'),
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
    entity_id = EXCLUDED.entity_id,
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

DROP TRIGGER IF EXISTS trg_teams_updated_at ON internal.teams;
CREATE TRIGGER trg_teams_updated_at
BEFORE UPDATE ON internal.teams
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at();

DROP TRIGGER IF EXISTS trg_team_membership_limit ON internal.team_members;
CREATE TRIGGER trg_team_membership_limit
BEFORE INSERT OR UPDATE OF user_id ON internal.team_members
FOR EACH ROW
EXECUTE FUNCTION internal.enforce_team_membership_limit();

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

CREATE OR REPLACE VIEW public.vw_entities AS
SELECT
  e.id,
  e.name,
  e.slug
FROM internal.entities e;

CREATE OR REPLACE VIEW public.vw_profiles AS
SELECT
  p.id,
  p.email,
  p.username,
  p.full_name,
  p.avatar_url,
  p.entity_id,
  e.name AS entity_name,
  e.slug AS entity_slug,
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
FROM internal.profiles p
LEFT JOIN internal.entities e
  ON e.id = p.entity_id;

CREATE OR REPLACE VIEW public.vw_projects AS
SELECT
  p.id,
  p.owner_id,
  owner_profile.username AS owner_username,
  p.entity_id,
  e.name AS entity_name,
  e.slug AS entity_slug,
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
  ON owner_profile.id = p.owner_id
LEFT JOIN internal.entities e
  ON e.id = p.entity_id;

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

CREATE OR REPLACE VIEW public.vw_project_teams AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  owner_profile.id AS project_owner_id,
  owner_profile.username AS project_owner_username,
  t.id AS team_id,
  t.name AS team_name,
  t.slug AS team_slug,
  team_owner_profile.id AS team_owner_id,
  team_owner_profile.username AS team_owner_username,
  t.entity_id AS team_entity_id,
  e.name AS team_entity_name,
  e.slug AS team_entity_slug,
  (
    SELECT count(*)
    FROM internal.team_members tm_count
    WHERE tm_count.team_id = t.id
  )::bigint AS team_member_count,
  pt.member_role::text AS member_role,
  pt.created_at AS linked_at
FROM internal.project_teams pt
JOIN internal.projects p
  ON p.id = pt.project_id
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.teams t
  ON t.id = pt.team_id
JOIN internal.profiles team_owner_profile
  ON team_owner_profile.id = t.owner_id
LEFT JOIN internal.entities e
  ON e.id = t.entity_id;

CREATE OR REPLACE VIEW public.vw_project_team_members AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  owner_profile.id AS project_owner_id,
  owner_profile.username AS project_owner_username,
  t.id AS team_id,
  t.name AS team_name,
  t.slug AS team_slug,
  team_owner_profile.id AS team_owner_id,
  team_owner_profile.username AS team_owner_username,
  pt.member_role::text AS project_member_role,
  member_profile.id AS member_id,
  member_profile.username AS member_username,
  tm.member_role::text AS team_member_role,
  pt.created_at AS project_team_created_at,
  tm.created_at AS team_member_created_at
FROM internal.project_teams pt
JOIN internal.projects p
  ON p.id = pt.project_id
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.teams t
  ON t.id = pt.team_id
JOIN internal.profiles team_owner_profile
  ON team_owner_profile.id = t.owner_id
JOIN internal.team_members tm
  ON tm.team_id = t.id
JOIN internal.profiles member_profile
  ON member_profile.id = tm.user_id;

CREATE OR REPLACE VIEW public.vw_teams AS
SELECT
  t.id,
  t.owner_id,
  owner_profile.username AS owner_username,
  t.entity_id,
  e.name AS entity_name,
  e.slug AS entity_slug,
  t.name,
  t.slug,
  t.created_at,
  t.updated_at,
  (
    SELECT count(*)
    FROM internal.team_members tm
    WHERE tm.team_id = t.id
  )::bigint AS member_count
FROM internal.teams t
JOIN internal.profiles owner_profile
  ON owner_profile.id = t.owner_id
LEFT JOIN internal.entities e
  ON e.id = t.entity_id;

CREATE OR REPLACE VIEW public.vw_team_members AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  t.slug AS team_slug,
  owner_profile.id AS owner_id,
  owner_profile.username AS owner_username,
  member_profile.id AS member_id,
  member_profile.username AS member_username,
  tm.member_role::text AS member_role,
  tm.created_at AS member_created_at
FROM internal.teams t
JOIN internal.profiles owner_profile
  ON owner_profile.id = t.owner_id
JOIN internal.team_members tm
  ON tm.team_id = t.id
JOIN internal.profiles member_profile
  ON member_profile.id = tm.user_id;

CREATE OR REPLACE VIEW public.vw_profile_preferences AS
SELECT
  pp.user_id,
  pp.email_notifications,
  pp.security_alerts,
  pp.dark_mode,
  pp.interface_language,
  pp.must_change_password,
  pp.welcome_tour_seen,
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

CREATE OR REPLACE VIEW public.vw_notifications AS
SELECT
  n.id,
  n.user_id,
  n.actor_user_id,
  actor_profile.username AS actor_username,
  actor_profile.full_name AS actor_display_name,
  n.project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  owner_profile.username AS project_owner_username,
  n.notification_type,
  n.title,
  n.message,
  n.action_label,
  n.action_url,
  n.is_read,
  n.read_at,
  n.created_at
FROM internal.notifications n
LEFT JOIN internal.profiles actor_profile
  ON actor_profile.id = n.actor_user_id
LEFT JOIN internal.projects p
  ON p.id = n.project_id
LEFT JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id;

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

INSERT INTO internal.entities (name, slug)
VALUES
  ('Universidad de Las Palmas de Gran Canaria', 'universidad-de-las-palmas-de-gran-canaria'),
  ('Universidad de La Laguna', 'universidad-de-la-laguna'),
  ('Instituto de Investigacion Sanitaria', 'instituto-de-investigacion-sanitaria'),
  ('Centro Nacional de Genomica', 'centro-nacional-de-genomica')
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
  entity_id = internal.ensure_entity('Universidad de Las Palmas de Gran Canaria'),
  department = 'Administracion del sistema',
  bio = 'Responsable de la configuracion global, los accesos y la supervision operativa del entorno ATOM.'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE internal.profiles
SET
  full_name = 'Manager Local',
  username = 'manager',
  entity_id = internal.ensure_entity('Instituto de Investigacion Sanitaria'),
  department = 'Bioinformatica',
  bio = 'Coordina analisis, revisiones de resultados y seguimiento tecnico de proyectos compartidos.'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE internal.profiles
SET
  full_name = 'User Demo',
  username = 'userdemo',
  entity_id = internal.ensure_entity('Centro Nacional de Genomica'),
  department = 'Genomica clinica',
  bio = 'Usuario de demostracion para validar flujos de perfil, colaboracion y actividad reciente.'
WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO internal.profile_preferences (
  user_id,
  email_notifications,
  security_alerts,
  dark_mode,
  interface_language,
  must_change_password,
  welcome_tour_seen
)
VALUES
  ('11111111-1111-1111-1111-111111111111', true, true, false, 'es', false, true),
  ('22222222-2222-2222-2222-222222222222', true, true, true, 'es', false, true),
  ('33333333-3333-3333-3333-333333333333', false, true, false, 'es', false, true)
ON CONFLICT (user_id) DO UPDATE
SET
  email_notifications = EXCLUDED.email_notifications,
  security_alerts = EXCLUDED.security_alerts,
  dark_mode = EXCLUDED.dark_mode,
  interface_language = EXCLUDED.interface_language,
  must_change_password = EXCLUDED.must_change_password,
  welcome_tour_seen = EXCLUDED.welcome_tour_seen,
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
