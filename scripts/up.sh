#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${ATOM_PORT:-8080}"

docker compose up --build -d

echo "Servidor levantado en http://127.0.0.1:${PORT}"
echo "Logs: ./scripts/logs.sh"
