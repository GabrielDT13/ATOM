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

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PORT="${ATOM_PORT:-3000}"
API_PORT="${ATOM_API_PORT:-8000}"
FRONTEND_MODE="${ATOM_FRONTEND_MODE:-docker}"
BACKEND_BUILD_TARGET="${ATOM_BACKEND_BUILD_TARGET:-backend-analysis}"

case "$FRONTEND_MODE" in
  docker)
    docker compose --env-file "$ENV_FILE" up --build -d --remove-orphans
    echo "Frontend levantado en http://localhost:${PORT}"
    ;;
  local)
    docker compose --env-file "$ENV_FILE" up --build -d --remove-orphans atom-backend
    echo "Frontend en modo local. Ejecuta ./scripts/frontend-local.sh en otra terminal."
    ;;
  *)
    echo "ATOM_FRONTEND_MODE invalido: ${FRONTEND_MODE}. Usa 'docker' o 'local'." >&2
    exit 1
    ;;
esac

echo "Backend API en http://localhost:${API_PORT}"
echo "PostgreSQL directo: postgresql://${POSTGRES_USER:-atom}:${POSTGRES_PASSWORD:-atom}@localhost:${POSTGRES_PORT_HOST:-5432}/${POSTGRES_DB:-atom}"
echo "Imagen backend Docker: ${BACKEND_BUILD_TARGET}"
echo "Logs: ./scripts/logs.sh"
