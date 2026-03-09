drop function if exists "public"."update_my_profile"(p_username text, p_full_name text, p_avatar_url text);

drop view if exists "public"."vw_profiles";

set check_function_bodies = off;

alter table "internal"."profiles" add column "department" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION app_private.sync_auth_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
DECLARE
  existing_username text;
  derived_username text;
BEGIN
  SELECT p.username
  INTO existing_username
  FROM internal.profiles p
  WHERE p.id = NEW.id;

  derived_username := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), ''),
    NULLIF(existing_username, ''),
    split_part(NEW.email, '@', 1),
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8)
  );

  INSERT INTO internal.profiles (id, email, username, full_name, avatar_url, department)
  VALUES (
    NEW.id,
    NEW.email,
    derived_username,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'department'), '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = COALESCE(EXCLUDED.full_name, internal.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, internal.profiles.avatar_url),
    department = EXCLUDED.department,
    updated_at = now();

  INSERT INTO internal.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

create or replace view "public"."vw_profiles" as  SELECT id,
    email,
    username,
    full_name,
    avatar_url,
    department,
    is_active,
    created_at,
    updated_at,
    ARRAY( SELECT ur.role_id
           FROM internal.user_roles ur
          WHERE (ur.user_id = p.id)
          ORDER BY ur.role_id) AS roles
   FROM internal.profiles p;


CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_actor_user_id uuid, p_target_user_id uuid, p_role text)
 RETURNS TABLE(id uuid, email text, username text, full_name text, avatar_url text, department text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
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
$function$
;

REVOKE ALL ON FUNCTION public.admin_set_user_role(p_actor_user_id uuid, p_target_user_id uuid, p_role text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(p_actor_user_id uuid, p_target_user_id uuid, p_role text) TO service_role;

CREATE OR REPLACE FUNCTION public.update_my_profile(p_username text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, email text, username text, full_name text, avatar_url text, department text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
BEGIN
  UPDATE internal.profiles
  SET
    username = COALESCE(p_username, internal.profiles.username),
    full_name = COALESCE(p_full_name, internal.profiles.full_name),
    avatar_url = COALESCE(p_avatar_url, internal.profiles.avatar_url)
  WHERE internal.profiles.id = auth.uid();

  RETURN QUERY
  SELECT *
  FROM public.vw_profiles
  WHERE vw_profiles.id = auth.uid();
END;
$function$
;
