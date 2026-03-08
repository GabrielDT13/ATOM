INSERT INTO internal.departments (name, slug)
VALUES
  ('Administración del sistema', 'administración-del-sistema'),
  ('Bioinformática', 'bioinformática'),
  ('Biología molecular', 'biología-molecular'),
  ('Genómica clínica', 'genómica-clínica'),
  ('Investigación traslacional', 'investigación-traslacional')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;
