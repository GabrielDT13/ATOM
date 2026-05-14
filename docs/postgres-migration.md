# Migracion completada a PostgreSQL directo

## Objetivo

Retirar la dependencia operativa de Supabase CLI, PostgREST y GoTrue, manteniendo FastAPI como unica capa de aplicacion y PostgreSQL como base de datos directa.

## Principio de migracion

No conviene rehacer frontend y backend a la vez. El frontend ya consume `/api/*`, asi que la migracion debe hacerse por debajo del contrato HTTP actual:

1. Mantener las rutas FastAPI.
2. Sustituir el acceso a datos de Supabase por SQL directo.
3. Sustituir GoTrue por auth propio en FastAPI.
4. Reutilizar la semantica de schemas, vistas y seeds del modelo anterior como referencia para reconstruir el contrato SQL.

## Resultado

El proyecto ya no depende de Supabase ni de su estructura de trabajo. El runtime, la autenticacion, los servicios de negocio, los scripts y la validacion operan sobre PostgreSQL directo y Docker.

## Primera base creada en esta fase

Se ha anadido un bootstrap SQL en `docker/postgres/initdb/001_atom_base.sql` que crea:

- `auth.users` y `auth.refresh_tokens`
- `internal.profiles`, `internal.roles`, `internal.user_roles`
- `internal.departments`
- `internal.profile_preferences` e `internal.profile_activity`
- `internal.projects` e `internal.project_members`
- `internal.dashboard_activity`
- vistas `public.vw_*` equivalentes a las usadas hoy por el backend
- datos iniciales para roles, departamentos y usuarios locales

Esto permite empezar a mover la logica del backend sin depender de Supabase CLI.

## Cambios de infraestructura

- Nuevo target Docker configurable mediante `ATOM_BACKEND_BUILD_TARGET`:
  - `backend-base`: runtime principal de FastAPI + PostgreSQL
  - `backend-analysis`: runtime extendido con R/Bioconductor para analisis
- Nueva configuracion de PostgreSQL directo:
  - `DATABASE_URL`
  - `POSTGRES_HOST`
  - `POSTGRES_PORT`
  - `POSTGRES_PORT_HOST`
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
- Nuevo servicio Docker `atom-db`.
- Nuevo helper backend de conexion directa: `backend/app/services/database.py`.
- Nuevo smoke SQL nativo: `docker/postgres/tests/001_schema_smoke.sql`.

## Estado actual del runtime

- `docker compose up` levanta `atom-db`, `atom-backend` y `atom-frontend`.
- El stack local usa por defecto `ATOM_BACKEND_BUILD_TARGET=backend-analysis` para que el runtime analitico y el worker queden disponibles sin comandos extra.
- Si hace falta un arranque mas ligero y sin analitica, se puede forzar manualmente `ATOM_BACKEND_BUILD_TARGET=backend-base`.
- Auth, perfil, departamentos, proyectos y dashboard ya funcionan sobre PostgreSQL directo sin Supabase.

## Orden recomendado para seguir

### Fase 1

- Completada:
- PostgreSQL directo como modo por defecto.
- Infraestructura Docker propia y bootstrap SQL operativo.
- Seeds base y smoke runtime dockerizado validados.

### Fase 2

- Completada para el flujo principal:
- Servicios de backend simplificados para PostgreSQL directo.
- Eliminacion del modo dual de proveedores dentro del backend.
- Rutas FastAPI mantenidas sin cambios para el frontend.

### Fase 3

- Completada para el flujo principal:
- login con verificacion de password en PostgreSQL
- emision de access token y refresh token desde FastAPI
- invalidacion local de refresh tokens
- sesion resuelta por FastAPI sin GoTrue

### Fase 4

- Completada:
- limpieza del modo legacy y eliminacion del runtime anterior
- tests SQL minimos reescritos para PostgreSQL directo
- flujo de validacion unificado dentro de Docker

## Riesgos principales

- El esquema heredado usa semantica de `auth.users` y funciones inspiradas en Supabase.
- La capa analitica en R sigue siendo pesada y requiere una imagen Docker separada.
- Si en el futuro se amplian los tests SQL, conviene mantenerlos alineados con `docker/postgres/initdb/001_atom_base.sql`.

## Decision tecnica

La ruta elegida ha sido migracion por compatibilidad controlada hasta dejar un runtime unico y operativo en Docker con PostgreSQL directo.
