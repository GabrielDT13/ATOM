#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

INCLUDE_POSTGRES_RUNTIME=false
RUN_BACKEND=false
RUN_FRONTEND=false
RUN_ANY_EXPLICIT_TARGET=false

for arg in "$@"; do
  case "$arg" in
    postgres)
      INCLUDE_POSTGRES_RUNTIME=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    backend)
      RUN_BACKEND=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    frontend)
      RUN_FRONTEND=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    all)
      RUN_BACKEND=true
      RUN_FRONTEND=true
      INCLUDE_POSTGRES_RUNTIME=true
      RUN_ANY_EXPLICIT_TARGET=true
      ;;
    *)
      echo "Uso: ./scripts/test.sh [backend] [frontend] [postgres] [all]" >&2
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

run_postgres_runtime() {
  echo "==> PostgreSQL schema"
  ./scripts/checks/postgres-schema.sh
  echo "==> PostgreSQL runtime"
  ./scripts/checks/postgres-runtime.sh
}

if [[ "$RUN_BACKEND" == "true" ]]; then
  run_backend
fi

if [[ "$RUN_FRONTEND" == "true" ]]; then
  run_frontend
fi

if [[ "$INCLUDE_POSTGRES_RUNTIME" == "true" ]]; then
  run_postgres_runtime
fi

echo "Todos los checks solicitados han terminado correctamente."
