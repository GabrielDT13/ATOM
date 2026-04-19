INSERT INTO internal.entities (name, slug)
VALUES ('Universidad de La Laguna', 'universidad-de-la-laguna')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;
