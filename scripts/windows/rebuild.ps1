param([switch]$Portable)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Set-AtomRoot
$envFile = Resolve-AtomEnvFile
Import-AtomEnvFile $envFile
Assert-AtomCommand "docker"

$frontendMode = Get-AtomEnv "ATOM_FRONTEND_MODE" "docker"
$backendBuildTarget = Get-AtomEnv "ATOM_BACKEND_BUILD_TARGET" "backend-analysis"
$composeArgs = Get-AtomComposeBaseArgs -EnvFile $envFile -Portable:$Portable
$composeArgs += @("build", "--no-cache")

switch ($frontendMode) {
    "docker" {
        Invoke-AtomDockerCompose ($composeArgs + @("atom-backend", "atom-worker", "atom-frontend"))
    }
    "local" {
        Invoke-AtomDockerCompose ($composeArgs + @("atom-backend", "atom-worker"))
    }
    default {
        throw "ATOM_FRONTEND_MODE invalido: $frontendMode. Usa 'docker' o 'local'."
    }
}

Write-Host "Imagen backend Docker: $backendBuildTarget"
Write-Host "Imagenes reconstruidas."
