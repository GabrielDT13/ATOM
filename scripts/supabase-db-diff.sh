#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "No se encontro Supabase CLI. Instalala para usar este script." >&2
  exit 1
fi

MIGRATION_NAME="${1:-}"
if [[ -z "$MIGRATION_NAME" ]]; then
  echo "Uso: ./scripts/supabase-db-diff.sh <nombre_migracion>" >&2
  exit 1
fi

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

SCHEMAS="${SUPABASE_DIFF_SCHEMAS:-public,auth}"

echo "Generando diff para schemas: ${SCHEMAS}"
supabase db diff \
  --schema "${SCHEMAS}" \
  --file "${MIGRATION_NAME}"

echo "Migracion generada en supabase/migrations."
