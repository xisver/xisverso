[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Falta GitHub CLI. Instálala e inicia sesión antes de activar Pages.' }
& gh auth status --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'Inicia sesión con gh auth login --hostname github.com --git-protocol https.' }
$taskLogin = & gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or $taskLogin.Trim() -ne 'xisver') { throw 'Inicia sesión con la cuenta xisver.' }
$taskRepo = & gh repo view xisver/xisverso --json nameWithOwner
if ($LASTEXITCODE -ne 0) { throw 'Primero sube el proyecto con scripts/publish-github.ps1.' }
& gh api repos/xisver/xisverso/contents/.github/workflows/pages.yml --silent
if ($LASTEXITCODE -ne 0) { throw 'Todavía no está subido el workflow pages.yml en la rama principal.' }
$ErrorActionPreference = 'Continue'
$taskPagesJson = & gh api repos/xisver/xisverso/pages 2>$null
$taskPagesExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($taskPagesExit -eq 0) {
    $taskPages = $taskPagesJson | ConvertFrom-Json
    if ($taskPages.cname) { throw 'El sitio ya tiene un dominio personalizado. Adapta primero la ruta base de Vite para ese dominio.' }
    if ($taskPages.build_type -ne 'workflow') {
        & gh api --method PUT repos/xisver/xisverso/pages -f build_type=workflow --silent
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo seleccionar GitHub Actions como origen de Pages.' }
    }
} else {
    & gh api --method POST repos/xisver/xisverso/pages -f build_type=workflow --silent
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo activar Pages. GitHub Free requiere un repositorio público; revisa también los permisos de la cuenta.' }
}
& gh workflow run pages.yml --repo xisver/xisverso --ref main
if ($LASTEXITCODE -ne 0) { throw 'Pages está configurado, pero no arrancó el workflow. Reintenta: gh workflow run pages.yml --repo xisver/xisverso --ref main.' }
Write-Output 'Publicación solicitada. Consulta el resultado: gh run list --repo xisver/xisverso --workflow pages.yml --limit 3'
Write-Output 'Dirección prevista cuando la ejecución termine correctamente: https://xisver.github.io/xisverso/'
