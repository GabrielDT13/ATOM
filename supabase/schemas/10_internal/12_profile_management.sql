CREATE OR REPLACE FUNCTION internal.normalize_profile_bio(raw_bio text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(trim(raw_bio), '');
$$;

CREATE TABLE IF NOT EXISTS internal.profile_preferences (
  user_id uuid PRIMARY KEY REFERENCES internal.profiles (id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  security_alerts boolean NOT NULL DEFAULT true,
  dark_mode boolean NOT NULL DEFAULT false,
  interface_language text NOT NULL DEFAULT 'es',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (interface_language IN ('es', 'en'))
);

CREATE TABLE IF NOT EXISTS internal.profile_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES internal.profiles (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_profile_activity_user_created_at
ON internal.profile_activity (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION internal.ensure_profile_preferences(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, internal
AS $$
BEGIN
  INSERT INTO internal.profile_preferences (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

ALTER TABLE internal.profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.profile_activity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON internal.profile_preferences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON internal.profile_activity FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE ON internal.profile_preferences TO authenticated;
GRANT SELECT ON internal.profile_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.profile_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.profile_activity TO service_role;
GRANT EXECUTE ON FUNCTION internal.normalize_profile_bio(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.ensure_profile_preferences(uuid) TO service_role;

DROP POLICY IF EXISTS "profile_preferences_select_self" ON internal.profile_preferences;
CREATE POLICY "profile_preferences_select_self"
ON internal.profile_preferences
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profile_preferences_update_self" ON internal.profile_preferences;
CREATE POLICY "profile_preferences_update_self"
ON internal.profile_preferences
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profile_activity_select_self" ON internal.profile_activity;
CREATE POLICY "profile_activity_select_self"
ON internal.profile_activity
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));
