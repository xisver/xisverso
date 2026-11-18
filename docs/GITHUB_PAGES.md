# Publicar Xisverso en GitHub Pages

El repositorio `xisver/xisverso` y el sitio [Xisverso en GitHub Pages](https://xisver.github.io/xisverso/) ya existen. Los pushes a `main` ejecutan el workflow de compilación y publicación. Estas instrucciones permiten actualizar el sitio o repetir su configuración; cada actualización debe subirse y completar ese workflow para aparecer allí.

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
Set-Location -LiteralPath 'C:\Users\Lenovo\Documents\ChatGPT\Xisverso'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1 -Visibility public
```

El checkout actual está en `C:\Users\Lenovo\Documents\ChatGPT\Xisverso`. El repositorio existente es público; conserva esa visibilidad. Si trabajas con otro repositorio privado y un plan compatible con Pages, el script permite `-Visibility private` sin cambiar automáticamente un repositorio existente.

El script verifica la cuenta y la rama `main`, exige un árbol de trabajo limpio, crea `xisver/xisverso` si falta y sube los commits. Si el repositorio ya existe con otra visibilidad, se detiene sin modificarla. Tampoco fuerza ni reemplaza el historial remoto.

## 4. Configuración de Pages y publicación

Pages ya utiliza GitHub Actions en el repositorio existente. No hace falta volver a activarlo para cada cambio. Si configuras otro repositorio o necesitas repetir la configuración:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-pages.ps1
```

Este paso selecciona GitHub Actions como origen de Pages e inicia el workflow `pages.yml`. Puedes comprobar su ejecución con:

```powershell
gh run list --repo xisver/xisverso --workflow pages.yml --limit 3
```

Después de subir cambios a `main`, la ejecución más reciente debe terminar con `success` para que esos cambios estén disponibles en:

[https://xisver.github.io/xisverso/](https://xisver.github.io/xisverso/)

La primera subida puede disparar un workflow antes de que Pages esté activado. El script de activación solicita una nueva ejecución después de configurarlo; revisa la ejecución más reciente.

También puedes activar Pages personalmente en GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Después inicia **Actions → Publicar Xisverso en Pages → Run workflow**, o usa `gh workflow run pages.yml --repo xisver/xisverso --ref main`.

## Variables públicas de Firebase para futuras compilaciones

Las visitas opcionales necesitan que la compilación reciba la configuración pública de la aplicación web Firebase del proyecto `xisverso-xissoft-20261117`, ya configurado localmente. En el repositorio de GitHub se usan estas **Repository variables**, disponibles en **Settings → Secrets and variables → Actions → Variables**, para las futuras compilaciones:

| Variable                    | Valor de la configuración web de Firebase |
| --------------------------- | ----------------------------------------- |
| `VITE_FIREBASE_API_KEY`     | `apiKey`                                  |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain`                              |
| `VITE_FIREBASE_PROJECT_ID`  | `projectId`                               |
| `VITE_FIREBASE_APP_ID`      | `appId`                                   |

El paso `npm run build:pages` lee esas variables desde `vars` y Vite las incorpora al cliente. Son datos públicos de configuración; no pongas claves privadas, credenciales de cuentas de servicio ni tokens de administrador en variables `VITE_*`. El acceso a los datos se protege con Firebase Authentication y las reglas de Firestore.

Si faltan las variables, el juego local sigue funcionando y las visitas aparecen sin configurar. Una actualización de variables se aplica en la siguiente compilación; no cambia un sitio ya compilado por sí sola. No se sube `.env.local` al repositorio.

El proyecto **Xisverso** ya existe, con aplicación web, Auth anónima y Firestore Standard gratuito en `nam5`, con facturación desactivada. Las reglas superaron 74 comprobaciones en emulador y `check:firebase` verificó publicación, visita, retirada y limpieza contra el proyecto real sin alterar los recursos del visitante. El cliente se publica con las variables de compilación indicadas. La modificación del workflow, por sí sola, no crea recursos ni despliega reglas. Consulta [FIREBASE.md](FIREBASE.md).

## Actualizaciones posteriores

Cuando los cambios revisados estén integrados en `main`:

```powershell
git add .
git commit -m 'feat: describir el cambio'
git push origin main
```

Cada push a `main` vuelve a compilar y publicar automáticamente. La compilación se entrega como un artefacto de `dist/`; no hay que subir `dist` ni `node_modules` al repositorio.

## Comandos de verificación

- `npm.cmd run build:pages` compila con base `/xisverso/`, conservando la dirección local del desarrollo.
- `.github/workflows/pages.yml` ejecuta las pruebas de simulación, compila el juego, sube solo `dist/` y lo despliega al entorno `github-pages`.
- `npm.cmd run check:pages` comprueba el HTML generado y sirve la compilación bajo el subdirectorio real `/xisverso/` en un servidor local aislado. Verifica JavaScript, CSS, favicon, cuidado y persistencia con Chrome sin ventana.
- `npm.cmd run test:firebase-rules` verifica permisos y validación en los emuladores de Auth y Firestore con `demo-xisverso`; requiere Java 21 en `PATH` y no consume cuota remota.
- `npm.cmd run check:firebase` prueba visitas contra el proyecto real y consume cuota real. Crea dos identidades y una vista temporales, comprueba que la visita conserva identidad e inventario, retira la vista y limpia los datos de prueba.
- Los scripts de PowerShell permiten repetir la configuración y la publicación mediante GitHub CLI. No es necesario crear de nuevo el repositorio ni volver a habilitar Pages en cada actualización.

El sitio y su workflow existentes no demuestran que los cambios locales nuevos ya estén publicados. Comprueba la ejecución correspondiente al commit que quieres revisar.

No se necesita un token escrito en los archivos del proyecto: GitHub Actions utiliza sus permisos temporales de Pages. Las operaciones locales usan GitHub CLI.

## Guardados y límites de Pages

El navegador guarda por origen. La partida de `localhost` o `127.0.0.1` permanece allí; entrar a `https://xisver.github.io` crea un guardado independiente. Las partidas, inventarios y puntos siguen siendo locales. La integración Firebase comparte vistas de refugios; no añade guardado remoto ni convivencia multijugador.

Si cambias el nombre del repositorio o añades un dominio propio, adapta primero `build:pages`, la URL y los scripts de publicación.

Fuentes oficiales: [Vite y GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [GitHub Pages y planes](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [GitHub CLI](https://cli.github.com/manual/gh_auth_login).
