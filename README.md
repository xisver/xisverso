# Xisverso

**Un mundo vivo de XisSoft.**

Xisverso nace de **Xisver + universo**: un juego de simulación de mascotas originales, con personalidad y afinidad por distintos biomas. El ciclo del juego es cuidar, jugar, mejorar el refugio y descubrir nuevas posibilidades de convivencia.

Esta primera versión es un prototipo local para validar que cuidar y jugar con una criatura resulte agradable. Las mascotas y los escenarios se dibujan y animan por código en Canvas 2D: no requieren sprites, modelos 3D ni servicios de generación de imágenes.

## Primera versión

- Una mascota inicial llamada Nubi, con nombre editable y apariencia procedural reproducible.
- Cuatro necesidades: saciedad, energía, higiene y ánimo.
- Acciones de alimentar, limpiar, descansar y acariciar.
- Vínculo, experiencia, nivel y monedas dentro de una economía local de prueba.
- Bosque, costa y tundra disponibles como biomas de demostración.
- Un minijuego de recoger luciérnagas durante 20 segundos.
- Guardado automático en el navegador y cálculo limitado del tiempo transcurrido al volver.
- Interfaz en español, adaptable a pantallas pequeñas y con controles táctiles.

El guardado pertenece a este navegador y dispositivo. Borrar los datos del navegador elimina la partida. La economía local puede modificarse desde el propio equipo y todavía no sirve como base de un modo competitivo.

## Ejecutar con PowerShell

Requiere Node.js con soporte para ejecutar TypeScript nativo. El entorno inicial de desarrollo utiliza Node.js 24.

```powershell
npm.cmd install
npm.cmd run dev
```

Abre manualmente la dirección local que muestra Vite en la terminal. El comando no toma el control del navegador.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

`npm test` verifica las reglas de la simulación; `npm run build` comprueba TypeScript y genera la aplicación en `dist/`. En PowerShell también pueden utilizarse `npm install`, `npm run dev`, `npm test` y `npm run build` cuando la política de ejecución permita el lanzador `npm.ps1`.

## Próximas etapas

Las cuentas, el guardado en línea, varias mascotas simultáneas, las visitas entre usuarios, la convivencia en vivo y los minijuegos multijugador están **planificados**. Esta versión no incluye usuarios remotos ni simula jugadores conectados.

Antes del modo social incorporaremos un servidor que valide propiedad de las mascotas, inventario, resultados y recompensas. Las salas iniciales serán privadas y pequeñas; el diseño de la comunidad se definirá junto con las pruebas del juego.

- [Ruta del proyecto](docs/ROADMAP.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Decisiones de diseño y tecnología](docs/DECISIONS.md)

## Desarrollo

Tecnologías: TypeScript, Vite, Canvas 2D y APIs del navegador. La simulación está separada del dibujo y de la interfaz para permitir cambiar el estilo visual o incorporar 3D sin reconstruir las reglas del cuidado.

**Desarrollado por XisSoft.** Copyright © 2026 XisSoft. Todos los derechos reservados. No se concede una licencia de código abierto en esta etapa.

## Verificación de la interfaz

```powershell
npm.cmd run test:e2e
```

Las pruebas usan una instancia aislada de Google Chrome sin ventana, lanzada desde PowerShell. No usan la sesión ni los datos del navegador personal. Requieren Google Chrome instalado; la compilación y las pruebas de simulación no necesitan navegador.

Cubren cuidados, cambio de nombre, persistencia al recargar, los biomas, navegación móvil, teclado, finalización y abandono del minijuego, guardados dañados, almacenamiento bloqueado y sincronización entre pestañas. Las capturas se generan en `artifacts/`, que no se versiona.

También puedes iniciar el proyecto con `powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1`. El parámetro de ejecución se aplica solo a ese proceso, sin cambiar la configuración del sistema.

## Repositorio en GitHub

Nombre previsto: `xisver/xisverso`, privado. El código está preparado localmente; la publicación remota requiere una sesión autorizada de GitHub CLI.

```powershell
# Si no tienes instalada la herramienta oficial:
winget install --id GitHub.cli --exact

# Completa personalmente el inicio de sesión que indique GitHub CLI:
gh auth login

# Con los cambios revisados y guardados en un commit:
powershell -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1
```

El script comprueba la cuenta `xisver`, crea el repositorio privado si no existe y sube `main`. No extrae ni muestra tokens, no cambia la visibilidad de un repositorio existente y no fuerza el historial remoto. No se debe compartir ninguna credencial en el chat.

El nombre del producto ya es Xisverso. La carpeta física conserva por ahora `TAMAGOTCHI` porque Windows impide renombrarla mientras la sesión actual la utiliza.
