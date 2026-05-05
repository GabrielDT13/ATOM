ALTER TABLE internal.entities
ADD COLUMN IF NOT EXISTS logo_path text;

CREATE OR REPLACE VIEW public.vw_entities AS
SELECT
  e.id,
  e.name,
  e.slug,
  e.logo_path
FROM internal.entities e;

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
  p.visibility,
  e.logo_path AS entity_logo_path
FROM internal.projects p
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
LEFT JOIN internal.entities e
  ON e.id = p.entity_id;
