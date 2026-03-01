# Schemas (fuente de verdad de estructura)

Aqui defines la estructura SQL base por schema (tablas, indices, constraints, policies, etc.).

## Recomendacion de organizacion

- `public.sql`: objetos del schema `public`.
- `auth.sql`: extensiones/cambios propios sobre `auth` (solo si aplica).
- `extensions.sql`: extensiones necesarias (`uuid-ossp`, `pgcrypto`, etc.).

## Flujo recomendado

1. Editar SQL en `supabase/schemas/`.
2. Aplicar cambios a la DB local (via SQL/migracion temporal).
3. Generar migracion:
   - `./scripts/supabase-db-diff.sh <nombre_migracion>`
4. Revisar archivo generado en `supabase/migrations/`.

## Nota

`supabase db diff` compara el estado real de la base de datos local con migraciones previas.
Por eso, esta carpeta te sirve como referencia estructurada para diseñar cambios antes de generar la migracion final.
