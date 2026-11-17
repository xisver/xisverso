# Arquitectura de Xisverso

## Refugio como espacio de juego

La aplicación utiliza TypeScript y Vite. La escena Canvas 2D ocupa el área disponible del navegador; las herramientas, el nombre de la mascota y los accesos al mundo se superponen como controles del juego. Las necesidades, el progreso y los recuerdos se consultan en diálogos cuando el jugador los necesita.

```text
Entrada de ratón, táctil o teclado
  ├── Suelo → destino de movimiento → escena y animación
  ├── Herramienta → selección visual, sin gasto de recursos
  ├── Mascota → cuidado del dominio → guardado y reacción
  └── Acceso del mundo → viaje, minijuego o diálogo
```

- `src/domain/game.ts`: tipos y reglas de simulación, independientes del DOM y del almacenamiento.
- `src/domain/game.test.ts`: invariantes, inmutabilidad, límites y persistencia.
- `src/render/scene.ts`: arte procedural, coordenadas, movimiento, detección de interacción y ciclo de animación.
- `src/main.ts`: herramientas, controles accesibles, diálogos, simulación, guardado y minijuego.
- `src/style.css`: mundo adaptable al tamaño de pantalla, herramientas y presentación de diálogos.
- `tests/game.spec.ts`: recorridos de juego con una instancia de Chrome aislada y sin ventana.

La lógica de dominio produce estados nuevos. La escena no decide cuántas semillas recibe el jugador ni modifica necesidades: comunica una interacción al coordinador. Seleccionar o arrastrar una herramienta no ejecuta por sí mismo un cuidado. El cuidado se liquida al usarla sobre la mascota; tocar el suelo solo cambia su destino.

## Movimiento e interacción

La escena expone posiciones normalizadas respecto al lienzo para mantener alineados el dibujo, los gestos y el control HTML de la mascota. El movimiento interpola el destino dentro de una zona segura, añade pasos y conserva el cuerpo visible por encima de las herramientas. El paseo espontáneo y la mirada son comportamientos visuales locales.

Un botón HTML acompaña la posición de la mascota y permite activar la misma interacción con teclado. Los controles de herramientas tienen nombre accesible, estado de selección y atajos. Los diálogos tienen títulos, cierre por botón y soporte de Escape. En móvil se puede seleccionar y tocar; arrastrar es una alternativa, no un requisito.

La posición caminada y la herramienta seleccionada pertenecen a la escena de esta sesión. No son nuevos campos del guardado ni aportan recursos. Dormir, cuidar o jugar sí invocan las reglas de la simulación existentes.

## Estado y tiempo

La clave de almacenamiento sigue siendo `xisverso.save.v1`. El rediseño mantiene el esquema de la primera versión: identidad, nombre, semilla y bioma; necesidades; vínculo; semillas; experiencia; nivel; actividades; récord del minijuego y última actualización. Una partida válida de la versión anterior conserva su progreso.

Se valida el JSON y sus valores al cargar. Un guardado inválido se rechaza de forma controlada. Antes de cambiar el esquema habrá que añadir migraciones y pruebas con partidas antiguas.

El tiempo transcurrido se calcula al volver y al ejecutar acciones. La ausencia aplicada tiene un límite, se descartan intervalos negativos y se acotan las necesidades. No hace falta mantener una pestaña abierta para calcular el deterioro. Un reloj local manipulado puede afectar la partida: es una limitación aceptada del prototipo, no una base para economía en línea.

`localStorage` puede estar bloqueado, llenarse o borrarse. Un fallo de escritura deja jugable la sesión e informa de la falta de guardado. Se escucha `storage` y se reconcilia el estado antes de las operaciones para sincronizar pestañas; esto no equivale a transacciones ni a sincronización entre dispositivos. Para una economía remota se requiere un servidor.

## Arte procedural

La semilla controla diferencias reproducibles de proporciones, color y adornos. La animación añade respiración, parpadeo, pasos y reacciones sin cambiar la identidad. Los biomas tienen fondos y paletas diferenciados.

La resolución se adapta al contenedor y a la densidad de píxeles. La escena respeta el movimiento reducido y pausa trabajo innecesario cuando la página está oculta. Mascotas, paisajes y efectos se construyen con formas y curvas, sin sprites ni modelos 3D externos.

## Minijuego

La actividad de luciérnagas dura 20 segundos. El coordinador mantiene el inicio, el resultado y un cierre único; solo al terminar aplica el resultado mediante el dominio. Salir antes de tiempo no entrega semillas. El récord conserva la puntuación real y los premios y la experiencia tienen límites.

Las recompensas de esta versión son locales y modificables desde el equipo. El cierre único de la interfaz evita duplicados normales de sesión, pero no constituye validación contra trampas.

## Evolución al modo social

Se prevén `Player`, `Pet`, `SpeciesDefinition`, `BiomeDefinition`, `Habitat`, `Inventory`, `ActivityDefinition`, `Room` y `GameSession`. Esta versión no crea estos servicios ni una base de datos remota.

Antes de convivir entre usuarios:

1. El servidor autentica y autoriza operaciones sobre mascotas y refugios.
2. El servidor calcula o verifica recursos, resultados y recompensas.
3. Cada acción con premio tiene un identificador persistente para evitar duplicados.
4. Los mensajes de movimiento y expresión son decorativos; no entregan semillas.
5. Las salas tienen límites de participantes, permisos, reconexión, bloqueo y reporte.

Las visitas asincrónicas precederán a los encuentros en tiempo real. Las primeras salas serán privadas y pequeñas.

## Verificación

Las pruebas de dominio cubren invariantes, reloj atrasado, guardado corrupto, recompensas y biomas. Las pruebas de interfaz recorren selección y uso de herramientas, desplazamiento, arrastre, teclado, preservación de una partida v1, viaje, minijuego, guardado y tamaños móviles. La compilación comprueba TypeScript y produce la aplicación estática. Las capturas permiten revisar la composición, pero no sustituyen las pruebas de comportamiento.
