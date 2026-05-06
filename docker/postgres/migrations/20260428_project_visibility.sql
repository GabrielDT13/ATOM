ALTER TABLE internal.projects
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

UPDATE internal.projects
SET visibility = 'private'
WHERE visibility IS NULL
   OR visibility NOT IN ('private', 'public');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_visibility_check'
      AND conrelid = 'internal.projects'::regclass
  ) THEN
    ALTER TABLE internal.projects
      ADD CONSTRAINT projects_visibility_check
      CHECK (visibility IN ('private', 'public'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_internal_projects_visibility
  ON internal.projects (visibility);

CREATE OR REPLACE VIEW public.vw_projects AS
SELECT
  p.id,
  p.owner_id,
  owner_profile.username AS owner_username,
  p.name,
  p.slug,
  p.description,
  p.status,
  p.created_at,
  p.updated_at,
  (
    SELECT count(*)
    FROM internal.project_members pm
    WHERE pm.project_id = p.id
  )::bigint AS member_count,
  p.entity_id,
  e.name AS entity_name,
  e.slug AS entity_slug,
  p.visibility
FROM internal.projects p
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
LEFT JOIN internal.entities e
  ON e.id = p.entity_id;
