CREATE SCHEMA IF NOT EXISTS internal;

COMMENT ON SCHEMA internal IS 'Tablas reales de negocio no expuestas directamente por la API publica.';

REVOKE ALL ON SCHEMA internal FROM PUBLIC;
GRANT USAGE ON SCHEMA internal TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS internal.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(username) >= 3)
);

CREATE TABLE IF NOT EXISTS internal.roles (
  id text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id IN ('admin', 'user'))
);

CREATE TABLE IF NOT EXISTS internal.user_roles (
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES internal.roles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_user_roles_role_id ON internal.user_roles (role_id);

CREATE OR REPLACE FUNCTION internal.has_role(target_user_id uuid, target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, internal
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM internal.user_roles ur
    WHERE ur.user_id = target_user_id
      AND ur.role_id = target_role
  );
$$;

CREATE OR REPLACE FUNCTION internal.is_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, internal
AS $$
  SELECT internal.has_role(target_user_id, 'admin');
$$;

GRANT EXECUTE ON FUNCTION internal.has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.is_admin(uuid) TO authenticated, service_role;

ALTER TABLE internal.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.user_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON internal.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON internal.roles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON internal.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON internal.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA internal TO service_role;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON internal.profiles;
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON internal.profiles;
DROP POLICY IF EXISTS "profiles_select_self_or_related_or_admin" ON internal.profiles;

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON internal.profiles;
CREATE POLICY "profiles_update_self_or_admin"
ON internal.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT internal.is_admin()))
WITH CHECK (id = (SELECT auth.uid()) OR (SELECT internal.is_admin()));

DROP POLICY IF EXISTS "roles_select_authenticated" ON internal.roles;
DROP POLICY IF EXISTS "roles_no_direct_access" ON internal.roles;
CREATE POLICY "roles_no_direct_access"
ON internal.roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_select_authenticated" ON internal.user_roles;
DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON internal.user_roles;
DROP POLICY IF EXISTS "user_roles_no_direct_access" ON internal.user_roles;
CREATE POLICY "user_roles_no_direct_access"
ON internal.user_roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
