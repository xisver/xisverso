[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$Port = 5173)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 24 para ejecutar Xisverso.' }
if (-not (Test-Path -LiteralPath 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
}
& npm.cmd run dev -- --port $Port --strictPort
