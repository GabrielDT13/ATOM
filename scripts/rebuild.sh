#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE=".env"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No se encontro archivo de entorno (.env.local o .env)." >&2
  exit 1
fi

FRONTEND_MODE="${ATOM_FRONTEND_MODE:-docker}"
BACKEND_BUILD_TARGET="${ATOM_BACKEND_BUILD_TARGET:-backend-base}"

case "$FRONTEND_MODE" in
  docker)
    docker compose --env-file "$ENV_FILE" build --no-cache atom-backend atom-frontend
    ;;
  local)
    docker compose --env-file "$ENV_FILE" build --no-cache atom-backend
    ;;
  *)
    echo "ATOM_FRONTEND_MODE invalido: ${FRONTEND_MODE}. Usa 'docker' o 'local'." >&2
    exit 1
    ;;
esac

echo "Imagen backend Docker: ${BACKEND_BUILD_TARGET}"
echo "Imagenes reconstruidas."
