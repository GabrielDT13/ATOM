CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_username text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  full_name text,
  avatar_url text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  roles text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  UPDATE internal.profiles
  SET
    username = COALESCE(p_username, username),
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url)
  WHERE id = auth.uid();

  RETURN QUERY
  SELECT *
  FROM public.vw_profiles
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project(
  p_name text,
  p_slug text,
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
SET search_path = public, internal
AS $$
DECLARE
  created_project_id uuid;
BEGIN
  INSERT INTO internal.projects (owner_id, name, slug, description, status)
  VALUES (auth.uid(), p_name, p_slug, p_description, p_status)
  RETURNING id INTO created_project_id;

  INSERT INTO internal.project_members (project_id, user_id, member_role)
  VALUES (created_project_id, auth.uid(), 'owner')
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET member_role = EXCLUDED.member_role;

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE id = created_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project(
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
SET search_path = public, internal
AS $$
BEGIN
  UPDATE internal.projects
  SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status)
  WHERE id = p_project_id
    AND (
      owner_id = auth.uid()
      OR internal.is_admin()
    );

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_project(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_project(uuid, text, text, text, text) TO authenticated, service_role;
