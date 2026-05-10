ALTER TABLE internal.profile_preferences
ADD COLUMN IF NOT EXISTS dark_mode_auto boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.vw_profile_preferences AS
SELECT
  pp.user_id,
  pp.email_notifications,
  pp.security_alerts,
  pp.dark_mode,
  pp.interface_language,
  pp.created_at,
  pp.updated_at,
  pp.must_change_password,
  pp.welcome_tour_seen,
  pp.interface_language_auto,
  pp.dark_mode_auto
FROM internal.profile_preferences pp;
