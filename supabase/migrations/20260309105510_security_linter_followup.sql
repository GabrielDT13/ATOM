ALTER FUNCTION app_private.set_updated_at() SET search_path = pg_catalog;
ALTER FUNCTION internal.normalize_department_name(text) SET search_path = pg_catalog;
ALTER FUNCTION internal.normalize_department_slug(text) SET search_path = pg_catalog, internal;

ALTER VIEW public.vw_profiles SET (security_invoker = true);
ALTER VIEW public.vw_departments SET (security_invoker = true);

REVOKE ALL ON TABLE public.vw_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.vw_profiles TO service_role;

DROP POLICY IF EXISTS "roles_no_direct_access" ON internal.roles;
CREATE POLICY "roles_no_direct_access"
ON internal.roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_no_direct_access" ON internal.user_roles;
CREATE POLICY "user_roles_no_direct_access"
ON internal.user_roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
