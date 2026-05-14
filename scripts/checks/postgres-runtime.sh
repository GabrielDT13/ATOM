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

export ATOM_BACKEND_BUILD_TARGET="${ATOM_BACKEND_BUILD_TARGET:-backend-analysis}"

if [[ -z "${JWT_SECRET:-}" ]]; then
  echo "Falta JWT_SECRET en el archivo de entorno." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" up -d atom-db atom-backend

echo "Esperando a que atom-api este healthy..."
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' atom-api 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' atom-api 2>/dev/null || true)"
if [[ "$status" != "healthy" ]]; then
  echo "atom-api no llego a estado healthy." >&2
  docker compose --env-file "$ENV_FILE" logs --tail=200 atom-db atom-backend >&2 || true
  exit 1
fi

docker exec atom-api python - <<'PY'
import json
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

base_url = "http://127.0.0.1:8000"
jar = CookieJar()
opener = build_opener(HTTPCookieProcessor(jar))

def request_json(path: str, *, method: str = "GET", payload: dict | None = None) -> dict | list:
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(f"{base_url}{path}", data=body, headers=headers, method=method)
    try:
        with opener.open(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        raw = exc.read().decode("utf-8")
        raise SystemExit(f"{path} fallo con {exc.code}: {raw}")

health = request_json("/health")
if health != {"status": "ok"}:
    raise SystemExit(f"/health inesperado: {health}")

login = request_json(
    "/api/auth/login",
    method="POST",
    payload={"email": "admin@atom.local", "password": "Admin123!"},
)
if login.get("authenticated") is not True:
    raise SystemExit(f"/api/auth/login inesperado: {login}")

session = request_json("/api/auth/session")
if session.get("authenticated") is not True:
    raise SystemExit(f"/api/auth/session inesperado: {session}")

profile = request_json("/api/profile/me")
if profile.get("username") != "admin":
    raise SystemExit(f"/api/profile/me inesperado: {profile}")

departments = request_json("/api/departments")
if not isinstance(departments, list) or len(departments) < 1:
    raise SystemExit(f"/api/departments inesperado: {departments}")

dashboard = request_json("/api/dashboard/overview")
if "summary" not in dashboard:
    raise SystemExit(f"/api/dashboard/overview inesperado: {dashboard}")

print("PostgreSQL runtime smoke test OK")
PY
