# Arquitectura de Xisverso

## Mundo, simulación e interfaz

El refugio Canvas 2D es la pantalla principal. La interfaz HTML añade herramientas, controles accesibles que siguen a la mascota y diálogos para crecimiento, viajes, cocina, colección, juegos, decoraciones y visitas.

- `src/domain/game.ts`: reglas puras de cuidado, ciclo de vida, inventario, expediciones, cocina, compras y migración.
- `src/domain/game.test.ts`: invariantes, límites, inmutabilidad y persistencia.
- `src/render/scene.ts`: dibujo procedural, etapas, profundidad, paseo, decoraciones y apariciones de residentes.
- `src/minigames.ts`: siete actividades con movimiento, ritmo musical y cocos de tres rondas.
- `src/experiences.ts` y `src/experiences.css`: cocina interactiva y tienda en pantallas completas.
- `src/expedition.ts`: animación de los adultos participantes sin modificar recompensas.
- `src/audio.ts`: lista musical aleatoria, efectos sintetizados, mezcla y preferencias locales.
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

La etapa se deriva de `growthSeconds`: huevo durante 18 000 segundos, bebé durante los siguientes 72 000 y joven durante los siguientes 259 200. La etapa adulta comienza a las 97 horas acumuladas. Estas duraciones siguen siendo reglas internas. `getLifeProgress` expone el progreso relativo, el tiempo restante y la siguiente etapa; la interfaz muestra etapa y porcentaje, sin horas restantes ni explicaciones de cuánto tarda la evolución.

El crecimiento usa todo el tiempo real transcurrido, también con el juego cerrado. Comida, cuidados y juegos no añaden segundos de crecimiento. Las caricias siempre se aceptan, incluso con el Ánimo lleno. En mascotas nacidas añaden dos puntos de vínculo solo si el Ánimo anterior al cuidado es menor de 30, respetando el máximo de 100. A partir de 30 no añaden vínculo, aunque el cuidado se acepta y recupera Ánimo. Nunca entregan XP, puntos ni progreso adicional; el huevo conserva su interacción de calor sin añadir vínculo. Los relojes atrasados o inválidos no rejuvenecen ni restauran necesidades.

Al liberar un adulto se conserva en `freePets` y se crea un huevo con una identidad nueva en el bioma actual. El dominio rechaza liberar etapas anteriores, duplicar adultos o liberar mientras haya una expedición pendiente de liquidar.

## Necesidades, alimentación y puntos

Todas las necesidades están entre 0 y 100 y expresan bienestar. Internamente, `needs.appetite` vale 100 cuando la mascota está llena y 0 cuando tiene mucha hambre; comer lo aumenta. Energía, higiene y ánimo también empeoran al bajar. La interfaz conserva el valor y la barra de Apetito, sin la explicación de sus extremos.

El deterioro es lento y depende del bioma y de la etapa. Se integra el tiempo efectivo a cada lado de una transición de etapa. Una ausencia aplica como máximo ocho horas despierto de deterioro, aunque la edad continúa avanzando durante toda la ausencia. Los huevos no sufren ese deterioro y no hay muerte permanente.

Cocinar verifica todos los ingredientes y los consume de manera atómica. Alimentar consume una porción de la receta seleccionada y la registra en `pet.diet`; elegir herramienta o alimento no consume recursos. El botón Alimentar despliega una ficha compacta con el nombre de la comida elegida, cuánto Apetito recupera y una flecha `>` para cambiarla. El selector de alimento permite acceder a la cocina. La dieta sigue disponible para un futuro diseño de evoluciones alimentarias.

Una partida nueva empieza con cero puntos y cero ingredientes, además de una ración de bienvenida. Los guardados anteriores conservan los recursos que ya tenían. Los ingredientes se consiguen al explorar o mediante compras con puntos; los minijuegos no entregan materiales ni comida.

`coins` representa los puntos locales. Completar uno de los seis minijuegos de 20 segundos con al menos un acierto recupera Ánimo y entrega entre uno y cinco puntos. El reto de cocos exige tres aciertos dentro de sus 60 segundos. Una partida cancelada, sin aciertos o sin completar las tres rondas de cocos no da puntos. `purchaseDecoration` comprueba saldo y propiedad antes de descontarlos y añadir una decoración. `decorations` contiene IDs conocidos y únicos. Las seis compras se dibujan en posiciones del mundo y no implican dinero real.

## Cocina y mercado

`src/experiences.ts` controla dos lugares a pantalla completa con estilos propios. La cocina presenta una despensa, tres espacios de ingredientes, un cuenco animado, comida preparada y un recetario. El mercado organiza sus estantes en Ingredientes y Decoración y utiliza los mismos puntos locales.

El catálogo contiene doce ingredientes y doce recetas, además de Comida Rara (+8 Apetito). Las fórmulas comparan cantidades exactas de una a tres unidades sin importar su orden. Una combinación sin receta disponible para el nivel produce Comida Rara; un ingrediente aún bloqueado no se puede utilizar. Hay seis niveles de cocina, con 60 XP por nivel: una receta correcta entrega 12 XP y una mezcla rara 3 XP. El libro distingue páginas por nivel y recetas descubiertas.

`cookIngredients` y `purchaseIngredient` verifican nivel, cantidad, existencias y saldo antes de mutar una copia. La interfaz no consume al seleccionar: cuatro gestos de mezcla y dos segundos de cocción preceden a una única liquidación contra el estado actual. Cerrar cancela los pasos pendientes sin consumir ni producir una ración. La despensa se bloquea durante la preparación y el resultado queda a la vista también en móvil. Las semillas son ingredientes comprables y mezclables; no hay un huerto.

## Exploraciones persistentes

Una expedición conserva ID, bioma de salida, horas inicial y final, hasta tres adultos libres diferentes y sus materiales previstos. La recompensa y el grupo se fijan al salir. Viajar o recargar no cambia esos datos ni reinicia el reloj. Solo se reclama después de terminar y una sola vez.

`explorationStarts` conserva los dos últimos inicios de expedición. `getExplorationAvailability` comprueba que exista un adulto principal o libre y permite un máximo de dos salidas por día calendario de `America/Mexico_City`, con ocho horas entre inicios. El contador se reinicia a medianoche de Ciudad de México; la espera de ocho horas conserva el último inicio y puede cruzar esa medianoche. Recargar, viajar o liberar una mascota no elimina el historial. Una expedición en marcha o pendiente de reclamar también impide iniciar otra.

Si la mascota principal es huevo, bebé o joven, la salida necesita al menos un adulto libre seleccionado. `principalParticipates` fija quién sale; `cookingLevel` y `lootVersion` fijan la tabla de materiales para mantener recompensas anteriores al recargar. La madurez de la mascota principal se reconcilia con el reloj antes de validar la salida. Las expediciones legítimas de guardados anteriores se conservan y pueden reclamarse. Las expediciones y su economía pertenecen a la partida local y no son resultados validados por un servidor.

## Guardados y migración

La clave actual es `xisverso.save.v3`, con `version: 3`. La recuperación busca v3, después v2 y finalmente v1, conservando los respaldos anteriores.

El historial `explorationStarts: number[]` es una ampliación aditiva de v3: valida hasta dos marcas de tiempo finitas, ordenadas, únicas y no futuras. Los guardados anteriores sin historial empiezan con la lista vacía; si ya hay una expedición, su inicio se incorpora para conservar la espera correspondiente. La migración no elimina puntos, ingredientes, comida ni compras existentes.

- v2: `100 - hunger` se convierte en Apetito. Se preservan las etapas alcanzadas y el progreso relativo dentro de ellas; un joven sigue siendo joven y un adulto sigue siendo adulto. Se mantienen adultos libres, inventario y expediciones legítimas.
- v1: el antiguo campo `hunger` representaba saciedad y se conserva como Apetito. La mascota previa permanece adulta y mantiene identidad, recursos y logros.

La ampliación de cocina también es aditiva: `cooking.xp` y `cooking.discovered` se conservan en v3. Las partidas con cinco ingredientes y tres recetas reciben contadores cero para los nuevos IDs. Si no hay historial de cocina, el recetario inicial reconoce el cuenco de bayas y las recetas que ya tenían raciones o registros en la dieta.

La validación comprueba estructuras, números finitos, límites, IDs únicos, coherencia entre etapa y edad, recetas, inventario, expediciones, decoraciones y progreso de cocina. Descarta propiedades desconocidas y rechaza estados inconsistentes.

`localStorage` puede estar bloqueado, llenarse o borrarse. La sesión debe seguir jugable si falla una escritura, sin sustituir cambios en memoria por una copia anterior del mismo guardado. La sincronización entre pestañas utiliza `storage` y reconciliación antes de operar; no equivale a transacciones ni a sincronización entre dispositivos. Otro origen web conserva otra partida.

## Dibujo, profundidad y accesibilidad

Huevos, criaturas, residentes, decoraciones y paisajes se construyen con formas y curvas. La semilla y el origen fijan la paleta; la etapa determina la estructura. El bebé es una forma redonda o flotante con ojos, sin extremidades; el joven añade rasgos y extremidades pequeñas; el adulto tiene su estructura completa.

La mascota ocupa menos pantalla. Su punto de apoyo se expresa en coordenadas normalizadas del suelo y su escala cambia con la profundidad. Sombras, criaturas y objetos se ordenan según su posición en el terreno. `getPetBounds` expone el rectángulo en píxeles CSS para mantener alineados el control accesible y las interacciones por arrastre.

Las mascotas libres siguen en la colección y en las expediciones, pero solo aparecen ocasionalmente en su bioma. Las ventanas deterministas son breves, de hasta 24 segundos en ciclos de 180 segundos; el renderer limita cuántas se muestran a la vez. Una colección local no representa otros usuarios conectados.

La hoja superior izquierda abre el cambio de bioma. El botón central muestra el nombre de la mascota y sus cuatro barras de bienestar, sin repetir la hoja. La brújula no tiene texto visible y añade una señal roja de prohibición únicamente si no hay adultos propios. No se muestran el cartel «Otros rincones» ni el pie de marca y guardado.

El huevo no camina; bebés, jóvenes y adultos pueden seguir un destino. En móvil, las caricias requieren deslizar el dedo sobre la criatura. Ratón y teclado conservan sus alternativas, incluido el botón HTML de interacción. Las herramientas exponen nombre y selección, y los diálogos tienen título, cierre y Escape. La escena respeta movimiento reducido y pausa la animación al ocultar la página.

## Siete minijuegos

Las seis sesiones originales duran 20 segundos. Cocos permite hasta 60 segundos para completar tres rondas con barajados cada vez más rápidos; el premio solo llega tras los tres aciertos. El ritmo emite notas sincronizadas y atenúa la lista de fondo sin reiniciarla. Luciérnagas en compañía exige que la mascota llegue a la luz; Lluvia de frutas usa la posición de la mascota para recoger; Salta los charcos comprueba el salto; Baile del bosque comprueba dirección y compás; Sendero de recuerdos comprueba una secuencia que la mascota recorre; Pelota al claro usa contacto y empuje hacia una meta.

La interfaz recibe puntuaciones de acciones válidas y llama al dominio una sola vez al terminar. La recompensa recupera Ánimo, se limita a uno a cinco puntos y no añade ingredientes ni raciones. Salir antes o terminar sin aciertos no entrega puntos. Un huevo espera a nacer para jugar. Cada actividad mantiene controles táctiles y alternativas de teclado; no se valida una recompensa por un simple cambio de contador visual.

## Sonido

La música utiliza un reproductor HTML de audio y cuatro MP3 de `public/audio/`. Las rutas respetan `import.meta.env.BASE_URL` para desarrollo y GitHub Pages. Una ronda barajada reproduce todas las pistas antes de mezclar de nuevo y evita la repetición inmediata entre rondas. El reproductor carga la pista actual según se necesita, sin decodificar la colección completa en memoria. Los efectos de interacción, los utensilios de cocina y las notas del juego de ritmo se sintetizan con Web Audio.

El audio se inicia tras un gesto del usuario y admite reintentar si el navegador bloquea la reproducción. Música y efectos tienen activación y volumen independientes; las preferencias usan `xisverso.audio.v1`. Cambiar el volumen o viajar no reinicia la pista. Ocultar la página o desactivar música pausa la reproducción; al volver se conserva su posición. Destruir el motor libera el reproductor, los eventos y el contexto de efectos.

## Visitas opcionales con Firebase

El módulo se carga sin iniciar tráfico remoto. Una acción del jugador conecta una identidad anónima persistente y Firestore Lite. Se publica manualmente una vista mínima: versión, nombre del refugio, bioma, apariencia de la mascota, decoraciones y fecha. No se sube el guardado, las necesidades, el inventario ni los puntos.

El código compartido identifica un documento. Las visitas usan lecturas puntuales, sin directorio ni listeners permanentes. Solo el propietario puede publicar, actualizar o eliminar su vista; las reglas deniegan listados y validan campos, tipos, tamaños e IDs. El dueño puede retirar la publicación sin borrar su partida local.

La aplicación utiliza el proyecto `xisverso-xissoft-20261117`, con aplicación web registrada y Auth anónima configurada. La base `(default)` es Firestore Standard con cuota gratuita en `nam5`; la facturación está desactivada. Las reglas superaron 74 comprobaciones con el emulador oficial mediante `npm.cmd run test:firebase-rules`, que requiere Java 21 en `PATH` y utiliza `demo-xisverso` sin cuota remota.

`npm.cmd run check:firebase` aprobó el recorrido con dos sesiones anónimas contra el proyecto real: publicación, visita desde otra sesión sin modificar identidad, inventario ni puntos del visitante, retirada que impide una nueva visita y limpieza de las vistas e identidades temporales. Consume cuota real y se ejecuta expresamente, separado de las pruebas locales. Las compilaciones de Pages reciben su configuración pública desde las variables del repositorio. Consulta [FIREBASE.md](FIREBASE.md).

Cuentas recuperables, sincronización de partidas, convivencia en vivo y minijuegos compartidos quedan pendientes. Cualquier economía remota futura deberá validar propiedad y resultados en servidor, sin aceptar el estado local como prueba de recursos legítimos.
