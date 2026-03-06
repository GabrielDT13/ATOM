#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

python3 -m ruff check backend
python3 -m compileall -q backend/app
python3 -c "from backend.app.main import create_app; app = create_app(); assert app.title == 'ATOM Backend'"
python3 -m pytest backend/tests -q
