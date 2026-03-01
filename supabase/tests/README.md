# Tests de Supabase

Carpeta para tests de base de datos y flujos relacionados con Supabase.

## Estructura sugerida

- `sql/`: tests SQL (consistencia de tablas, policies, constraints).
- `integration/`: tests de integracion contra endpoints `/rest/v1` y `/auth/v1`.

## Convencion sugerida

- SQL: `sql/test_<dominio>.sql`
- Integracion: `integration/<dominio>.test.(js|ts|py)`

## Suite actual

- `sql/10_internal/10_schema.sql`: valida el schema y tablas base de identidad.
- `sql/10_internal/20_profiles.sql`: valida columnas, tipos y reglas del bloque de perfiles/roles.
- `sql/10_internal/30_projects.sql`: valida columnas, tipos y policies del bloque de proyectos.
- `sql/10_internal/40_functions.sql`: valida funciones internas de autorizacion.
- `sql/20_public/10_views.sql`: valida vistas expuestas.
- `sql/20_public/20_rpc.sql`: valida RPC y sus firmas de retorno.
- `sql/20_public/30_grants.sql`: valida permisos expuestos en `public`.
- `sql/30_seeds/10_roles.sql`: valida seeds de roles.
- `sql/30_seeds/20_users.sql`: valida seeds de usuarios y rol admin.
- `sql/30_seeds/30_projects.sql`: valida seeds de proyectos y membresias.

## Ejecucion sugerida

Puedes ejecutarlos desde SQL Editor o con `psql` sobre la base local de Supabase CLI. Ejemplo:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/10_internal/10_schema.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/10_internal/20_profiles.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/10_internal/30_projects.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/10_internal/40_functions.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/20_public/10_views.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/20_public/20_rpc.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/20_public/30_grants.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/30_seeds/10_roles.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/30_seeds/20_users.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/sql/30_seeds/30_projects.sql
```

Ejecuta `supabase db reset` antes del test de seeds para asegurar un estado reproducible.
