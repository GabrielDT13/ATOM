param([switch]$Portable)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Set-AtomRoot
$envFile = Resolve-AtomEnvFile
Import-AtomEnvFile $envFile
Assert-AtomCommand "docker"

$composeArgs = Get-AtomComposeBaseArgs -EnvFile $envFile -Portable:$Portable
Invoke-AtomDockerCompose ($composeArgs + @("down", "--remove-orphans"))

Write-Host "Servidor y PostgreSQL detenidos."
