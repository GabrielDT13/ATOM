COMMENT ON SCHEMA public IS 'Capa publica: vistas de lectura y RPC controladas.';

CREATE OR REPLACE VIEW public.vw_profiles
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.email,
  p.username,
  p.full_name,
  p.avatar_url,
  p.is_active,
  p.created_at,
  p.updated_at,
  ARRAY(
    SELECT ur.role_id
    FROM internal.user_roles ur
    WHERE ur.user_id = p.id
    ORDER BY ur.role_id
  ) AS roles
FROM internal.profiles p;

ALTER VIEW public.vw_profiles SET (security_invoker = true);

CREATE OR REPLACE VIEW public.vw_projects
WITH (security_invoker = true)
AS
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
  )::bigint AS member_count
FROM internal.projects p
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id;

ALTER VIEW public.vw_projects SET (security_invoker = true);

CREATE OR REPLACE VIEW public.vw_projects_with_users
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.slug AS project_slug,
  p.status AS project_status,
  owner_profile.id AS owner_id,
  owner_profile.username AS owner_username,
  member_profile.id AS member_id,
  member_profile.username AS member_username,
  pm.member_role,
  pm.created_at AS member_created_at
FROM internal.projects p
JOIN internal.profiles owner_profile
  ON owner_profile.id = p.owner_id
JOIN internal.project_members pm
  ON pm.project_id = p.id
JOIN internal.profiles member_profile
  ON member_profile.id = pm.user_id;

ALTER VIEW public.vw_projects_with_users SET (security_invoker = true);

GRANT SELECT ON public.vw_profiles TO authenticated, service_role;
GRANT SELECT ON public.vw_projects TO authenticated, service_role;
GRANT SELECT ON public.vw_projects_with_users TO authenticated, service_role;
