# Xisverso

**Un mundo vivo de XisSoft.**

Xisverso combina **Xisver + universo**. Es un juego local de mascotas originales: incubar, cuidar, explorar, cocinar y volver a encontrarse con las criaturas que han crecido contigo. Mascotas, huevos y escenarios se dibujan en Canvas 2D, sin sprites ni modelos externos.

## Qué puedes hacer

- Criar una mascota desde **huevo → joven → adulto**, con nombre editable, necesidades, vínculo y progreso.
- Dar calor al huevo con Caricias; después de nacer, alimentar, bañar, acariciar y descansar dentro del refugio.
- Dejar libre a una mascota adulta en el bioma que visitas y empezar a cuidar un nuevo huevo. Los adultos siguen en tu colección y puedes visitarlos.
- Interactuar con tus mascotas libres cuando están en el mismo bioma que tu compañero nacido.
- Viajar entre Bosque Susurro, Costa Nácar y Tundra Aurora. Viajar cambia el escenario, no el origen ni la apariencia de una mascota.
- Explorar para conseguir ingredientes; puedes invitar a **hasta tres mascotas libres** para traer más materiales.
- Preparar recetas con los ingredientes de la mochila y dar la comida preparada a tu mascota.
- Jugar a atrapar luciérnagas durante 20 segundos.
- Guardar automáticamente el progreso en este navegador, con recuperación de partidas de la primera versión.

Todo lo anterior ocurre entre mascotas de tu propia partida. Las cuentas, visitas a otros usuarios y partidas multijugador siguen planificadas.

## Cómo jugar

Toca el huevo para darle calor. Cuando nazca, toca el suelo para caminar y elige Caricias, Comida, Burbujas o Siesta antes de tocar a la mascota. También puedes arrastrar una herramienta hasta ella. La comida consume una porción preparada; seleccionar una herramienta no gasta recursos.

Pulsa el nombre de tu compañero para consultar **Hambre**, energía, higiene, ánimo y crecimiento. **Hambre baja es mejor**: 0 significa que acaba de comer y 100 que tiene mucha hambre. Las otras tres necesidades funcionan al contrario: cuanto más altas, mejor.

El letrero de exploración permite iniciar una salida y recoger sus materiales cuando termine. Selecciona hasta tres adultos de tu colección para acompañarte. La cocina muestra qué ingredientes necesitas, qué puedes preparar y cuántas porciones tienes.

El bioma donde se crea el huevo fija sus rasgos procedurales. Llevar esa mascota de visita a otro bioma no la transforma. Al liberar un adulto, su hogar será el bioma actual; puedes volver a verlo allí y criar otro huevo.

El menú reúne tus mascotas, la cocina, la bitácora de esta sesión y el próximo capítulo de comunidad. Con teclado, 1–4 seleccionan herramientas y las flechas indican un destino para las mascotas nacidas. Tab y Enter recorren y activan los controles, incluida la mascota.

Los ritmos de crecimiento son cortos y configurables para probar el ciclo: el huevo tarda 60 segundos y la etapa joven 10 minutos. Dar calor al huevo añade 10 segundos de progreso; los cuidados y la comida también aceleran el crecimiento. La alimentación queda registrada por receta, pero **todavía no decide ramas de evolución ni cambios de aspecto**: ese diseño se definirá después.

## Guardados y límites

La partida actual usa `xisverso.save.v2`. Si v2 falta o está dañado y existe un respaldo válido `xisverso.save.v1`, se recupera y migra conservando identidad, nombre, semillas, experiencia y récord. La mascota anterior se conserva como adulta y el antiguo valor de saciedad se convierte en hambre. El guardado v1 queda disponible como respaldo.

El navegador y el dispositivo conservan su propia partida. Borrar sus datos elimina el guardado; abrir el juego desde otro origen, como GitHub Pages, crea un guardado independiente. La ausencia tiene un límite de deterioro y no provoca muerte permanente.

La economía y el inventario son locales y modificables desde el equipo. Todavía no sirven como autoridad para un modo competitivo o compartido entre usuarios.

## Ejecutar con PowerShell

Requiere Node.js 24 y npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Abre personalmente http://127.0.0.1:4173/ o la dirección que muestre Vite. El comando no controla ventanas ni el navegador.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

`npm test` verifica las reglas de la simulación; `npm run build` comprueba TypeScript y genera `dist/`.

## Verificación de la interfaz

```powershell
npm.cmd run test:e2e
npm.cmd run check:pages
```

Las pruebas de interfaz usan el puerto 4174 y una instancia aislada de Chrome sin ventana; no utilizan la sesión ni los datos del navegador personal. Requieren Google Chrome instalado. `check:pages` valida además la compilación servida bajo `/xisverso/`.

Las pruebas cubren migración, hambre, herramientas, crecimiento, liberación, visitas, exploración, cocina, interacción entre mascotas propias, luciérnagas, tamaños móviles y persistencia. La lógica de dominio se prueba por separado del DOM.

También puedes ejecutar `powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1`. La opción de ejecución se aplica solo a ese proceso.

## Desarrollo y publicación

Tecnologías: TypeScript, Vite, Canvas 2D y APIs del navegador. La simulación está separada del dibujo y la interfaz; así podremos ampliar el contenido sin reconstruir el cuidado ni el guardado.

- [Ruta del proyecto](docs/ROADMAP.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Decisiones de diseño y tecnología](docs/DECISIONS.md)
- [Publicar en GitHub Pages con PowerShell](docs/GITHUB_PAGES.md)

El repositorio previsto es `xisver/xisverso` y la publicación de Pages utiliza `https://xisver.github.io/xisverso/`. `build:pages` genera esa ruta y el workflow publica los pushes a `main` cuando Pages está activado. Los scripts de publicación no cambian automáticamente la visibilidad de un repositorio existente.

El producto se llama Xisverso; la carpeta física conserva `TAMAGOTCHI` mientras la sesión actual la utiliza.

**Desarrollado por XisSoft.** Copyright © 2026 XisSoft. Todos los derechos reservados. No se concede una licencia de código abierto en esta etapa.
