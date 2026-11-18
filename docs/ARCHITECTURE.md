# Arquitectura de Xisverso

## Mundo, simulación e interfaz

El refugio Canvas 2D es la pantalla principal. La interfaz HTML añade herramientas, controles accesibles que siguen a la mascota y diálogos para crecimiento, viajes, cocina, colección, juegos, decoraciones y visitas.

- `src/domain/game.ts`: reglas puras de cuidado, ciclo de vida, inventario, expediciones, cocina, compras y migración.
- `src/domain/game.test.ts`: invariantes, límites, inmutabilidad y persistencia.
- `src/render/scene.ts`: dibujo procedural, etapas, profundidad, paseo, decoraciones y apariciones de residentes.
- `src/minigames.ts`: seis actividades con movimiento de la mascota y condiciones propias de puntuación.
- `src/audio.ts`: música procedural por bioma, efectos, mezcla y preferencias locales.
- `src/social/firebase.ts`: conexión voluntaria, publicación de vistas y visitas por código.
- `src/social/firebase.test.ts`: validación de datos compartidos y aislamiento de información local.
- `src/main.ts`: entradas, diálogos, guardado y coordinación de actividades.
- `src/style.css`: presentación adaptable y alternativas táctiles y de teclado.
- `tests/game.spec.ts`: recorridos con Chrome aislado y sin ventana.
- `scripts/check-pages.mjs`: recursos y persistencia de la compilación bajo `/xisverso/`.
- `scripts/check-firebase-live.mjs`: comprobación explícita de publicación, visita, retirada y limpieza contra el proyecto real.
- `scripts/test-firebase-rules.mjs`: comprobaciones de seguridad contra el emulador oficial de Firestore.
- `firestore.rules`: propiedad, validación y acceso por código a las vistas compartidas.

La escena comunica interacciones; no decide recursos ni cambia necesidades. El dominio devuelve un estado nuevo. La interfaz persiste ese resultado y actualiza la presentación. Firebase no forma parte de la simulación local.

## Primera entrada e identidad

Si no hay una partida v3 válida ni respaldos v2 o v1 recuperables, la interfaz abre la bienvenida. El borrador de huevo y bioma no se guarda ni avanza antes de confirmar. Los guardados válidos omiten esta pantalla. Al confirmar se vuelve a comprobar si otra pestaña ya empezó una partida para conservar esa historia.

`createStarterGame` codifica de forma estable el patrón Moteado, Rayado o Estelar en la semilla. `pet.biome` es el origen fijo de los rasgos procedurales; `currentBiome` indica el escenario visitado. Las mascotas libres añaden `habitatBiome`, el lugar donde viven desde que se liberaron. Viajar no modifica identidad, semilla ni origen.

## Etapas y reloj

La etapa se deriva de `growthSeconds`: huevo durante 18 000 segundos, bebé durante los siguientes 72 000 y joven durante los siguientes 259 200. La etapa adulta comienza a las 97 horas acumuladas. `getLifeProgress` expresa el progreso relativo, el tiempo restante y la siguiente etapa.

El crecimiento usa todo el tiempo real transcurrido, también con el juego cerrado. Comida, cuidados y juegos no añaden segundos de crecimiento. Las caricias siempre se aceptan, incluso con el ánimo lleno, y no producen vínculo, XP ni progreso adicional. Los relojes atrasados o inválidos no rejuvenecen ni restauran necesidades.

Al liberar un adulto se conserva en `freePets` y se crea un huevo con una identidad nueva en el bioma actual. El dominio rechaza liberar etapas anteriores, duplicar adultos o liberar mientras haya una expedición pendiente de liquidar.

## Necesidades, alimentación y puntos

Todas las necesidades están entre 0 y 100 y expresan bienestar. `needs.appetite` vale 100 cuando la mascota está llena y 0 cuando tiene mucha hambre; comer lo aumenta. Energía, higiene y ánimo también empeoran al bajar.

El deterioro es lento y depende del bioma y de la etapa. Se integra el tiempo efectivo a cada lado de una transición de etapa. Una ausencia aplica como máximo ocho horas despierto de deterioro, aunque la edad continúa avanzando durante toda la ausencia. Los huevos no sufren ese deterioro y no hay muerte permanente.

Cocinar verifica todos los ingredientes y los consume de manera atómica. Alimentar consume una porción de la receta seleccionada y la registra en `pet.diet`; elegir herramienta o alimento no consume recursos. El botón Alimentar despliega arriba las acciones Cocinar y Elegir alimento. La dieta sigue disponible para un futuro diseño de evoluciones alimentarias.

`coins` representa los puntos locales. Los minijuegos los entregan al terminar; `purchaseDecoration` comprueba saldo y propiedad antes de descontarlos y añadir una decoración. `decorations` contiene IDs conocidos y únicos. Las seis compras se dibujan en posiciones del mundo y no implican dinero real.

## Exploraciones persistentes

Una expedición conserva ID, bioma de salida, horas inicial y final, hasta tres adultos libres diferentes y sus materiales previstos. La recompensa y el grupo se fijan al salir. Viajar o recargar no cambia esos datos ni reinicia el reloj. Solo se reclama después de terminar y una sola vez.

Se permite explorar con un huevo para reunir ingredientes antes de que nazca. Las expediciones y su economía pertenecen a la partida local y no son resultados validados por un servidor.

## Guardados y migración

La clave actual es `xisverso.save.v3`, con `version: 3`. La recuperación busca v3, después v2 y finalmente v1, conservando los respaldos anteriores.

- v2: `100 - hunger` se convierte en Apetito. Se preservan las etapas alcanzadas y el progreso relativo dentro de ellas; un joven sigue siendo joven y un adulto sigue siendo adulto. Se mantienen adultos libres, inventario y expediciones legítimas.
- v1: el antiguo campo `hunger` representaba saciedad y se conserva como Apetito. La mascota previa permanece adulta y mantiene identidad, recursos y logros.

La validación comprueba estructuras, números finitos, límites, IDs únicos, coherencia entre etapa y edad, recetas, inventario, expediciones y decoraciones. Descarta propiedades desconocidas y rechaza estados inconsistentes.

`localStorage` puede estar bloqueado, llenarse o borrarse. La sesión debe seguir jugable si falla una escritura, sin sustituir cambios en memoria por una copia anterior del mismo guardado. La sincronización entre pestañas utiliza `storage` y reconciliación antes de operar; no equivale a transacciones ni a sincronización entre dispositivos. Otro origen web conserva otra partida.

## Dibujo, profundidad y accesibilidad

Huevos, criaturas, residentes, decoraciones y paisajes se construyen con formas y curvas. La semilla y el origen fijan la paleta; la etapa determina la estructura. El bebé es una forma redonda o flotante con ojos, sin extremidades; el joven añade rasgos y extremidades pequeñas; el adulto tiene su estructura completa.

La mascota ocupa menos pantalla. Su punto de apoyo se expresa en coordenadas normalizadas del suelo y su escala cambia con la profundidad. Sombras, criaturas y objetos se ordenan según su posición en el terreno. `getPetBounds` expone el rectángulo en píxeles CSS para mantener alineados el control accesible y las interacciones por arrastre.

Las mascotas libres siguen en la colección y en las expediciones, pero solo aparecen ocasionalmente en su bioma. Las ventanas deterministas son breves, de hasta 24 segundos en ciclos de 180 segundos; el renderer limita cuántas se muestran a la vez. Una colección local no representa otros usuarios conectados.

El huevo no camina; bebés, jóvenes y adultos pueden seguir un destino. El botón HTML de la mascota permite el mismo cuidado por teclado que por toque. Las herramientas exponen nombre y selección, y los diálogos tienen título, cierre y Escape. La escena respeta movimiento reducido y pausa la animación al ocultar la página.

## Seis minijuegos

Las sesiones duran 20 segundos. Luciérnagas en compañía exige que la mascota llegue a la luz; Lluvia de frutas usa la posición de la mascota para recoger; Salta los charcos comprueba el salto; Baile del bosque comprueba dirección y compás; Sendero de recuerdos comprueba una secuencia que la mascota recorre; Pelota al claro usa contacto y empuje hacia una meta.

La interfaz recibe puntuaciones de acciones válidas y llama al dominio una sola vez al terminar. Salir antes cancela la actividad sin recompensa. Un huevo espera a nacer para jugar. Cada actividad mantiene controles táctiles y alternativas de teclado; no se valida una recompensa por un simple cambio de contador visual.

## Sonido

Web Audio genera notas, acordes y efectos propios sin archivos externos. El contexto se inicia tras un gesto del usuario. Música y efectos tienen activación y volumen independientes; las preferencias usan `xisverso.audio.v1`. El bioma selecciona la paleta musical. Ocultar la página suspende el contexto y la programación de notas.

## Visitas opcionales con Firebase

El módulo se carga sin iniciar tráfico remoto. Una acción del jugador conecta una identidad anónima persistente y Firestore Lite. Se publica manualmente una vista mínima: versión, nombre del refugio, bioma, apariencia de la mascota, decoraciones y fecha. No se sube el guardado, las necesidades, el inventario ni los puntos.

El código compartido identifica un documento. Las visitas usan lecturas puntuales, sin directorio ni listeners permanentes. Solo el propietario puede publicar, actualizar o eliminar su vista; las reglas deniegan listados y validan campos, tipos, tamaños e IDs. El dueño puede retirar la publicación sin borrar su partida local.

La aplicación utiliza el proyecto `xisverso-xissoft-20261117`, con aplicación web registrada y Auth anónima configurada. La base `(default)` es Firestore Standard con cuota gratuita en `nam5`; la facturación está desactivada. Las reglas superaron 74 comprobaciones con el emulador oficial mediante `npm.cmd run test:firebase-rules`, que requiere Java 21 en `PATH` y utiliza `demo-xisverso` sin cuota remota.

`npm.cmd run check:firebase` aprobó el recorrido con dos sesiones anónimas contra el proyecto real: publicación, visita desde otra sesión sin modificar identidad, inventario ni puntos del visitante, retirada que impide una nueva visita y limpieza de las vistas e identidades temporales. Consume cuota real y se ejecuta expresamente, separado de las pruebas locales. Las compilaciones de Pages reciben su configuración pública desde las variables del repositorio. Consulta [FIREBASE.md](FIREBASE.md).

Cuentas recuperables, sincronización de partidas, convivencia en vivo y minijuegos compartidos quedan pendientes. Cualquier economía remota futura deberá validar propiedad y resultados en servidor, sin aceptar el estado local como prueba de recursos legítimos.
