# Tests de Supabase

Carpeta para tests de base de datos y flujos relacionados con Supabase.

## Estructura sugerida

- `sql/`: tests SQL (consistencia de tablas, policies, constraints).
- `integration/`: tests de integracion contra endpoints `/rest/v1` y `/auth/v1`.

## Convencion sugerida

- SQL: `sql/test_<dominio>.sql`
- Integracion: `integration/<dominio>.test.(js|ts|py)`
