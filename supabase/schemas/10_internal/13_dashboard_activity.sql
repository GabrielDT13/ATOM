CREATE TABLE IF NOT EXISTS internal.dashboard_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  project_owner_username text NOT NULL,
  project_name text NOT NULL,
  analysis_type text,
  design_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_dashboard_activity_user_created_at
ON internal.dashboard_activity (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_dashboard_activity_project_created_at
ON internal.dashboard_activity (project_owner_username, project_name, created_at DESC);

ALTER TABLE internal.dashboard_activity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON internal.dashboard_activity FROM PUBLIC, anon, authenticated;

GRANT SELECT ON internal.dashboard_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.dashboard_activity TO service_role;

DROP POLICY IF EXISTS "dashboard_activity_select_self" ON internal.dashboard_activity;
CREATE POLICY "dashboard_activity_select_self"
ON internal.dashboard_activity
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));
