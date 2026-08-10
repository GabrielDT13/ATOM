param([switch]$Portable)

$scriptArgs = @()
if ($Portable) {
    $scriptArgs += "-Portable"
}

& "$PSScriptRoot\down.ps1" @scriptArgs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
