drop function if exists "public"."update_my_profile"(p_username text, p_full_name text, p_avatar_url text);

drop function if exists "public"."admin_set_user_role"(p_actor_user_id uuid, p_target_user_id uuid, p_role text);

drop view if exists "public"."vw_profiles";

set check_function_bodies = off;

alter table "internal"."profiles" add column "bio" text;

CREATE OR REPLACE FUNCTION public.update_my_profile(p_username text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_department text DEFAULT NULL::text, p_bio text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, email text, username text, full_name text, avatar_url text, department text, bio text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'internal'
AS $function$
BEGIN
  UPDATE internal.profiles
  SET
    username = COALESCE(NULLIF(trim(p_username), ''), internal.profiles.username),
    full_name = CASE
      WHEN p_full_name IS NULL THEN internal.profiles.full_name
      ELSE NULLIF(trim(p_full_name), '')
    END,
    avatar_url = CASE
      WHEN p_avatar_url IS NULL THEN internal.profiles.avatar_url
      ELSE NULLIF(trim(p_avatar_url), '')
    END,
    department = CASE
      WHEN p_department IS NULL THEN internal.profiles.department
      ELSE internal.ensure_department_name(p_department)
    END,
    bio = CASE
      WHEN p_bio IS NULL THEN internal.profiles.bio
      ELSE internal.normalize_profile_bio(p_bio)
    END
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

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_actor_user_id uuid, p_target_user_id uuid, p_role text)
 RETURNS TABLE(id uuid, email text, username text, full_name text, avatar_url text, department text, bio text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'internal'
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

create or replace view "public"."vw_profiles" as  SELECT id,
    email,
    username,
    full_name,
    avatar_url,
    department,
    bio,
    is_active,
    created_at,
    updated_at,
    ARRAY( SELECT ur.role_id
           FROM internal.user_roles ur
          WHERE (ur.user_id = p.id)
          ORDER BY ur.role_id) AS roles
   FROM internal.profiles p;

ALTER VIEW "public"."vw_profiles" SET (security_invoker = true);

REVOKE ALL ON "public"."vw_profiles" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON "public"."vw_profiles" TO service_role;



  create table "internal"."profile_activity" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "activity_type" text not null,
    "title" text not null,
    "description" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "internal"."profile_activity" enable row level security;


  create table "internal"."profile_preferences" (
    "user_id" uuid not null,
    "email_notifications" boolean not null default true,
    "security_alerts" boolean not null default true,
    "dark_mode" boolean not null default false,
    "interface_language" text not null default 'es'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "internal"."profile_preferences" enable row level security;

CREATE INDEX idx_internal_profile_activity_user_created_at ON internal.profile_activity USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX profile_activity_pkey ON internal.profile_activity USING btree (id);

CREATE UNIQUE INDEX profile_preferences_pkey ON internal.profile_preferences USING btree (user_id);

alter table "internal"."profile_activity" add constraint "profile_activity_pkey" PRIMARY KEY using index "profile_activity_pkey";

alter table "internal"."profile_preferences" add constraint "profile_preferences_pkey" PRIMARY KEY using index "profile_preferences_pkey";

alter table "internal"."profile_activity" add constraint "profile_activity_user_id_fkey" FOREIGN KEY (user_id) REFERENCES internal.profiles(id) ON DELETE CASCADE not valid;

alter table "internal"."profile_activity" validate constraint "profile_activity_user_id_fkey";

alter table "internal"."profile_preferences" add constraint "profile_preferences_interface_language_check" CHECK ((interface_language = ANY (ARRAY['es'::text, 'en'::text]))) not valid;

alter table "internal"."profile_preferences" validate constraint "profile_preferences_interface_language_check";

alter table "internal"."profile_preferences" add constraint "profile_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES internal.profiles(id) ON DELETE CASCADE not valid;

alter table "internal"."profile_preferences" validate constraint "profile_preferences_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION internal.ensure_profile_preferences(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'internal'
AS $function$
BEGIN
  INSERT INTO internal.profile_preferences (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION internal.normalize_profile_bio(raw_bio text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT NULLIF(trim(raw_bio), '');
$function$
;

GRANT EXECUTE ON FUNCTION internal.ensure_profile_preferences(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION internal.normalize_profile_bio(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, uuid, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text, text) TO authenticated, service_role;

grant select on table "internal"."profile_activity" to "authenticated";

grant delete on table "internal"."profile_activity" to "service_role";

grant insert on table "internal"."profile_activity" to "service_role";

grant select on table "internal"."profile_activity" to "service_role";

grant update on table "internal"."profile_activity" to "service_role";

grant select on table "internal"."profile_preferences" to "authenticated";

grant update on table "internal"."profile_preferences" to "authenticated";

grant delete on table "internal"."profile_preferences" to "service_role";

grant insert on table "internal"."profile_preferences" to "service_role";

grant select on table "internal"."profile_preferences" to "service_role";

grant update on table "internal"."profile_preferences" to "service_role";


  create policy "profile_activity_select_self"
  on "internal"."profile_activity"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "profile_preferences_select_self"
  on "internal"."profile_preferences"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "profile_preferences_update_self"
  on "internal"."profile_preferences"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));


CREATE TRIGGER set_internal_profile_preferences_updated_at BEFORE UPDATE ON internal.profile_preferences FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION app_private.sync_auth_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'internal'
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

  INSERT INTO internal.profiles (id, email, username, full_name, avatar_url, department, bio)
  VALUES (
    NEW.id,
    NEW.email,
    derived_username,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    internal.ensure_department_name(NEW.raw_user_meta_data ->> 'department'),
    internal.normalize_profile_bio(NEW.raw_user_meta_data ->> 'bio')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = COALESCE(EXCLUDED.full_name, internal.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, internal.profiles.avatar_url),
    department = COALESCE(EXCLUDED.department, internal.profiles.department),
    bio = COALESCE(EXCLUDED.bio, internal.profiles.bio),
    updated_at = now();

  INSERT INTO internal.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role_id) DO NOTHING;

  PERFORM internal.ensure_profile_preferences(NEW.id);

  RETURN NEW;
END;
$function$
;

create or replace view "public"."vw_profile_activity"
with (security_invoker = true) as
select
    id,
    user_id,
    activity_type,
    title,
    description,
    created_at
from internal.profile_activity pa;

create or replace view "public"."vw_profile_preferences"
with (security_invoker = true) as
select
    user_id,
    email_notifications,
    security_alerts,
    dark_mode,
    interface_language,
    created_at,
    updated_at
from internal.profile_preferences pp;

grant select on table "public"."vw_profile_activity" to "authenticated";
grant select, insert on table "public"."vw_profile_activity" to "service_role";
grant select, update on table "public"."vw_profile_preferences" to "authenticated";
grant select, insert, update on table "public"."vw_profile_preferences" to "service_role";
