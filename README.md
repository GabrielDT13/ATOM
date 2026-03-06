# ATOM - Next.js + FastAPI con Docker + Supabase

El proyecto se ejecuta con `FastAPI` en backend y `Next.js` en frontend. La base mínima de CI valida solo backend y frontend para mantener el pipeline rápido: lint/checks, smoke de imports y tests básicos. Supabase queda fuera del primer workflow y se puede añadir después como etapa separada.

## Requisitos

- Docker Desktop y `docker compose`

## Estructura relevante

- `backend/`: API FastAPI
- `backend/tests/`: tests mínimos de backend para CI
- `frontend/`: app Next.js + TypeScript
- `docker/Dockerfile`: imagen backend
- `docker/frontend.Dockerfile`: imagen frontend
- `docker-compose.yml`: stack local
- `.env.example`: contrato base de variables de entorno
- `scripts/up.sh`: levanta Supabase CLI y los contenedores de app
- `scripts/down.sh`: detiene stack local
- `scripts/rebuild.sh`: reconstruye imágenes
- `scripts/test.sh`: comando central para lanzar todos los checks
- `scripts/checks/`: checks internos agrupados por dominio

## Variables de entorno

1. Copia la plantilla:

```bash
cp .env.example .env.local
```

2. Edita `.env.local` con tus valores reales.

Los scripts usan `.env.local` por defecto. Si no existe, usan `.env`.

Variables base:

- `ATOM_PORT`: puerto publicado del frontend
- `ATOM_API_PORT`: puerto publicado del backend
- `BACKEND_HOST` y `BACKEND_PORT`: host/puerto internos del proceso `uvicorn`
- `BACKEND_RELOAD`: activa recarga en local dentro del contenedor
- `FRONTEND_URL`: origen permitido por CORS y sesiones
- `SESSION_SECRET`: clave de sesión del backend
- `NEXT_PUBLIC_API_BASE_URL`: base pública que usa el frontend
- `BACKEND_INTERNAL_URL`: URL interna para el rewrite de Next.js hacia FastAPI

Overrides opcionales para tests o ejecuciones aisladas:

- `ATOM_PROJECT_ROOT`
- `ATOM_DATA_DIR`
- `ATOM_PROJECTS_DIR`
- `ATOM_R_SCRIPTS_DIR`

## Levantar el proyecto en local

```bash
./scripts/up.sh
```

Servicios por defecto:

- `http://localhost:3000` frontend
- `http://localhost:8000` backend
- `http://localhost:54323` Supabase Studio

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
./scripts/test.sh supabase
```

Si además quieres incluir los tests SQL de Supabase en la misma ejecución:

```bash
./scripts/test.sh --with-supabase
```

`./scripts/test.sh` es el punto de entrada recomendado para trabajo diario y para CI. Por debajo llama a checks internos agrupados en `scripts/checks/`, pero la interfaz pública es una sola.

Checks actuales:

- `ruff`
- `compileall` para detectar errores de import/sintaxis
- smoke import de la app FastAPI
- `pytest` sobre `backend/tests`
- `npm run lint`
- `npm run build`
- `supabase db test`

`docker/backend-ci.Dockerfile` es una imagen ligera pensada solo para lint y tests del backend. No instala R ni dependencias pesadas de runtime.

## CI mínimo

El workflow está en `.github/workflows/ci.yml` y se lanza en cada `push` y `pull_request`.

Jobs actuales:

- `backend`: construye la imagen de checks backend y ejecuta lint, smoke de app y tests dentro del contenedor
- `frontend`: construye la imagen frontend y ejecuta typecheck y build dentro del contenedor

Esto deja un baseline estable antes de añadir E2E, integración con Supabase, TDD más profundo o despliegue.

## Supabase

El módulo `supabase/` sigue modularizado para migraciones, seeds y tests SQL. Se mantiene fuera del CI mínimo para no mezclar en el primer paso validaciones de app con validaciones de infraestructura.

Ver detalle en `supabase/README.md`.

## Solución de problemas

- Si cambia una dependencia de Docker: `./scripts/rebuild.sh`
- Si el frontend falla por caché: borra `frontend/.next`
- Si Docker no responde: reinicia Docker Desktop
