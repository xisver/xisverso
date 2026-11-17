# Arquitectura de Xisverso

## Primera versión local

La aplicación utiliza TypeScript y Vite. La interfaz presenta las acciones y el progreso; Canvas 2D dibuja el escenario y la mascota sin recursos gráficos externos.

```text
Interfaz web
  ├── Simulación: cuidado, tiempo, vínculo, experiencia y recompensas
  ├── Guardado: serialización y validación de un estado versionado
  ├── Escena: mascota, bioma, animación y reacciones en Canvas 2D
  └── Minijuego: sesión temporal y entrega de un resultado local
```

- `src/domain/game.ts`: tipos y reglas de la simulación, independientes de la interfaz.
- `src/domain/game.test.ts`: pruebas de invariantes y casos de persistencia.
- `src/render/scene.ts`: dibujo y ciclo de animación; recibe el estado visual de la mascota.
- `src/main.ts`: conecta controles, estado, guardado, escena y minijuego.
- `src/style.css`: diseño adaptable y estados visuales de la interfaz.

La lógica de dominio produce estados nuevos. El dibujo no decide cuántas monedas recibe el usuario ni modifica las necesidades. Los botones y el minijuego invocan reglas del dominio y después actualizan la presentación.

## Estado y tiempo

La clave de almacenamiento local es `xisverso.save.v1`. El guardado incluye una versión de esquema; identidad, nombre, semilla y bioma de la mascota; necesidades; vínculo; monedas; experiencia; nivel; actividades; mejor resultado del minijuego y última actualización.

Al cargar se valida el JSON y sus valores, no solo la existencia de sus propiedades. Un guardado inválido se rechaza de manera controlada. Antes de realizar cambios de esquema habrá que añadir migraciones y pruebas con partidas antiguas.

El paso del tiempo se calcula al volver a la aplicación y al ejecutar acciones. Se limita el tiempo de ausencia aplicado, se descartan intervalos negativos y se acotan las necesidades. No es necesario mantener una pestaña abierta para calcular el deterioro. Un reloj local manipulado puede afectar la partida: esta limitación es aceptable en el prototipo y no debe trasladarse a una economía en línea.

`localStorage` no es una copia de seguridad: puede estar bloqueado, llenarse o borrarse. La aplicación debe mantener la sesión utilizable ante un fallo de escritura e informar de la falta de persistencia. Varias pestañas pueden competir por el mismo guardado; para la primera versión se recomienda una sola pestaña de juego.

## Arte procedural

La semilla controla diferencias reproducibles de proporciones, color y adornos. La animación añade respiración, parpadeo y reacciones sin cambiar la identidad de la criatura. Los biomas tienen fondos y paletas diferenciados.

La escena debe ajustar su resolución al tamaño del contenedor y a la densidad de píxeles, respetar la preferencia de movimiento reducido y pausar trabajo innecesario cuando la página está oculta. Los controles permanecen en HTML para conservar semántica, foco de teclado y adaptación móvil.

## Evolución al modo social

El siguiente modelo conceptual prevé `Player`, `Pet`, `SpeciesDefinition`, `BiomeDefinition`, `Habitat`, `Inventory`, `ActivityDefinition`, `Room` y `GameSession`. El prototipo no crea estos servicios ni una base de datos remota.

Antes de convivir entre usuarios:

1. El servidor autentica y autoriza las operaciones sobre las mascotas y los refugios.
2. El servidor calcula o verifica recursos, resultados y recompensas.
3. Cada acción que entregue un premio tiene un identificador persistente para evitar duplicados.
4. Los mensajes de movimiento y expresión son decorativos; nunca otorgan monedas por sí mismos.
5. Las salas tienen límites de participantes, permisos, reconexión, bloqueo y reporte.

Las visitas asincrónicas permiten validar identidad, permisos y sincronización antes de añadir tiempo real. Los encuentros iniciales se limitan a salas privadas pequeñas; no se necesita un mundo masivo para comprobar que la convivencia es divertida.

## Verificación

Las pruebas de dominio cubren invariantes, inmutabilidad, reloj atrasado, guardado corrupto, recompensas y cambio de bioma. La compilación comprueba TypeScript y produce el resultado estático. Además se debe comprobar manualmente ratón, teclado, táctil, pantallas pequeñas, guardado al recargar y la opción de movimiento reducido; una compilación correcta no demuestra esos comportamientos visuales.
