set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_my_profile(p_username text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, email text, username text, full_name text, avatar_url text, department text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'internal'
AS $function$
BEGIN
  UPDATE internal.profiles
  SET
    username = COALESCE(p_username, internal.profiles.username),
    full_name = COALESCE(p_full_name, internal.profiles.full_name),
    avatar_url = COALESCE(p_avatar_url, internal.profiles.avatar_url)
  WHERE internal.profiles.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.vw_profiles
  WHERE vw_profiles.id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_project(p_project_id uuid, p_name text DEFAULT NULL::text, p_slug text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, owner_id uuid, owner_username text, name text, slug text, description text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'internal'
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado o sin permiso';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.vw_projects
  WHERE vw_projects.id = p_project_id;
END;
$function$
;

drop policy "profiles_select_authenticated" on "internal"."profiles";

drop policy "roles_select_authenticated" on "internal"."roles";

drop policy "user_roles_select_authenticated" on "internal"."user_roles";

revoke update on table "internal"."profiles" from "authenticated";

revoke delete on table "internal"."project_members" from "authenticated";

revoke insert on table "internal"."project_members" from "authenticated";

revoke update on table "internal"."project_members" from "authenticated";

revoke delete on table "internal"."projects" from "authenticated";

revoke insert on table "internal"."projects" from "authenticated";

revoke update on table "internal"."projects" from "authenticated";

revoke select on table "internal"."roles" from "authenticated";

revoke select on table "internal"."user_roles" from "authenticated";


  create policy "profiles_select_self_or_related_or_admin"
  on "internal"."profiles"
  as permissive
  for select
  to authenticated
using (((id = auth.uid()) OR internal.is_admin() OR (EXISTS ( SELECT 1
   FROM (internal.project_members viewer_pm
     JOIN internal.project_members target_pm ON ((target_pm.project_id = viewer_pm.project_id)))
  WHERE ((viewer_pm.user_id = auth.uid()) AND (target_pm.user_id = profiles.id))))));



