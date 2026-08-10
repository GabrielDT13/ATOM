$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Set-AtomRoot
$envFile = Resolve-AtomEnvFile
Import-AtomEnvFile $envFile
Assert-AtomCommand "npm"

$apiPort = Get-AtomEnv "ATOM_API_PORT" "8000"
$port = Get-AtomEnv "ATOM_PORT" "3000"
$backendInternalUrl = [Environment]::GetEnvironmentVariable("BACKEND_INTERNAL_URL", "Process")
if ([string]::IsNullOrWhiteSpace($backendInternalUrl) -or $backendInternalUrl.StartsWith("http://atom-backend")) {
    [Environment]::SetEnvironmentVariable("BACKEND_INTERNAL_URL", "http://127.0.0.1:$apiPort", "Process")
    $backendInternalUrl = "http://127.0.0.1:$apiPort"
}

Set-Location (Join-Path (Get-AtomRoot) "frontend")

if (-not (Test-Path -LiteralPath "node_modules" -PathType Container)) {
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

Write-Host "Frontend local en http://localhost:$port"
Write-Host "Backend para rewrites SSR: $backendInternalUrl"
npm run dev
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
