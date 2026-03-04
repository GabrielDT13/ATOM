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

if ! command -v supabase >/dev/null 2>&1; then
  echo "No se encontro Supabase CLI en PATH." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PORT="${ATOM_PORT:-3000}"
API_PORT="${ATOM_API_PORT:-8000}"

supabase start
docker compose --env-file "$ENV_FILE" up --build -d --remove-orphans

echo "Frontend levantado en http://localhost:${PORT}"
echo "Backend API en http://localhost:${API_PORT}"
echo "Supabase CLI (Gateway esperado): http://localhost:${SUPABASE_PORT}"
echo "Supabase CLI (Postgres esperado): postgresql://${SUPABASE_DB_USER}:${SUPABASE_DB_PASSWORD}@localhost:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}"
echo "Supabase Studio: http://localhost:54323"
echo "Logs: ./scripts/logs.sh"
