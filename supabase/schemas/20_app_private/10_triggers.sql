CREATE SCHEMA IF NOT EXISTS app_private;

COMMENT ON SCHEMA app_private IS 'Funciones y triggers internos de base de datos.';

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE OR REPLACE FUNCTION app_private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.sync_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_saved ON auth.users;
CREATE TRIGGER on_auth_user_saved
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION app_private.sync_auth_user_profile();

DROP TRIGGER IF EXISTS set_internal_profiles_updated_at ON internal.profiles;
CREATE TRIGGER set_internal_profiles_updated_at
BEFORE UPDATE ON internal.profiles
FOR EACH ROW
EXECUTE FUNCTION app_private.set_updated_at();

DROP TRIGGER IF EXISTS set_internal_projects_updated_at ON internal.projects;
CREATE TRIGGER set_internal_projects_updated_at
BEFORE UPDATE ON internal.projects
FOR EACH ROW
EXECUTE FUNCTION app_private.set_updated_at();
