DO $$
BEGIN
  CREATE TYPE internal.project_member_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DROP VIEW IF EXISTS public.vw_projects_with_users;

ALTER TABLE internal.project_members
  ALTER COLUMN member_role DROP DEFAULT;

ALTER TABLE internal.project_members
  DROP CONSTRAINT IF EXISTS project_members_member_role_check;

ALTER TABLE internal.project_members
  ALTER COLUMN member_role TYPE internal.project_member_role
  USING member_role::text::internal.project_member_role;

ALTER TABLE internal.project_members
  ALTER COLUMN member_role SET DEFAULT 'viewer';

CREATE OR REPLACE FUNCTION public.admin_create_project(
  p_owner_user_id uuid,
  p_name text,
  p_slug text,
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

CREATE OR REPLACE FUNCTION public.admin_update_project(
  p_project_id uuid,
  p_name text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT NULL
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
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE internal.projects
  SET
    name = COALESCE(p_name, internal.projects.name),
    slug = COALESCE(p_slug, internal.projects.slug),
    description = COALESCE(p_description, internal.projects.description),
    status = COALESCE(p_status, internal.projects.status)
  WHERE internal.projects.id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE vw_projects.id = p_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_project(
  p_project_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, internal
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM internal.projects
  WHERE internal.projects.id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_project_member(
  p_project_id uuid,
  p_target_user_id uuid,
  p_member_role text DEFAULT 'viewer'
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_slug text,
  project_status text,
  owner_id uuid,
  owner_username text,
  member_id uuid,
  member_username text,
  member_role text,
  member_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, internal
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_member_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Rol no válido';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.projects
    WHERE internal.projects.id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Proyecto no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.profiles
    WHERE internal.profiles.id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  INSERT INTO internal.project_members (project_id, user_id, member_role)
  VALUES (p_project_id, p_target_user_id, p_member_role::internal.project_member_role)
  ON CONFLICT ON CONSTRAINT project_members_pkey DO UPDATE
  SET member_role = EXCLUDED.member_role;

  RETURN QUERY
  SELECT
    vw.project_id,
    vw.project_name,
    vw.project_slug,
    vw.project_status,
    vw.owner_id,
    vw.owner_username,
    vw.member_id,
    vw.member_username,
    vw.member_role,
    vw.member_created_at
  FROM public.vw_projects_with_users AS vw
  WHERE vw.project_id = p_project_id
    AND vw.member_id = p_target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_project_member(
  p_project_id uuid,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, internal
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM internal.project_members
  WHERE internal.project_members.project_id = p_project_id
    AND internal.project_members.user_id = p_target_user_id
    AND internal.project_members.member_role <> 'owner';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Miembro no encontrado';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transfer_project_ownership(
  p_project_id uuid,
  p_new_owner_user_id uuid,
  p_previous_owner_role text DEFAULT 'editor'
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
  current_owner_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_previous_owner_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Rol no válido para el propietario anterior';
  END IF;

  SELECT internal.projects.owner_id
  INTO current_owner_id
  FROM internal.projects
  WHERE internal.projects.id = p_project_id;

  IF current_owner_id IS NULL THEN
    RAISE EXCEPTION 'Proyecto no encontrado';
  END IF;

  IF current_owner_id = p_new_owner_user_id THEN
    RAISE EXCEPTION 'El usuario seleccionado ya es el propietario';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = p_new_owner_user_id
      AND pm.member_role <> 'owner'
  ) THEN
    RAISE EXCEPTION 'Solo puedes transferir el proyecto a un miembro existente';
  END IF;

  UPDATE internal.projects
  SET owner_id = p_new_owner_user_id
  WHERE internal.projects.id = p_project_id;

  INSERT INTO internal.project_members (project_id, user_id, member_role)
  VALUES (p_project_id, current_owner_id, p_previous_owner_role::internal.project_member_role)
  ON CONFLICT ON CONSTRAINT project_members_pkey DO UPDATE
  SET member_role = EXCLUDED.member_role;

  INSERT INTO internal.project_members (project_id, user_id, member_role)
  VALUES (p_project_id, p_new_owner_user_id, 'owner')
  ON CONFLICT ON CONSTRAINT project_members_pkey DO UPDATE
  SET member_role = EXCLUDED.member_role;

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE vw_projects.id = p_project_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_projects_with_users
WITH (security_invoker = true)
AS
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

REVOKE ALL ON FUNCTION public.admin_create_project(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_project(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_project(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_project_member(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_remove_project_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_transfer_project_ownership(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_project(uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_project(uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_project(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_project_member(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_project_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_transfer_project_ownership(uuid, uuid, text) TO service_role;

REVOKE ALL ON public.vw_projects_with_users FROM PUBLIC;
GRANT SELECT ON public.vw_projects_with_users TO authenticated, service_role;
