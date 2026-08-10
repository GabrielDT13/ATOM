param([switch]$Portable)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Set-AtomRoot
$envFile = Resolve-AtomEnvFile
Import-AtomEnvFile $envFile
Assert-AtomCommand "docker"

$port = Get-AtomEnv "ATOM_PORT" "3000"
$apiPort = Get-AtomEnv "ATOM_API_PORT" "8000"
$frontendMode = Get-AtomEnv "ATOM_FRONTEND_MODE" "docker"
$backendBuildTarget = Get-AtomEnv "ATOM_BACKEND_BUILD_TARGET" "backend-analysis"
$buildOnUp = Get-AtomEnv "ATOM_BUILD_ON_UP" "false"

$composeUpArgs = @("-d", "--remove-orphans")
if ($buildOnUp -eq "true") {
    $composeUpArgs = @("--build") + $composeUpArgs
}

$composeArgs = Get-AtomComposeBaseArgs -EnvFile $envFile -Portable:$Portable
$composeArgs += @("up") + $composeUpArgs

switch ($frontendMode) {
    "docker" {
        Invoke-AtomDockerCompose $composeArgs
        Write-Host "Frontend levantado en http://localhost:$port"
    }
    "local" {
        Invoke-AtomDockerCompose ($composeArgs + @("atom-backend", "atom-worker"))
        Write-Host "Frontend en modo local. Ejecuta .\scripts\windows\frontend-local.ps1 en otra terminal."
    }
    default {
        throw "ATOM_FRONTEND_MODE invalido: $frontendMode. Usa 'docker' o 'local'."
    }
}

Write-Host "Backend API en http://localhost:$apiPort"
Write-Host "PostgreSQL directo: postgresql://$(Get-AtomEnv "POSTGRES_USER" "atom"):$(Get-AtomEnv "POSTGRES_PASSWORD" "atom")@localhost:$(Get-AtomEnv "POSTGRES_PORT_HOST" "5432")/$(Get-AtomEnv "POSTGRES_DB" "atom")"
Write-Host "Imagen backend Docker: $backendBuildTarget"
Write-Host "Reconstruccion en up: $buildOnUp"
Write-Host "Logs: .\scripts\windows\logs.ps1"
if ($Portable) {
    Write-Host "Modo portable: datos Docker en .\.atom-portable"
}
