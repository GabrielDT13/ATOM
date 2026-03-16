INSERT INTO internal.dashboard_activity (
  user_id,
  activity_type,
  title,
  description,
  project_owner_username,
  project_name,
  analysis_type,
  design_id,
  created_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'project_created',
    'Proyecto preparado: ATOM Admin Setup',
    'Se creó el espacio de trabajo inicial para pruebas del administrador local.',
    'admin',
    'ATOM Admin Setup',
    NULL,
    NULL,
    timezone('utc', now()) - interval '18 days'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'analysis_started',
    'Análisis iniciado en ATOM Admin Setup',
    'Se lanzó RNA-seq para el diseño ATOM-RNA-001.',
    'admin',
    'ATOM Admin Setup',
    'rna-seq',
    'ATOM-RNA-001',
    timezone('utc', now()) - interval '7 days'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'analysis_completed',
    'Análisis completado en ATOM Admin Setup',
    'La ejecución RNA-seq para ATOM-RNA-001 terminó y generó resultados HTML.',
    'admin',
    'ATOM Admin Setup',
    'rna-seq',
    'ATOM-RNA-001',
    timezone('utc', now()) - interval '6 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'project_created',
    'Proyecto preparado: ATOM User Workspace',
    'Se registró un espacio de trabajo compartido para validación funcional.',
    'manager',
    'ATOM User Workspace',
    NULL,
    NULL,
    timezone('utc', now()) - interval '12 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'analysis_started',
    'Análisis iniciado en ATOM User Workspace',
    'Se lanzó ChIP-seq para el diseño ATOM-CHIP-002.',
    'manager',
    'ATOM User Workspace',
    'chip-seq',
    'ATOM-CHIP-002',
    timezone('utc', now()) - interval '3 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'analysis_failed',
    'Incidencia en ATOM User Workspace',
    'La ejecución ChIP-seq para ATOM-CHIP-002 finalizó con incidencias.',
    'manager',
    'ATOM User Workspace',
    'chip-seq',
    'ATOM-CHIP-002',
    timezone('utc', now()) - interval '2 days'
  )
ON CONFLICT DO NOTHING;
