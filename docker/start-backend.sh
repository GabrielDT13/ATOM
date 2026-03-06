#!/usr/bin/env sh
set -eu

HOST="${BACKEND_HOST:-0.0.0.0}"
PORT="${BACKEND_PORT:-8000}"

if [ "${BACKEND_RELOAD:-false}" = "true" ]; then
  exec uvicorn backend.app.main:app --host "$HOST" --port "$PORT" --reload
fi

exec uvicorn backend.app.main:app --host "$HOST" --port "$PORT"
