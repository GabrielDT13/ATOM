DO $$
BEGIN
  CREATE TYPE internal.project_member_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS internal.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE OR REPLACE FUNCTION internal.normalize_project_slug_part(raw_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT NULLIF(
    trim(
      BOTH '-'
      FROM regexp_replace(
        lower(public.unaccent(COALESCE(trim(raw_value), ''))),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION internal.ensure_project_slug(
  raw_owner_username text,
  raw_project_name text,
  current_project_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path = pg_catalog, internal, public
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
BEGIN
  base_slug := concat_ws(
    '-',
    internal.normalize_project_slug_part(raw_owner_username),
    internal.normalize_project_slug_part(raw_project_name)
  );
  candidate_slug := COALESCE(base_slug, 'project');

  WHILE EXISTS (
    SELECT 1
    FROM internal.projects p
    WHERE p.slug = candidate_slug
      AND (current_project_id IS NULL OR p.id <> current_project_id)
  ) LOOP
    suffix := suffix + 1;
    candidate_slug := format('%s-%s', COALESCE(base_slug, 'project'), suffix);
  END LOOP;

  RETURN candidate_slug;
END;
$$;

CREATE TABLE IF NOT EXISTS internal.project_members (
  project_id uuid NOT NULL REFERENCES internal.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  member_role internal.project_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_projects_owner_id ON internal.projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_internal_project_members_user_id ON internal.project_members (user_id);

ALTER TABLE internal.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.project_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON internal.projects FROM PUBLIC, anon, authenticated;
REVOKE ALL ON internal.project_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON internal.projects TO authenticated;
GRANT SELECT ON internal.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA internal TO service_role;
GRANT EXECUTE ON FUNCTION internal.normalize_project_slug_part(text) TO service_role;
GRANT EXECUTE ON FUNCTION internal.ensure_project_slug(text, text, uuid) TO service_role;

DROP POLICY IF EXISTS "projects_select_member_or_admin" ON internal.projects;
CREATE POLICY "projects_select_member_or_admin"
ON internal.projects
FOR SELECT
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR (SELECT internal.is_admin())
  OR EXISTS (
    SELECT 1
    FROM internal.project_members pm
    WHERE pm.project_id = internal.projects.id
      AND pm.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "projects_insert_owner_or_admin" ON internal.projects;
CREATE POLICY "projects_insert_owner_or_admin"
ON internal.projects
FOR INSERT
TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT internal.is_admin()));

DROP POLICY IF EXISTS "projects_update_owner_or_admin" ON internal.projects;
CREATE POLICY "projects_update_owner_or_admin"
ON internal.projects
FOR UPDATE
TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT internal.is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT internal.is_admin()));

DROP POLICY IF EXISTS "projects_delete_owner_or_admin" ON internal.projects;
CREATE POLICY "projects_delete_owner_or_admin"
ON internal.projects
FOR DELETE
TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT internal.is_admin()));

DROP POLICY IF EXISTS "project_members_select_related_or_admin" ON internal.project_members;
CREATE POLICY "project_members_select_related_or_admin"
ON internal.project_members
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT internal.is_admin())
  OR EXISTS (
    SELECT 1
    FROM internal.project_members current_pm
    WHERE current_pm.project_id = internal.project_members.project_id
      AND current_pm.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM internal.projects p
    WHERE p.id = project_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "profiles_select_self_or_related_or_admin" ON internal.profiles;
CREATE POLICY "profiles_select_self_or_related_or_admin"
ON internal.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (SELECT internal.is_admin())
  OR EXISTS (
    SELECT 1
    FROM internal.project_members viewer_pm
    JOIN internal.project_members target_pm
      ON target_pm.project_id = viewer_pm.project_id
    WHERE viewer_pm.user_id = (SELECT auth.uid())
      AND target_pm.user_id = internal.profiles.id
  )
);

DROP POLICY IF EXISTS "project_members_mutate_owner_or_admin" ON internal.project_members;
DROP POLICY IF EXISTS "project_members_insert_owner_or_admin" ON internal.project_members;
CREATE POLICY "project_members_insert_owner_or_admin"
ON internal.project_members
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT internal.is_admin())
  OR EXISTS (
    SELECT 1
    FROM internal.projects p
    WHERE p.id = project_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "project_members_update_owner_or_admin" ON internal.project_members;
CREATE POLICY "project_members_update_owner_or_admin"
ON internal.project_members
FOR UPDATE
TO authenticated
USING (
  (SELECT internal.is_admin())
  OR EXISTS (
    SELECT 1
    FROM internal.projects p
    WHERE p.id = project_id
      AND p.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT internal.is_admin())
  OR EXISTS (
    SELECT 1
    FROM internal.projects p
    WHERE p.id = project_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "project_members_delete_owner_or_admin" ON internal.project_members;
CREATE POLICY "project_members_delete_owner_or_admin"
ON internal.project_members
FOR DELETE
TO authenticated
USING (
  (SELECT internal.is_admin())
  OR EXISTS (
    SELECT 1
    FROM internal.projects p
    WHERE p.id = project_id
      AND p.owner_id = (SELECT auth.uid())
  )
);
