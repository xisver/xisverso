# Xisverso

**Un mundo vivo de XisSoft.**

Xisverso nace de **Xisver + universo**: un juego de simulación de mascotas originales, con personalidad y afinidad por distintos biomas. El ciclo del juego es cuidar, jugar, mejorar el refugio y descubrir nuevas posibilidades de convivencia.

Esta primera versión es un prototipo local para validar que cuidar y jugar con una criatura resulte agradable. Las mascotas y los escenarios se dibujan y animan por código en Canvas 2D: no requieren sprites, modelos 3D ni servicios de generación de imágenes.

## Primera versión

- Una mascota inicial llamada Nubi, con nombre editable y apariencia procedural reproducible.
- Cuatro necesidades: saciedad, energía, higiene y ánimo.
- Un refugio que ocupa el área de juego, con paseo e interacción directa con la mascota.
- Herramientas de caricias, comida, burbujas y siesta: se seleccionan y se usan sobre la criatura; también se pueden arrastrar.
- Bosque, costa y tundra disponibles como biomas de demostración.
- Un minijuego de recoger luciérnagas durante 20 segundos.
- Guardado automático en el navegador y cálculo limitado del tiempo transcurrido al volver.
- Interfaz en español, adaptable a móvil, con controles táctiles y de teclado; bienestar, vínculo y experiencia en una ficha a demanda.

El guardado pertenece a este navegador y dispositivo. Borrar los datos del navegador elimina la partida. La economía local puede modificarse desde el propio equipo y todavía no sirve como base de un modo competitivo.

## Cómo jugar

- Toca o haz clic en el suelo para que tu mascota camine hacia ese lugar.
- Elige Caricias, Comida, Burbujas o Siesta y toca a la mascota para usar la herramienta. Elegirla no consume semillas; dar de comer cuesta 5 semillas.
- También puedes llevar una herramienta desde la barra hasta la mascota mediante arrastre. En táctil siempre puedes seleccionar y tocar.
- Pulsa el nombre de tu compañero para consultar cómo está o cambiar su nombre.
- Explora otros biomas desde el indicador del lugar o el letrero del sendero. El acceso de luciérnagas y el botón Jugar abren el minijuego.
- El menú reúne la bitácora de esta sesión y el próximo capítulo de comunidad.
- Con teclado, 1–4 seleccionan herramientas y las flechas indican un destino. Tab y Enter permiten recorrer y activar los controles, incluida la mascota.

Las partidas de la primera versión se conservan: el rediseño usa el mismo esquema `xisverso.save.v1`. La mascota empieza cada sesión en el centro del refugio; su identidad, nombre, necesidades y progreso permanecen guardados.

## Ejecutar con PowerShell

Requiere Node.js con soporte para ejecutar TypeScript nativo. El entorno inicial de desarrollo utiliza Node.js 24.

```powershell
npm.cmd install
npm.cmd run dev
```

Abre manualmente http://127.0.0.1:4173/ o la dirección local que muestra Vite en la terminal. El comando no toma el control del navegador.

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

Las pruebas utilizan el puerto local 4174, separado del servidor de desarrollo 4173. Las pruebas usan una instancia aislada de Google Chrome sin ventana, lanzada desde PowerShell. No usan la sesión ni los datos del navegador personal. Requieren Google Chrome instalado; la compilación y las pruebas de simulación no necesitan navegador.

Cubren selección y uso de herramientas sobre la mascota, desplazamiento sin gastos, arrastre, cambio de nombre, partidas anteriores v1, biomas, tamaños móviles, teclado, finalización y abandono del minijuego, guardados dañados, almacenamiento bloqueado y sincronización entre pestañas. Las capturas se generan en `artifacts/`, que no se versiona.

También puedes iniciar el proyecto con `powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1`. El parámetro de ejecución se aplica solo a ese proceso, sin cambiar la configuración del sistema.

## GitHub y GitHub Pages

El repositorio previsto es `xisver/xisverso` y el juego puede publicarse en `https://xisver.github.io/xisverso/`. La configuración y los scripts están preparados localmente; falta completar la autenticación y la publicación remota.

Sigue la [guía completa con comandos PowerShell](docs/GITHUB_PAGES.md) para instalar GitHub CLI, subir el proyecto y activar Pages. Puedes elegir `-Visibility public` para Pages con GitHub Free, o `-Visibility private` si tu plan lo permite. Los scripts no cambian automáticamente la visibilidad de un repositorio existente.

`npm.cmd run build:pages` genera las rutas para `/xisverso/`; `npm.cmd run check:pages` verifica la compilación bajo ese subdirectorio con Chrome sin ventana. El workflow publica automáticamente los siguientes pushes a `main` una vez activado Pages.

El nombre del producto ya es Xisverso. La carpeta física conserva por ahora `TAMAGOTCHI` porque Windows impide renombrarla mientras la sesión actual la utiliza.
