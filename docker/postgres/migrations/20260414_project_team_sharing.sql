CREATE TABLE IF NOT EXISTS internal.project_teams (
  project_id uuid NOT NULL REFERENCES internal.projects (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES internal.teams (id) ON DELETE CASCADE,
  member_role internal.project_member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_project_teams_team_id ON internal.project_teams (team_id);

CREATE OR REPLACE VIEW public.vw_projects_with_users AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  p.status AS project_status,
  owner_profile.id AS owner_id,
  owner_profile.username AS owner_username,
  member_profile.id AS member_id,
  member_profile.username AS member_username,
  pm.member_role::text AS member_role,
  pm.created_at AS member_created_at
FROM internal.projects p
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.project_members pm
  ON pm.project_id = p.id
JOIN internal.profiles member_profile
  ON member_profile.id = pm.user_id;

CREATE OR REPLACE VIEW public.vw_project_teams AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  owner_profile.id AS project_owner_id,
  owner_profile.username AS project_owner_username,
  t.id AS team_id,
  t.name AS team_name,
  t.slug AS team_slug,
  team_owner_profile.id AS team_owner_id,
  team_owner_profile.username AS team_owner_username,
  t.entity_id AS team_entity_id,
  e.name AS team_entity_name,
  e.slug AS team_entity_slug,
  (
    SELECT count(*)
    FROM internal.team_members tm_count
    WHERE tm_count.team_id = t.id
  )::bigint AS team_member_count,
  pt.member_role::text AS member_role,
  pt.created_at AS linked_at
FROM internal.project_teams pt
JOIN internal.projects p
  ON p.id = pt.project_id
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.teams t
  ON t.id = pt.team_id
JOIN internal.profiles team_owner_profile
  ON team_owner_profile.id = t.owner_id
LEFT JOIN internal.entities e
  ON e.id = t.entity_id;

CREATE OR REPLACE VIEW public.vw_project_team_members AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  owner_profile.id AS project_owner_id,
  owner_profile.username AS project_owner_username,
  t.id AS team_id,
  t.name AS team_name,
  t.slug AS team_slug,
  team_owner_profile.id AS team_owner_id,
  team_owner_profile.username AS team_owner_username,
  pt.member_role::text AS project_member_role,
  member_profile.id AS member_id,
  member_profile.username AS member_username,
  tm.member_role::text AS team_member_role,
  pt.created_at AS project_team_created_at,
  tm.created_at AS team_member_created_at
FROM internal.project_teams pt
JOIN internal.projects p
  ON p.id = pt.project_id
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.teams t
  ON t.id = pt.team_id
JOIN internal.profiles team_owner_profile
  ON team_owner_profile.id = t.owner_id
JOIN internal.team_members tm
  ON tm.team_id = t.id
JOIN internal.profiles member_profile
  ON member_profile.id = tm.user_id;
