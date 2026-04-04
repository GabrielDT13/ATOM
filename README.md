# ATOM - Next.js + FastAPI con Docker + PostgreSQL

El proyecto se ejecuta con `FastAPI` en backend y `Next.js` en frontend. La base mínima de CI valida solo backend y frontend para mantener el pipeline rápido: lint/checks, smoke de imports y tests básicos.

## Requisitos

- Docker Desktop y `docker compose`

## Estructura relevante

- `backend/`: API FastAPI
- `backend/tests/`: tests mínimos de backend para CI
- `frontend/`: app Next.js + TypeScript
- `docker/Dockerfile`: imagen backend
- `docker/frontend.Dockerfile`: imagen frontend
- `docker-compose.yml`: stack local
- `docker/postgres/initdb/`: bootstrap SQL de PostgreSQL directo
- `.env.example`: contrato base de variables de entorno
- `scripts/up.sh`: levanta el stack Docker principal
- `scripts/down.sh`: detiene stack local
- `scripts/rebuild.sh`: reconstruye imágenes
- `scripts/test.sh`: comando central para lanzar todos los checks
- `scripts/checks/`: checks internos agrupados por dominio
- `docs/postgres-migration.md`: resumen técnico de la migración completada

## Variables de entorno

1. Copia la plantilla:

```bash
cp .env.example .env.local
```

2. Edita `.env.local` con tus valores reales.

Los scripts usan `.env.local` por defecto. Si no existe, usan `.env`.

Variables base:

- `ATOM_BACKEND_BUILD_TARGET`: `backend-base` para el backend web normal o `backend-analysis` para incluir R y análisis dentro de la imagen
- `ATOM_PORT`: puerto publicado del frontend
- `ATOM_API_PORT`: puerto publicado del backend
- `BACKEND_HOST` y `BACKEND_PORT`: host/puerto internos del proceso `uvicorn`
- `BACKEND_RELOAD`: activa recarga en local dentro del contenedor
- `FRONTEND_URL`: origen permitido por CORS y sesiones
- `SESSION_SECRET`: clave de sesión del backend
- `NEXT_PUBLIC_API_BASE_URL`: base pública que usa el frontend
- `BACKEND_INTERNAL_URL`: URL interna para el rewrite de Next.js hacia FastAPI

Variables nuevas para PostgreSQL directo:

- `DATABASE_URL`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_PORT_HOST`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_AUDIENCE`
- `JWT_SECRET`

Overrides opcionales para tests o ejecuciones aisladas:

- `ATOM_PROJECT_ROOT`
- `ATOM_DATA_DIR`
- `ATOM_PROJECTS_DIR`
- `ATOM_R_SCRIPTS_DIR`

## Levantar el proyecto en local

```bash
./scripts/up.sh
```

Para levantar el stack principal:

```bash
./scripts/up.sh
```

Si Docker no consigue descargar la imagen base del frontend (`node:20-alpine`), puedes seguir trabajando con el frontend fuera de Docker:

```bash
ATOM_FRONTEND_MODE=local ./scripts/rebuild.sh
ATOM_FRONTEND_MODE=local ./scripts/up.sh
./scripts/frontend-local.sh
```

Servicios por defecto:

- `http://localhost:3000` frontend con `.env.example`
- `http://localhost:8080` frontend con el `.env.local` actual del repo
- `http://localhost:8000` backend
- `postgresql://atom:atom@localhost:5432/atom` PostgreSQL directo

Por defecto `docker compose` usa `ATOM_BACKEND_BUILD_TARGET=backend-base`, que arranca rápido y cubre auth, perfil, proyectos, dashboard y demás API web. Si necesitas también el runtime analítico con R dentro de Docker, cambia a:

```bash
ATOM_BACKEND_BUILD_TARGET=backend-analysis ./scripts/up.sh
```

Comandos útiles:

```bash
./scripts/logs.sh
./scripts/down.sh
./scripts/rebuild.sh
```

Cambiar puertos publicados:

```bash
ATOM_PORT=9090 ATOM_API_PORT=9000 ./scripts/up.sh
```

## Checks locales mínimos

Sin instalar Python ni Node en tu máquina:

```bash
./scripts/test.sh
```

Si quieres ejecutar solo una parte:

```bash
./scripts/test.sh backend
./scripts/test.sh frontend
./scripts/test.sh postgres
```

`./scripts/test.sh` es el punto de entrada recomendado para trabajo diario y para CI. Por debajo llama a checks internos agrupados en `scripts/checks/`, pero la interfaz pública es una sola.

Checks actuales:

- `ruff`
- `compileall` para detectar errores de import/sintaxis
- smoke import de la app FastAPI
- `pytest` sobre `backend/tests`
- `npm run lint`
- `npm run build`
- smoke de esquema y runtime dockerizado de PostgreSQL (`./scripts/test.sh postgres`)

`docker/backend-ci.Dockerfile` es una imagen ligera pensada solo para lint y tests del backend. No instala R ni dependencias pesadas de runtime.

`docker/Dockerfile` ahora tiene dos targets:

- `backend-base`: runtime principal para FastAPI + PostgreSQL directo
- `backend-analysis`: runtime extendido con R, Bioconductor y dependencias de análisis

## CI mínimo

El workflow está en `.github/workflows/ci.yml` y se lanza en cada `push` y `pull_request`.

Jobs actuales:

- `backend`: construye la imagen de checks backend y ejecuta lint, smoke de app y tests dentro del contenedor
- `frontend`: construye la imagen frontend y ejecuta typecheck y build dentro del contenedor

Esto deja un baseline estable antes de añadir E2E, TDD más profundo o despliegue.

## Migración a PostgreSQL

Se ha añadido una base inicial reproducible en `docker/postgres/initdb/001_atom_base.sql`.

La cobertura SQL mínima del stack vive en `docker/postgres/tests/001_schema_smoke.sql` y se ejecuta dentro del flujo Docker con `./scripts/test.sh postgres`.

Consulta el plan técnico en `docs/postgres-migration.md`.

## Solución de problemas

- Si cambia una dependencia de Docker: `./scripts/rebuild.sh`
- Si el frontend falla por caché: borra `frontend/.next`
- Si Docker no responde: reinicia Docker Desktop
