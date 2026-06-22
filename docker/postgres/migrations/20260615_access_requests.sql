CREATE TABLE IF NOT EXISTS internal.access_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by_user_id uuid REFERENCES internal.profiles (id) ON DELETE SET NULL,
  approved_user_id uuid REFERENCES internal.profiles (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending', 'approved', 'denied'))
);

CREATE INDEX IF NOT EXISTS idx_internal_access_requests_status_created_at
  ON internal.access_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_access_requests_email
  ON internal.access_requests (lower(email));

ALTER TABLE internal.notifications
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE internal.notifications
ADD CONSTRAINT notifications_notification_type_check
CHECK (
  notification_type IN (
    'analysis_completed',
    'analysis_failed',
    'access_request_created',
    'project_access_changed',
    'project_ownership_transferred',
    'project_shared'
  )
);

DROP TRIGGER IF EXISTS trg_access_requests_updated_at ON internal.access_requests;
CREATE TRIGGER trg_access_requests_updated_at
BEFORE UPDATE ON internal.access_requests
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at();

CREATE OR REPLACE VIEW public.vw_access_requests AS
SELECT
  ar.id,
  ar.full_name,
  ar.email,
  ar.status,
  ar.reviewed_by_user_id,
  reviewer.username AS reviewed_by_username,
  reviewer.full_name AS reviewed_by_display_name,
  ar.approved_user_id,
  approved.username AS approved_username,
  approved.full_name AS approved_display_name,
  ar.reviewed_at,
  ar.created_at,
  ar.updated_at
FROM internal.access_requests ar
LEFT JOIN internal.profiles reviewer
  ON reviewer.id = ar.reviewed_by_user_id
LEFT JOIN internal.profiles approved
  ON approved.id = ar.approved_user_id;
