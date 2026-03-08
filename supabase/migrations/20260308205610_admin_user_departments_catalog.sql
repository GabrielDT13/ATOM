  create table "internal"."departments" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "internal"."departments" enable row level security;

CREATE UNIQUE INDEX departments_name_key ON internal.departments USING btree (name);

CREATE UNIQUE INDEX departments_pkey ON internal.departments USING btree (id);

CREATE UNIQUE INDEX departments_slug_key ON internal.departments USING btree (slug);

CREATE INDEX idx_internal_departments_slug ON internal.departments USING btree (slug);

alter table "internal"."departments" add constraint "departments_pkey" PRIMARY KEY using index "departments_pkey";

alter table "internal"."departments" add constraint "departments_name_key" UNIQUE using index "departments_name_key";

alter table "internal"."departments" add constraint "departments_slug_key" UNIQUE using index "departments_slug_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION internal.ensure_department_name(raw_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'internal'
AS $function$
DECLARE
  normalized_name text;
  normalized_slug text;
  canonical_name text;
BEGIN
  normalized_name := internal.normalize_department_name(raw_name);

  IF normalized_name IS NULL THEN
    RETURN NULL;
  END IF;

  normalized_slug := internal.normalize_department_slug(normalized_name);

  SELECT d.name
  INTO canonical_name
  FROM internal.departments d
  WHERE d.slug = normalized_slug;

  IF canonical_name IS NOT NULL THEN
    RETURN canonical_name;
  END IF;

  INSERT INTO internal.departments (name, slug)
  VALUES (normalized_name, normalized_slug)
  ON CONFLICT (slug) DO UPDATE
  SET name = internal.departments.name
  RETURNING name INTO canonical_name;

  RETURN canonical_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION internal.normalize_department_name(raw_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT NULLIF(regexp_replace(trim(raw_name), '\s+', ' ', 'g'), '');
$function$
;

CREATE OR REPLACE FUNCTION internal.normalize_department_slug(raw_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT replace(lower(internal.normalize_department_name(raw_name)), ' ', '-');
$function$
;

grant select on table "internal"."departments" to "authenticated";

grant delete on table "internal"."departments" to "service_role";

grant insert on table "internal"."departments" to "service_role";

grant select on table "internal"."departments" to "service_role";

grant update on table "internal"."departments" to "service_role";


  create policy "departments_select_authenticated"
  on "internal"."departments"
  as permissive
  for select
  to authenticated
using (true);


create or replace view "public"."vw_departments" as  SELECT id,
    name,
    slug
   FROM internal.departments d;

grant select on table "public"."vw_departments" to "authenticated";

grant select on table "public"."vw_departments" to "service_role";


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
    internal.ensure_department_name(NEW.raw_user_meta_data ->> 'department')
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

