#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

INCLUDE_SUPABASE=false
RUN_BACKEND=false
RUN_FRONTEND=false
RUN_ANY_EXPLICIT_TARGET=false

for arg in "$@"; do
  case "$arg" in
    --with-supabase)
      INCLUDE_SUPABASE=true
      ;;
    backend)
      RUN_BACKEND=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    frontend)
      RUN_FRONTEND=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    supabase)
      INCLUDE_SUPABASE=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    all)
      RUN_BACKEND=true
      RUN_FRONTEND=true
      INCLUDE_SUPABASE=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    *)
      echo "Uso: ./scripts/test.sh [backend] [frontend] [supabase] [--with-supabase]" >&2
      exit 1
      ;;
  esac
done

if [[ "$RUN_ANY_EXPLICIT_TARGET" == "false" ]]; then
  RUN_BACKEND=true
  RUN_FRONTEND=true
fi

run_backend() {
  echo "==> Backend"
  docker build -f docker/backend-ci.Dockerfile -t atom-backend-ci .
  docker run --rm atom-backend-ci
}

run_frontend() {
  echo "==> Frontend"
  docker build -f docker/frontend.Dockerfile -t atom-frontend-ci .
  docker run --rm -e NEXT_TELEMETRY_DISABLED=1 atom-frontend-ci /app/scripts/checks/frontend.sh
}

run_supabase() {
  echo "==> Supabase"
  ./scripts/checks/supabase.sh
}

if [[ "$RUN_BACKEND" == "true" ]]; then
  run_backend
fi

if [[ "$RUN_FRONTEND" == "true" ]]; then
  run_frontend
fi

if [[ "$INCLUDE_SUPABASE" == "true" ]]; then
  run_supabase
fi

echo "Todos los checks solicitados han terminado correctamente."
