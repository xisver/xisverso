# Publicar Xisverso en GitHub Pages

El proyecto está preparado para `https://xisver.github.io/xisverso/`. La publicación remota todavía requiere iniciar sesión y ejecutar los pasos siguientes.

## 1. Elegir la visibilidad

GitHub Free permite Pages desde repositorios públicos. Para mantener el código privado se necesita un plan compatible, como GitHub Pro. El sitio de Pages de estas instrucciones será accesible por Internet; un repositorio privado no garantiza un sitio privado.

El parámetro `private` de `package.json` evita publicar accidentalmente el paquete en npm; no controla la visibilidad en GitHub. Los scripts no cambian la visibilidad de un repositorio existente.

## 2. Instalar e iniciar sesión

En PowerShell:

```powershell
winget install --id GitHub.cli --exact
```

Abre una nueva terminal de PowerShell después de instalar GitHub CLI. Inicia sesión personalmente con la cuenta `xisver` y permite publicar workflows:

```powershell
gh auth login --hostname github.com --git-protocol https --scopes workflow
gh auth setup-git --hostname github.com
```

Si ya habías iniciado sesión y el push rechaza los archivos de workflows por sus permisos, completa `gh auth refresh --hostname github.com --scopes workflow` y vuelve a intentarlo.

## 3. Subir el proyecto

Para la opción pública de GitHub Free:

```powershell
Set-Location -LiteralPath 'C:\Users\PC\Documents\ChatGPT\TAMAGOTCHI'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1 -Visibility public
```

Si tu plan permite Pages con código privado, usa `-Visibility private`. La carpeta mantiene su nombre físico `TAMAGOTCHI`, aunque el producto y el repositorio se llaman Xisverso.

El script verifica la cuenta y la rama `main`, exige un árbol de trabajo limpio, crea `xisver/xisverso` si falta y sube los commits. Si el repositorio ya existe con otra visibilidad, se detiene sin modificarla. Tampoco fuerza ni reemplaza el historial remoto.

## 4. Activar Pages y publicar

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-pages.ps1
```

Este paso selecciona GitHub Actions como origen de Pages e inicia el workflow `pages.yml`. Puedes comprobar su ejecución con:

```powershell
gh run list --repo xisver/xisverso --workflow pages.yml --limit 3
```

Cuando la ejecución termine con `success`, el juego estará en:

[https://xisver.github.io/xisverso/](https://xisver.github.io/xisverso/)

La primera subida puede disparar un workflow antes de que Pages esté activado. El script de activación solicita una nueva ejecución después de configurarlo; revisa la ejecución más reciente.

También puedes activar Pages personalmente en GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Después inicia **Actions → Publicar Xisverso en Pages → Run workflow**, o usa `gh workflow run pages.yml --repo xisver/xisverso --ref main`.

## Actualizaciones posteriores

Tras revisar tus cambios:

```powershell
git add .
git commit -m 'feat: describir el cambio'
git push origin main
```

Cada push a `main` vuelve a compilar y publicar automáticamente. La compilación se entrega como un artefacto de `dist/`; no hay que subir `dist` ni `node_modules` al repositorio.

## Qué se preparó y qué se verificó

- `npm.cmd run build:pages` compila con base `/xisverso/`, conservando la dirección local del desarrollo.
- `.github/workflows/pages.yml` ejecuta las pruebas de simulación, compila el juego, sube solo `dist/` y lo despliega al entorno `github-pages`.
- `npm.cmd run check:pages` comprueba el HTML generado y sirve la compilación bajo el subdirectorio real `/xisverso/` en un servidor local aislado. Verifica JavaScript, CSS, favicon, cuidado y persistencia con Chrome sin ventana.
- Los scripts de PowerShell se revisan sintácticamente. Los comandos de creación, autenticación y publicación remota se ejecutarán cuando el propietario los invoque; no están verificados contra una sesión autenticada en este equipo.

No se necesita un token escrito en los archivos del proyecto: GitHub Actions utiliza sus permisos temporales de Pages. Las operaciones locales usan GitHub CLI.

## Guardados y límites de Pages

El navegador guarda por origen. La partida de `localhost` o `127.0.0.1` permanece allí; entrar a `https://xisver.github.io` crea un guardado independiente. La versión publicada todavía funciona con partidas locales por navegador y no incorpora cuentas, servidor ni convivencia multijugador.

Si cambias el nombre del repositorio o añades un dominio propio, adapta primero `build:pages`, la URL y los scripts de publicación.

Fuentes oficiales: [Vite y GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [GitHub Pages y planes](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [GitHub CLI](https://cli.github.com/manual/gh_auth_login).
