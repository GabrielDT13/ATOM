# ATOM - Ejecucion local con Docker + Supabase

Este proyecto se ejecuta en local dentro de un contenedor Docker para evitar instalar dependencias de Python/R manualmente en tu maquina.

## Requisitos

- Docker Desktop instalado y ejecutandose.
- `docker compose` disponible.

Comprobacion rapida:

```bash
docker --version
docker compose version
```

## Estructura relevante

- `docker/Dockerfile`: imagen con Python, R, Pandoc y dependencias del sistema.
- `docker/install_r_packages.R`: instalacion de paquetes R/bioconductor.
- `docker-compose.yml`: servicios `atom-app` + stack local de Supabase.
- `.env.example`: plantilla de variables de entorno.
- `.env.local`: variables locales reales (no versionadas).
- `supabase/`: modulo de Supabase (init, schemas, migrations, functions, seeds, tests, kong).
- `scripts/up.sh`: levanta el servidor.
- `scripts/down.sh`: detiene el servidor.
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

- `http://127.0.0.1:8080`
- `http://127.0.0.1:54321` (Supabase gateway local)
- `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (Postgres local)
- `http://127.0.0.1:54323` (Supabase Studio)

> Puertos por defecto:
> - `8080` (host) -> `5000` (ATOM)
> - `54321` (host) -> `8000` (Supabase gateway)
> - `54322` (host) -> `5432` (Postgres)
> - `54323` (host) -> `3000` (Supabase Studio)

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

Puedes cambiar el puerto exportando `ATOM_PORT`:

```bash
ATOM_PORT=9090 ./scripts/up.sh
```

Luego abre:

- `http://127.0.0.1:9090`

Para cambiar puertos de Supabase:

```bash
SUPABASE_PORT=154321 SUPABASE_DB_PORT=154322 SUPABASE_STUDIO_PORT=154323 ./scripts/up.sh
```

## Flujo recomendado

1. `./scripts/up.sh`
2. `./scripts/logs.sh` (en otra terminal)
3. Trabajar normalmente
4. `./scripts/down.sh`

## Supabase modularizado

- `supabase/init`: bootstrap inicial de la DB local.
- `supabase/schemas`: SQL fuente de verdad para tablas/indices/policies.
- `supabase/migrations`: migraciones evolutivas de esquema.
- `supabase/functions`: funciones del proyecto.
- `supabase/seeds`: datos semilla para desarrollo.
- `supabase/tests`: tests SQL e integracion.
- `supabase/kong`: rutas del gateway local.

### Para que sirve `init`

- `init` se ejecuta solo cuando el volumen de Postgres esta vacio (primer arranque).
- Se usa para preparar roles/esquema base que necesitan Auth y REST.
- No sustituye a `migrations`: tus cambios de negocio/esquema van en `migrations`.

Ver detalle en `supabase/README.md`.

### Generar migracion con diff

Cuando tengas cambios aplicados en la DB local, genera migracion con:

```bash
./scripts/supabase-db-diff.sh nombre_migracion
```

Opcional: definir schemas a comparar en `.env.local`:

```bash
SUPABASE_DIFF_SCHEMAS=public,auth
```

## Solucion de problemas

- Si falla la build por paquetes: ejecuta `./scripts/rebuild.sh`.
- Si el puerto esta ocupado: usa `ATOM_PORT=9090 ./scripts/up.sh`.
- Si Docker no responde: reinicia Docker Desktop y vuelve a levantar.
