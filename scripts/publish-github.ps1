[CmdletBinding()]
param([ValidateSet('private','public')][string]$Visibility = 'private')
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'Falta GitHub CLI. Instala la herramienta oficial con: winget install --id GitHub.cli --exact. Abre una nueva terminal y ejecuta gh auth login.'
}
& gh auth status --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'Inicia sesión con gh auth login --hostname github.com --git-protocol https.' }
$taskLogin = & gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or $taskLogin.Trim() -ne 'xisver') { throw 'Este proyecto debe publicarse con la cuenta GitHub xisver.' }
$taskBranch = & git symbolic-ref --quiet --short HEAD
if ($LASTEXITCODE -ne 0 -or $taskBranch.Trim() -ne 'main') { throw 'Vuelve a main antes de publicar: git switch main.' }
$taskStatus = & git status --porcelain
if ($LASTEXITCODE -ne 0 -or $taskStatus) { throw 'Revisa y guarda los cambios en un commit antes de publicar.' }
$taskOrigin = & git config --get remote.origin.url
if ($taskOrigin -and $taskOrigin.Trim() -notin @('https://github.com/xisver/xisverso.git','git@github.com:xisver/xisverso.git')) {
    throw 'El remoto origin apunta a otro repositorio. Revísalo antes de publicar.'
}
# Expected 404 probes must also work in Windows PowerShell 5.1.
$ErrorActionPreference = 'Continue'
$taskRepo = & gh repo view xisver/xisverso --json nameWithOwner,url,isPrivate 2>$null
$taskRepoExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($taskRepoExit -ne 0) {
    & gh repo create xisver/xisverso "--$Visibility" --description 'Un mundo vivo de mascotas procedurales por XisSoft.'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el repositorio. Revisa conexión, autenticación y permisos.' }
} else {
    $taskMetadata = $taskRepo | ConvertFrom-Json
    if ($taskMetadata.isPrivate -ne ($Visibility -eq 'private')) {
        throw 'La visibilidad del repositorio existente no coincide con -Visibility. El script no cambia su privacidad: revisa la opción antes de continuar.'
    }
}
if (-not $taskOrigin) {
    & git remote add origin https://github.com/xisver/xisverso.git
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar el remoto.' }
}
& git push --set-upstream origin main
if ($LASTEXITCODE -ne 0) { throw 'No se pudo subir main. Revisa gh auth setup-git. El historial remoto no se ha forzado.' }
& gh repo view xisver/xisverso --json url,isPrivate
