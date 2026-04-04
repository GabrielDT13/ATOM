#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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

docker compose --env-file "$ENV_FILE" up -d atom-db

echo "Esperando a que atom-db este healthy..."
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' atom-db 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' atom-db 2>/dev/null || true)"
if [[ "$status" != "healthy" ]]; then
  echo "atom-db no llego a estado healthy." >&2
  docker compose --env-file "$ENV_FILE" logs --tail=200 atom-db >&2 || true
  exit 1
fi

docker exec -i atom-db psql \
  -U "${POSTGRES_USER:-atom}" \
  -d "${POSTGRES_DB:-atom}" \
  -v ON_ERROR_STOP=1 < "$ROOT_DIR/docker/postgres/tests/001_schema_smoke.sql"

echo "PostgreSQL schema smoke test OK"
