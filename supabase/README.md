# Supabase local (modular)

Esta carpeta concentra todo lo relacionado con Supabase en local.

## Estructura

- `init/`: bootstrap de base de datos al primer arranque del volumen.
- `schemas/`: definicion SQL base de tablas/indices/policies.
- `migrations/`: migraciones SQL versionadas del proyecto.
- `functions/`: funciones edge/serverless o funciones SQL auxiliares.
- `seeds/`: datos iniciales para entorno local/dev.
- `tests/`: tests SQL e integracion.
- `kong/`: enrutamiento local hacia `/auth/v1` y `/rest/v1`.

## Diferencia clave: `init` vs `migrations`

- `init`:
  - Se ejecuta solo una vez cuando la DB esta vacia.
  - Prepara roles/esquemas base para que Supabase arranque.
- `migrations`:
  - Son cambios evolutivos del esquema de tu app.
  - Deben poder aplicarse de forma incremental en el tiempo.

## Convencion sugerida

- Migraciones: `migrations/20260225_001_descripcion.sql`
- Seeds: `seeds/20260225_base_data.sql`
- Functions: `functions/<nombre>/...`

## Flujo con `supabase db diff`

1. Diseñar cambios en `schemas/`.
2. Aplicar cambios en DB local.
3. Generar migracion:
   - `./scripts/supabase-db-diff.sh <nombre_migracion>`
4. Revisar archivo en `migrations/`.

Puedes ajustar los schemas de diff con `SUPABASE_DIFF_SCHEMAS` en `.env.local`.
