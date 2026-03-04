# ATOM - Next.js + FastAPI con Docker + Supabase

Este proyecto se ejecuta en local con dos contenedores: `FastAPI` para backend y `Next.js` para frontend. Asi evitas instalar dependencias de Python, Node o R manualmente en tu maquina.

## Requisitos

- Docker Desktop instalado y ejecutandose.
- `docker compose` disponible.

Comprobacion rapida:

```bash
docker --version
docker compose version
```

## Estructura relevante

- `backend/`: backend modular en FastAPI.
- `frontend/`: frontend en Next.js con TypeScript.
- `docker/Dockerfile`: imagen del backend con Python, R, Pandoc y dependencias del sistema.
- `docker/frontend.Dockerfile`: imagen del frontend con Node.js.
- `docker/install_r_packages.R`: instalacion de paquetes R/bioconductor.
- `docker-compose.yml`: servicios `atom-backend` y `atom-frontend`.
- `.env.example`: plantilla de variables de entorno.
- `.env.local`: variables locales reales (no versionadas).
- `supabase/`: modulo de Supabase (schemas, migrations, functions, seeds, tests, config).
- `scripts/up.sh`: levanta el servidor.
- `scripts/down.sh`: detiene el servidor y el stack de Supabase CLI.
- `scripts/logs.sh`: muestra logs en tiempo real.
- `scripts/rebuild.sh`: reconstruye la imagen sin cache.
- `run-local.sh` y `stop-local.sh`: alias de compatibilidad.

## Variables de entorno

1. Copia la plantilla:

```bash
cp .env.example .env.local
```

2. Edita `.env.local` con los valores que necesites.

> Los scripts usan `.env.local` por defecto. Si no existe, usan `.env`.

## Levantar el servidor en local

Desde la raiz del proyecto:

```bash
./scripts/up.sh
```

Servicios disponibles en:

- `http://localhost:3000` (frontend Next.js)
- `http://localhost:8000` (API FastAPI, acceso directo opcional)
- `http://localhost:54323` (Supabase Studio via CLI)

> Puertos por defecto:
> - `3000` (host) -> `3000` (frontend)
> - `8000` (host) -> `8000` (backend)
> - `54323` (host) -> `54323` (Supabase Studio via CLI)

## Comandos utiles

Ver logs:

```bash
./scripts/logs.sh
```

Detener servidor:

```bash
./scripts/down.sh
```

Reconstruir imagen completa (si cambian dependencias):

```bash
./scripts/rebuild.sh
./scripts/up.sh
```

## Cambiar puerto local

Puedes cambiar el puerto del frontend exportando `ATOM_PORT`:

```bash
ATOM_PORT=9090 ./scripts/up.sh
```

Luego abre:

- `http://localhost:9090`

Para cambiar el puerto del backend:

```bash
ATOM_API_PORT=9000 ./scripts/up.sh
```

Si cambias el puerto del backend, exporta tambien la URL publica que debe usar Next.js:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:9000 ATOM_API_PORT=9000 ./scripts/up.sh
```

Para cambiar puertos del stack de Supabase CLI:

```bash
SUPABASE_PORT=154321 SUPABASE_DB_PORT=154322 ./scripts/up.sh
```

## Flujo recomendado

1. `./scripts/up.sh`
2. `./scripts/logs.sh` (en otra terminal)
3. Trabajar normalmente
4. `./scripts/down.sh`

## Supabase modularizado

- `supabase/schemas`: SQL fuente de verdad para tablas/indices/policies.
- `supabase/migrations`: migraciones evolutivas de esquema.
- `supabase/functions`: funciones del proyecto.
- `supabase/seeds`: datos semilla para desarrollo.
- `supabase/tests`: tests SQL e integracion.
- `supabase/config.toml`: configuracion de Supabase CLI para API y seeds.

Ver detalle en `supabase/README.md`.

### Migraciones y seeds con Supabase CLI

`./scripts/up.sh` solo levanta el contenedor de la app.
Antes de eso ejecuta automaticamente `supabase start`.

Para gestionar la base usa directamente Supabase CLI:

```bash
supabase migration up
supabase db reset
```

La API en Docker debe apuntar al gateway de Supabase CLI. En `.env.local`, usa:

```bash
SUPABASE_URL_INTERNAL=http://host.docker.internal:54321
```

El frontend usa por defecto un proxy interno de Next (`/backend-api`) hacia FastAPI para evitar problemas de sesion/cookies entre puertos distintos.

Studio se levanta automaticamente con `supabase start`.

Los seeds estan modularizados en `supabase/seeds/` y `supabase/config.toml` los registra directamente para la CLI.

### Generar migracion con diff

Cuando hayas ajustado el SQL fuente en `supabase/schemas/`, genera migracion con:

```bash
supabase db diff --schema public,internal,app_private,auth --file nombre_migracion
```

Opcional: definir schemas a comparar en `.env.local`:

```bash
SUPABASE_DB_SCHEMAS=public
SUPABASE_DIFF_SCHEMAS=public,internal,app_private,auth
```

## Solucion de problemas

- Si falla la build por paquetes: ejecuta `./scripts/rebuild.sh`.
- Si el puerto esta ocupado: usa `ATOM_PORT=9090 ./scripts/up.sh`.
- Si Docker no responde: reinicia Docker Desktop y vuelve a levantar.
