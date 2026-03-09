CREATE TABLE IF NOT EXISTS internal.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_departments_slug ON internal.departments (slug);

CREATE OR REPLACE FUNCTION internal.normalize_department_name(raw_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(regexp_replace(trim(raw_name), '\s+', ' ', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION internal.normalize_department_slug(raw_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, internal
AS $$
  SELECT replace(lower(internal.normalize_department_name(raw_name)), ' ', '-');
$$;

CREATE OR REPLACE FUNCTION internal.ensure_department_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, internal
AS $$
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
$$;

ALTER TABLE internal.departments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON internal.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.departments TO service_role;
GRANT EXECUTE ON FUNCTION internal.normalize_department_name(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.normalize_department_slug(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.ensure_department_name(text) TO service_role;

DROP POLICY IF EXISTS "departments_select_authenticated" ON internal.departments;
CREATE POLICY "departments_select_authenticated"
ON internal.departments
FOR SELECT
TO authenticated
USING (true);
