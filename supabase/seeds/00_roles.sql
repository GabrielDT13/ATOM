INSERT INTO internal.roles (id, description)
VALUES
  ('admin', 'Administrador global de la aplicacion'),
  ('user', 'Usuario autenticado estandar')
ON CONFLICT (id) DO UPDATE
SET description = EXCLUDED.description;
