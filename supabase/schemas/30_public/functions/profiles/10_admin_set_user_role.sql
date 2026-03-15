DROP FUNCTION IF EXISTS public.admin_set_user_role(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role text
)
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  full_name text,
  avatar_url text,
  department text,
  bio text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  roles text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, internal
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT internal.is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Rol no válido';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.profiles
    WHERE internal.profiles.id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  DELETE FROM internal.user_roles
  WHERE user_id = p_target_user_id
    AND role_id IN ('admin', 'user');

  INSERT INTO internal.user_roles (user_id, role_id)
  VALUES (p_target_user_id, p_role);

  RETURN QUERY
  SELECT *
  FROM public.vw_profiles
  WHERE vw_profiles.id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, uuid, text) TO service_role;
