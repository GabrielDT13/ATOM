CREATE TABLE IF NOT EXISTS internal.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  CREATE TYPE internal.team_member_role AS ENUM ('owner', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

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

CREATE TABLE IF NOT EXISTS internal.project_teams (
  project_id uuid NOT NULL REFERENCES internal.projects (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES internal.teams (id) ON DELETE CASCADE,
  member_role internal.project_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, team_id)
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

CREATE INDEX IF NOT EXISTS idx_internal_profiles_entity_id ON internal.profiles (entity_id);
CREATE INDEX IF NOT EXISTS idx_internal_projects_entity_id ON internal.projects (entity_id);
CREATE INDEX IF NOT EXISTS idx_internal_teams_owner_id ON internal.teams (owner_id);
CREATE INDEX IF NOT EXISTS idx_internal_teams_entity_id ON internal.teams (entity_id);
CREATE INDEX IF NOT EXISTS idx_internal_team_members_user_id ON internal.team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_internal_project_teams_team_id ON internal.project_teams (team_id);

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
  ) AS roles,
  p.entity_id,
  e.name AS entity_name,
  e.slug AS entity_slug
FROM internal.profiles p
LEFT JOIN internal.entities e
  ON e.id = p.entity_id;

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
  )::bigint AS member_count,
  p.entity_id,
  e.name AS entity_name,
  e.slug AS entity_slug
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

INSERT INTO internal.entities (name, slug)
VALUES
  ('Universidad de Las Palmas de Gran Canaria', 'universidad-de-las-palmas-de-gran-canaria'),
  ('Universidad de La Laguna', 'universidad-de-la-laguna'),
  ('Instituto de Investigacion Sanitaria', 'instituto-de-investigacion-sanitaria'),
  ('Centro Nacional de Genomica', 'centro-nacional-de-genomica')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

UPDATE internal.profiles
SET entity_id = internal.ensure_entity('Universidad de Las Palmas de Gran Canaria')
WHERE username = 'admin'
  AND entity_id IS NULL;

UPDATE internal.profiles
SET entity_id = internal.ensure_entity('Instituto de Investigacion Sanitaria')
WHERE username = 'manager'
  AND entity_id IS NULL;

UPDATE internal.profiles
SET entity_id = internal.ensure_entity('Centro Nacional de Genomica')
WHERE username = 'userdemo'
  AND entity_id IS NULL;
