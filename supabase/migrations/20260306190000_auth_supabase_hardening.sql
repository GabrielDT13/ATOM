set check_function_bodies = off;

drop trigger if exists "on_auth_user_created" on "auth"."users";
drop trigger if exists "on_auth_user_saved" on "auth"."users";
drop function if exists "app_private"."handle_new_auth_user"();

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

  INSERT INTO internal.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    derived_username,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = COALESCE(EXCLUDED.full_name, internal.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, internal.profiles.avatar_url),
    updated_at = now();

  INSERT INTO internal.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_saved
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION app_private.sync_auth_user_profile();

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
$function$;

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
SET search_path TO 'public', 'internal'
AS $function$
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
$function$;

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
SET search_path TO 'public', 'internal'
AS $function$
BEGIN
  UPDATE internal.projects
  SET
    name = COALESCE(p_name, internal.projects.name),
    slug = COALESCE(p_slug, internal.projects.slug),
    description = COALESCE(p_description, internal.projects.description),
    status = COALESCE(p_status, internal.projects.status)
  WHERE internal.projects.id = p_project_id
    AND (
      internal.projects.owner_id = auth.uid()
      OR internal.is_admin()
    );

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE vw_projects.id = p_project_id;
END;
$function$;

ALTER VIEW public.vw_profiles SET (security_invoker = true);
ALTER VIEW public.vw_projects SET (security_invoker = true);
ALTER VIEW public.vw_projects_with_users SET (security_invoker = true);

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change_token_new IS NULL
  OR email_change IS NULL;
