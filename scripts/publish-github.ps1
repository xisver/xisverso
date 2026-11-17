[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'Falta GitHub CLI. Instala la herramienta oficial con: winget install --id GitHub.cli --exact. Después ejecuta gh auth login y vuelve a ejecutar este script.'
}
& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Inicia sesión con gh auth login. Este script no extrae ni muestra credenciales.' }
$taskLogin = & gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or $taskLogin.Trim() -ne 'xisver') { throw 'Este proyecto debe publicarse con la cuenta GitHub xisver.' }
$taskStatus = & git status --porcelain
if ($taskStatus) { throw 'Hay cambios pendientes. Revísalos y crea un commit antes de publicar.' }
$taskRepo = & gh repo view xisver/xisverso --json nameWithOwner,url,isPrivate 2>$null
if ($LASTEXITCODE -ne 0) {
    & gh repo create xisver/xisverso --private --description 'Un mundo vivo de mascotas procedurales por XisSoft.'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el repositorio. Revisa la conexión y los permisos de la cuenta.' }
} else {
    $taskMetadata = $taskRepo | ConvertFrom-Json
    if (-not $taskMetadata.isPrivate) { throw 'El repositorio existente es público. Se detuvo la publicación para mantener privada esta primera versión.' }
}
$taskOrigin = & git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    if ($taskOrigin.Trim() -notin @('https://github.com/xisver/xisverso.git','git@github.com:xisver/xisverso.git')) { throw 'El remoto origin apunta a otro repositorio. Revísalo antes de publicar.' }
} else {
    & git remote add origin https://github.com/xisver/xisverso.git
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar el remoto.' }
}
& git push --set-upstream origin main
if ($LASTEXITCODE -ne 0) { throw 'No se pudo subir main. No se ha forzado ni reemplazado el historial remoto.' }
& gh repo view xisver/xisverso --json url,isPrivate
