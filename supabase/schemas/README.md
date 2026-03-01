# Schemas (fuente de verdad de estructura)

Aqui defines la estructura SQL base por schema (tablas, indices, constraints, policies, etc.).

## Recomendacion de organizacion

- `00_extensions/00_public.sql`: extensiones compartidas.
- `10_internal/10_profiles.sql`: perfiles, roles y autorizacion.
- `10_internal/20_projects.sql`: proyectos y membresias.
- `20_app_private/10_triggers.sql`: funciones y triggers internos.
- `30_public/10_views.sql`: vistas expuestas.
- `30_public/20_rpc.sql`: RPC expuestas.

El prefijo numerico fuerza el orden correcto cuando `supabase db diff` reconstruye la base desde `schemas/`.

## Flujo recomendado

1. Editar SQL en `supabase/schemas/`.
2. Aplicar cambios a la DB local (via SQL/migracion temporal).
3. Generar migracion:
   - `supabase db diff --schema public,internal,app_private,auth --file <nombre_migracion>`
4. Revisar archivo generado en `supabase/migrations/`.

## Nota

`supabase db diff` compara el estado real de la base de datos local con migraciones previas.
Por eso, esta carpeta te sirve como referencia estructurada para diseñar cambios antes de generar la migracion final.
