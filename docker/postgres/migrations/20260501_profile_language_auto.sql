ALTER TABLE internal.profile_preferences
ADD COLUMN IF NOT EXISTS interface_language_auto boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.vw_profile_preferences AS
SELECT
  pp.user_id,
  pp.email_notifications,
  pp.security_alerts,
  pp.dark_mode,
  pp.interface_language,
  pp.interface_language_auto,
  pp.must_change_password,
  pp.welcome_tour_seen,
  pp.created_at,
  pp.updated_at
FROM internal.profile_preferences pp;
