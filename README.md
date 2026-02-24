# ATOM - Ejecucion local con Docker

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
- `docker-compose.yml`: servicio `atom-app` y mapeo de puertos.
- `scripts/up.sh`: levanta el servidor.
- `scripts/down.sh`: detiene el servidor.
- `scripts/logs.sh`: muestra logs en tiempo real.
- `scripts/rebuild.sh`: reconstruye la imagen sin cache.
- `run-local.sh` y `stop-local.sh`: alias de compatibilidad.

## Levantar el servidor en local

Desde la raiz del proyecto:

```bash
./scripts/up.sh
```

Servidor disponible en:

- `http://127.0.0.1:8080`

> Puerto por defecto: `8080` (host) -> `5000` (contenedor).

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

## Flujo recomendado

1. `./scripts/up.sh`
2. `./scripts/logs.sh` (en otra terminal)
3. Trabajar normalmente
4. `./scripts/down.sh`

## Solucion de problemas

- Si falla la build por paquetes: ejecuta `./scripts/rebuild.sh`.
- Si el puerto esta ocupado: usa `ATOM_PORT=9090 ./scripts/up.sh`.
- Si Docker no responde: reinicia Docker Desktop y vuelve a levantar.
