# Supabase local (modular)

Esta carpeta concentra todo lo relacionado con Supabase en local.

## Estructura

- `schemas/`: definicion SQL base de tablas/indices/policies.
- `migrations/`: migraciones SQL versionadas del proyecto.
- `functions/`: funciones edge/serverless o funciones SQL auxiliares.
- `seeds/`: datos iniciales para entorno local/dev.
- `tests/`: tests SQL e integracion.
- `config.toml`: configuracion de Supabase CLI para exponer API y seeds.

## Diferencia clave: `schemas` vs `migrations`

- `schemas`:
  - Es tu fuente de verdad organizada para diseñar cambios.
  - No se aplica automaticamente por la CLI.
- `migrations`:
  - Son cambios evolutivos del esquema de tu app.
  - Deben poder aplicarse de forma incremental en el tiempo.

## Convencion sugerida

- Migraciones: `migrations/20260225_001_descripcion.sql`
- Seeds: `seeds/20260225_base_data.sql`
- Functions: `functions/<nombre>/...`

## Schemas iniciales propuestos

- `auth`: gestionado por GoTrue para email/password y sesiones.
- `internal`: tablas reales de negocio.
- `app_private`: triggers y funciones internas.
- `public`: vistas de lectura y RPC expuestas.

## Flujo de arranque local

1. `./scripts/up.sh`
2. El script arranca Supabase CLI y luego la app.
3. Usa Supabase CLI para gestionar migraciones y reset:
   - `supabase migration up`
   - `supabase db reset`
4. Usa Studio desde el stack de Supabase CLI.
5. Los seeds estan separados por dominio dentro de `seeds/` (`00_roles.sql`, `10_users.sql`, `20_projects.sql`) y `config.toml` los registra para la CLI.

## Flujo con `supabase db diff`

1. Diseñar cambios en `schemas/` (fuente de verdad).
2. Generar migracion nueva con Supabase CLI:
   - `supabase db diff --schema public,internal,app_private,auth --file <nombre_migracion>`
3. Revisar y limpiar el archivo generado en `migrations/`.
4. Aplicar la migracion con:
   - `supabase migration up`

Puedes ajustar los schemas de diff con `SUPABASE_DIFF_SCHEMAS` en `.env.local`.
