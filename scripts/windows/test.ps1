param(
    [ValidateSet("backend", "frontend", "postgres", "all")]
    [string[]]$Target,
    [switch]$Portable
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Set-AtomRoot
Assert-AtomCommand "docker"

$includePostgresRuntime = $false
$runBackend = $false
$runFrontend = $false
$runAnyExplicitTarget = $false

foreach ($arg in $Target) {
    switch ($arg) {
        "postgres" {
            $includePostgresRuntime = $true
            $runAnyExplicitTarget = $true
        }
        "backend" {
            $runBackend = $true
            $runAnyExplicitTarget = $true
        }
        "frontend" {
            $runFrontend = $true
            $runAnyExplicitTarget = $true
        }
        "all" {
            $runBackend = $true
            $runFrontend = $true
            $includePostgresRuntime = $true
            $runAnyExplicitTarget = $true
        }
    }
}

if (-not $runAnyExplicitTarget) {
    $runBackend = $true
    $runFrontend = $true
}

function Invoke-CheckedCommand {
    param([Parameter(Mandatory = $true)][scriptblock]$Command)

    & $Command
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

function Invoke-BackendChecks {
    Write-Host "==> Backend"
    Invoke-CheckedCommand { docker build -f docker/backend-ci.Dockerfile -t atom-backend-ci . }
    Invoke-CheckedCommand { docker run --rm atom-backend-ci }
}

function Invoke-FrontendChecks {
    Write-Host "==> Frontend"
    Invoke-CheckedCommand { docker build -f docker/frontend.Dockerfile -t atom-frontend-ci . }
    Invoke-CheckedCommand { docker run --rm -e NEXT_TELEMETRY_DISABLED=1 atom-frontend-ci /app/scripts/checks/frontend.sh }
}

function Invoke-PostgresSchemaCheck {
    $envFile = Resolve-AtomEnvFile
    Import-AtomEnvFile $envFile
    $composeArgs = Get-AtomComposeBaseArgs -EnvFile $envFile -Portable:$Portable

    Write-Host "==> PostgreSQL schema"
    Invoke-AtomDockerCompose ($composeArgs + @("up", "-d", "atom-db"))

    Write-Host "Esperando a que atom-db este healthy..."
    if (-not (Wait-AtomHealthy "atom-db")) {
        Write-Error "atom-db no llego a estado healthy."
        $logArgs = $composeArgs + @("logs", "--tail=200", "atom-db")
        & docker compose @logArgs
        exit 1
    }

    Get-Content -LiteralPath "docker/postgres/tests/001_schema_smoke.sql" | docker exec -i atom-db psql -U (Get-AtomEnv "POSTGRES_USER" "atom") -d (Get-AtomEnv "POSTGRES_DB" "atom") -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    Write-Host "PostgreSQL schema smoke test OK"
}

function Invoke-PostgresRuntimeCheck {
    $envFile = Resolve-AtomEnvFile
    Import-AtomEnvFile $envFile
    [Environment]::SetEnvironmentVariable("ATOM_BACKEND_BUILD_TARGET", (Get-AtomEnv "ATOM_BACKEND_BUILD_TARGET" "backend-analysis"), "Process")

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("JWT_SECRET", "Process"))) {
        throw "Falta JWT_SECRET en el archivo de entorno."
    }

    $composeArgs = Get-AtomComposeBaseArgs -EnvFile $envFile -Portable:$Portable

    Write-Host "==> PostgreSQL runtime"
    Invoke-AtomDockerCompose ($composeArgs + @("up", "-d", "atom-db", "atom-backend"))

    Write-Host "Esperando a que atom-api este healthy..."
    if (-not (Wait-AtomHealthy "atom-api")) {
        Write-Error "atom-api no llego a estado healthy."
        $logArgs = $composeArgs + @("logs", "--tail=200", "atom-db", "atom-backend")
        & docker compose @logArgs
        exit 1
    }

    @'
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
'@ | docker exec -i atom-api python -
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

if ($runBackend) {
    Invoke-BackendChecks
}

if ($runFrontend) {
    Invoke-FrontendChecks
}

if ($includePostgresRuntime) {
    Invoke-PostgresSchemaCheck
    Invoke-PostgresRuntimeCheck
}

Write-Host "Todos los checks solicitados han terminado correctamente."
