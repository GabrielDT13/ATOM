$ErrorActionPreference = "Stop"

function Get-AtomRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Set-AtomRoot {
    Set-Location (Get-AtomRoot)
}

function Resolve-AtomEnvFile {
    $envFile = $env:ENV_FILE
    if ([string]::IsNullOrWhiteSpace($envFile)) {
        $envFile = ".env.local"
    }

    if (Test-Path -LiteralPath $envFile -PathType Leaf) {
        return $envFile
    }

    if ($envFile -ne ".env" -and (Test-Path -LiteralPath ".env" -PathType Leaf)) {
        return ".env"
    }

    throw "No se encontro archivo de entorno (.env.local o .env)."
}

function Import-AtomEnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) {
            return
        }

        if ($line -notmatch "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") {
            return
        }

        $name = $Matches[1]
        $value = $Matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Get-AtomEnv {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Default
    )

    $value = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $Default
    }

    return $value
}

function Assert-AtomCommand {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name no encontrado en PATH."
    }
}

function Get-AtomComposeBaseArgs {
    param(
        [Parameter(Mandatory = $true)][string]$EnvFile,
        [switch]$Portable
    )

    $composeArgs = @()
    if ($Portable) {
        $composeArgs += @("-f", "docker-compose.yml", "-f", "docker-compose.portable.yml")
    }
    $composeArgs += @("--env-file", $EnvFile)
    return $composeArgs
}

function Invoke-AtomDockerCompose {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

function Get-AtomContainerStatus {
    param([Parameter(Mandatory = $true)][string]$Name)

    $status = & docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $Name 2>$null
    if ($LASTEXITCODE -ne 0) {
        return ""
    }

    return $status
}

function Wait-AtomHealthy {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [int]$Attempts = 60,
        [int]$Seconds = 2
    )

    for ($i = 0; $i -lt $Attempts; $i++) {
        if ((Get-AtomContainerStatus $Name) -eq "healthy") {
            return $true
        }
        Start-Sleep -Seconds $Seconds
    }

    return $false
}
