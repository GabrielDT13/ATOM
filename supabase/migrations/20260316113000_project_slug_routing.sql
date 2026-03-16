CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE OR REPLACE FUNCTION internal.normalize_project_slug_part(raw_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
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
SET search_path = pg_catalog, internal, public
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

GRANT EXECUTE ON FUNCTION internal.normalize_project_slug_part(text) TO service_role;
GRANT EXECUTE ON FUNCTION internal.ensure_project_slug(text, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION app_private.set_project_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, internal, app_private
AS $$
DECLARE
  owner_username text;
BEGIN
  SELECT p.username
  INTO owner_username
  FROM internal.profiles p
  WHERE p.id = NEW.owner_id;

  NEW.slug := internal.ensure_project_slug(
    owner_username,
    NEW.name,
    COALESCE(NEW.id, OLD.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_internal_projects_slug ON internal.projects;
CREATE TRIGGER set_internal_projects_slug
BEFORE INSERT OR UPDATE OF owner_id, name ON internal.projects
FOR EACH ROW
EXECUTE FUNCTION app_private.set_project_slug();

CREATE OR REPLACE FUNCTION public.create_project(
  p_name text,
  p_slug text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT 'draft'
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  owner_username text,
  name text,
  slug text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, internal
AS $$
DECLARE
  created_project_id uuid;
BEGIN
  INSERT INTO internal.projects (owner_id, name, slug, description, status)
  VALUES (auth.uid(), p_name, p_slug, p_description, p_status)
  RETURNING internal.projects.id INTO created_project_id;

  INSERT INTO internal.project_members (project_id, user_id, member_role)
  VALUES (created_project_id, auth.uid(), 'owner')
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET member_role = EXCLUDED.member_role;

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE vw_projects.id = created_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_project(
  p_owner_user_id uuid,
  p_name text,
  p_slug text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  owner_username text,
  name text,
  slug text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, internal
AS $$
DECLARE
  created_project_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.profiles
    WHERE internal.profiles.id = p_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Propietario no encontrado';
  END IF;

  INSERT INTO internal.projects (owner_id, name, slug, description, status)
  VALUES (p_owner_user_id, p_name, p_slug, p_description, p_status)
  RETURNING internal.projects.id INTO created_project_id;

  INSERT INTO internal.project_members (project_id, user_id, member_role)
  VALUES (created_project_id, p_owner_user_id, 'owner')
  ON CONFLICT ON CONSTRAINT project_members_pkey DO UPDATE
  SET member_role = EXCLUDED.member_role;

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE vw_projects.id = created_project_id;
END;
$$;
