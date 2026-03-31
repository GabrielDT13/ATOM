DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    CREATE EXTENSION pgtap;
  END IF;
END
$$;

BEGIN;

SELECT plan(5);

SELECT is(
  (SELECT count(*)::int FROM internal.dashboard_activity),
  6,
  'Deben existir 6 eventos de actividad de seed para el dashboard'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM internal.dashboard_activity
    WHERE project_owner_username = 'admin'
      AND project_name = 'ATOM Admin Setup'
      AND activity_type = 'analysis_completed'
      AND analysis_type = 'rna-seq'
  ),
  'Debe existir un evento completado para el proyecto del administrador'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM internal.dashboard_activity
    WHERE project_owner_username = 'manager'
      AND project_name = 'ATOM User Workspace'
      AND activity_type = 'analysis_failed'
      AND analysis_type = 'chip-seq'
  ),
  'Debe existir un evento con incidencia para el proyecto del manager'
);

SELECT ok(
  (
    SELECT count(*)::int
    FROM internal.dashboard_activity
    WHERE activity_type LIKE 'analysis_%'
  ) >= 4,
  'Debe haber al menos 4 eventos de análisis en los seeds'
);

SELECT ok(
  (
    SELECT min(created_at) < max(created_at)
    FROM internal.dashboard_activity
  ),
  'Los seeds de actividad deben cubrir varias fechas'
);

SELECT finish();

ROLLBACK;
