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

if ! command -v npm >/dev/null 2>&1; then
  echo "No se encontro npm en PATH." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

API_PORT="${ATOM_API_PORT:-8000}"
PORT="${ATOM_PORT:-3000}"

if [[ -z "${BACKEND_INTERNAL_URL:-}" || "${BACKEND_INTERNAL_URL}" == http://atom-backend* ]]; then
  export BACKEND_INTERNAL_URL="http://127.0.0.1:${API_PORT}"
fi

cd "$ROOT_DIR/frontend"

if [[ ! -d node_modules ]]; then
  npm ci --no-audit --no-fund
fi

echo "Frontend local en http://localhost:${PORT}"
echo "Backend para rewrites SSR: ${BACKEND_INTERNAL_URL}"
npm run dev
