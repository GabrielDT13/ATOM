create schema if not exists "app_private";

create schema if not exists "internal";


  create table "internal"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "username" text not null,
    "full_name" text,
    "avatar_url" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "internal"."profiles" enable row level security;


  create table "internal"."project_members" (
    "project_id" uuid not null,
    "user_id" uuid not null,
    "member_role" text not null default 'viewer'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "internal"."project_members" enable row level security;


  create table "internal"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null,
    "name" text not null,
    "slug" text not null,
    "description" text,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "internal"."projects" enable row level security;


  create table "internal"."roles" (
    "id" text not null,
    "description" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "internal"."roles" enable row level security;


  create table "internal"."user_roles" (
    "user_id" uuid not null,
    "role_id" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "internal"."user_roles" enable row level security;

CREATE INDEX idx_internal_profiles_username ON internal.profiles USING btree (username);

CREATE INDEX idx_internal_project_members_user_id ON internal.project_members USING btree (user_id);

CREATE INDEX idx_internal_projects_owner_id ON internal.projects USING btree (owner_id);

CREATE INDEX idx_internal_user_roles_role_id ON internal.user_roles USING btree (role_id);

CREATE UNIQUE INDEX profiles_email_key ON internal.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON internal.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON internal.profiles USING btree (username);

CREATE UNIQUE INDEX project_members_pkey ON internal.project_members USING btree (project_id, user_id);

CREATE UNIQUE INDEX projects_pkey ON internal.projects USING btree (id);

CREATE UNIQUE INDEX projects_slug_key ON internal.projects USING btree (slug);

CREATE UNIQUE INDEX roles_pkey ON internal.roles USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON internal.user_roles USING btree (user_id, role_id);

alter table "internal"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "internal"."project_members" add constraint "project_members_pkey" PRIMARY KEY using index "project_members_pkey";

alter table "internal"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "internal"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "internal"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "internal"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "internal"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "internal"."profiles" validate constraint "profiles_id_fkey";

alter table "internal"."profiles" add constraint "profiles_username_check" CHECK ((char_length(username) >= 3)) not valid;

alter table "internal"."profiles" validate constraint "profiles_username_check";

alter table "internal"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "internal"."project_members" add constraint "project_members_member_role_check" CHECK ((member_role = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text]))) not valid;

alter table "internal"."project_members" validate constraint "project_members_member_role_check";

alter table "internal"."project_members" add constraint "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES internal.projects(id) ON DELETE CASCADE not valid;

alter table "internal"."project_members" validate constraint "project_members_project_id_fkey";

alter table "internal"."project_members" add constraint "project_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES internal.profiles(id) ON DELETE CASCADE not valid;

alter table "internal"."project_members" validate constraint "project_members_user_id_fkey";

alter table "internal"."projects" add constraint "projects_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES internal.profiles(id) ON DELETE RESTRICT not valid;

alter table "internal"."projects" validate constraint "projects_owner_id_fkey";

alter table "internal"."projects" add constraint "projects_slug_key" UNIQUE using index "projects_slug_key";

alter table "internal"."projects" add constraint "projects_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))) not valid;

alter table "internal"."projects" validate constraint "projects_status_check";

alter table "internal"."roles" add constraint "roles_id_check" CHECK ((id = ANY (ARRAY['admin'::text, 'user'::text]))) not valid;

alter table "internal"."roles" validate constraint "roles_id_check";

alter table "internal"."user_roles" add constraint "user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES internal.roles(id) ON DELETE RESTRICT not valid;

alter table "internal"."user_roles" validate constraint "user_roles_role_id_fkey";

alter table "internal"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES internal.profiles(id) ON DELETE CASCADE not valid;

alter table "internal"."user_roles" validate constraint "user_roles_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION app_private.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
DECLARE
  derived_username text;
BEGIN
  derived_username := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), ''),
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
    username = COALESCE(internal.profiles.username, EXCLUDED.username),
    full_name = COALESCE(EXCLUDED.full_name, internal.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, internal.profiles.avatar_url),
    updated_at = now();

  INSERT INTO internal.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION app_private.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION internal.has_role(target_user_id uuid, target_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'internal'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM internal.user_roles ur
    WHERE ur.user_id = target_user_id
      AND ur.role_id = target_role
  );
$function$
;

CREATE OR REPLACE FUNCTION internal.is_admin(target_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'internal'
AS $function$
  SELECT internal.has_role(target_user_id, 'admin');
$function$
;

CREATE OR REPLACE FUNCTION public.create_project(p_name text, p_slug text, p_description text DEFAULT NULL::text, p_status text DEFAULT 'draft'::text)
 RETURNS TABLE(id uuid, owner_id uuid, owner_username text, name text, slug text, description text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_my_profile(p_username text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, email text, username text, full_name text, avatar_url text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_project(p_project_id uuid, p_name text DEFAULT NULL::text, p_slug text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, owner_id uuid, owner_username text, name text, slug text, description text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
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
$function$
;

create or replace view "public"."vw_profiles" as  SELECT id,
    email,
    username,
    full_name,
    avatar_url,
    is_active,
    created_at,
    updated_at,
    ARRAY( SELECT ur.role_id
           FROM internal.user_roles ur
          WHERE (ur.user_id = p.id)
          ORDER BY ur.role_id) AS roles
   FROM internal.profiles p;


create or replace view "public"."vw_projects" as  SELECT p.id,
    p.owner_id,
    owner_profile.username AS owner_username,
    p.name,
    p.slug,
    p.description,
    p.status,
    p.created_at,
    p.updated_at,
    ( SELECT count(*) AS count
           FROM internal.project_members pm
          WHERE (pm.project_id = p.id)) AS member_count
   FROM (internal.projects p
     JOIN internal.profiles owner_profile ON ((owner_profile.id = p.owner_id)));


create or replace view "public"."vw_projects_with_users" as  SELECT p.id AS project_id,
    p.name AS project_name,
    p.slug AS project_slug,
    p.status AS project_status,
    owner_profile.id AS owner_id,
    owner_profile.username AS owner_username,
    member_profile.id AS member_id,
    member_profile.username AS member_username,
    pm.member_role,
    pm.created_at AS member_created_at
   FROM (((internal.projects p
     JOIN internal.profiles owner_profile ON ((owner_profile.id = p.owner_id)))
     JOIN internal.project_members pm ON ((pm.project_id = p.id)))
     JOIN internal.profiles member_profile ON ((member_profile.id = pm.user_id)));


grant select on table "internal"."profiles" to "authenticated";

grant update on table "internal"."profiles" to "authenticated";

grant delete on table "internal"."profiles" to "service_role";

grant insert on table "internal"."profiles" to "service_role";

grant select on table "internal"."profiles" to "service_role";

grant update on table "internal"."profiles" to "service_role";

grant delete on table "internal"."project_members" to "authenticated";

grant insert on table "internal"."project_members" to "authenticated";

grant select on table "internal"."project_members" to "authenticated";

grant update on table "internal"."project_members" to "authenticated";

grant delete on table "internal"."project_members" to "service_role";

grant insert on table "internal"."project_members" to "service_role";

grant select on table "internal"."project_members" to "service_role";

grant update on table "internal"."project_members" to "service_role";

grant delete on table "internal"."projects" to "authenticated";

grant insert on table "internal"."projects" to "authenticated";

grant select on table "internal"."projects" to "authenticated";

grant update on table "internal"."projects" to "authenticated";

grant delete on table "internal"."projects" to "service_role";

grant insert on table "internal"."projects" to "service_role";

grant select on table "internal"."projects" to "service_role";

grant update on table "internal"."projects" to "service_role";

grant select on table "internal"."roles" to "authenticated";

grant delete on table "internal"."roles" to "service_role";

grant insert on table "internal"."roles" to "service_role";

grant select on table "internal"."roles" to "service_role";

grant update on table "internal"."roles" to "service_role";

grant select on table "internal"."user_roles" to "authenticated";

grant delete on table "internal"."user_roles" to "service_role";

grant insert on table "internal"."user_roles" to "service_role";

grant select on table "internal"."user_roles" to "service_role";

grant update on table "internal"."user_roles" to "service_role";


  create policy "profiles_select_authenticated"
  on "internal"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "profiles_update_self_or_admin"
  on "internal"."profiles"
  as permissive
  for update
  to authenticated
using (((id = auth.uid()) OR internal.is_admin()))
with check (((id = auth.uid()) OR internal.is_admin()));



  create policy "project_members_mutate_owner_or_admin"
  on "internal"."project_members"
  as permissive
  for all
  to authenticated
using ((internal.is_admin() OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = auth.uid()))))))
with check ((internal.is_admin() OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = auth.uid()))))));



  create policy "project_members_select_related_or_admin"
  on "internal"."project_members"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR internal.is_admin() OR (EXISTS ( SELECT 1
   FROM internal.project_members current_pm
  WHERE ((current_pm.project_id = project_members.project_id) AND (current_pm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM internal.projects p
  WHERE ((p.id = project_members.project_id) AND (p.owner_id = auth.uid()))))));



  create policy "projects_delete_owner_or_admin"
  on "internal"."projects"
  as permissive
  for delete
  to authenticated
using (((owner_id = auth.uid()) OR internal.is_admin()));



  create policy "projects_insert_owner_or_admin"
  on "internal"."projects"
  as permissive
  for insert
  to authenticated
with check (((owner_id = auth.uid()) OR internal.is_admin()));



  create policy "projects_select_member_or_admin"
  on "internal"."projects"
  as permissive
  for select
  to authenticated
using (((owner_id = auth.uid()) OR internal.is_admin() OR (EXISTS ( SELECT 1
   FROM internal.project_members pm
  WHERE ((pm.project_id = projects.id) AND (pm.user_id = auth.uid()))))));



  create policy "projects_update_owner_or_admin"
  on "internal"."projects"
  as permissive
  for update
  to authenticated
using (((owner_id = auth.uid()) OR internal.is_admin()))
with check (((owner_id = auth.uid()) OR internal.is_admin()));



  create policy "roles_select_authenticated"
  on "internal"."roles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "user_roles_select_authenticated"
  on "internal"."user_roles"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER set_internal_profiles_updated_at BEFORE UPDATE ON internal.profiles FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TRIGGER set_internal_projects_updated_at BEFORE UPDATE ON internal.projects FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION app_private.handle_new_auth_user();

