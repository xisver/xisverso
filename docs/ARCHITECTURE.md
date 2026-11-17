# Arquitectura de Xisverso

## Mundo, simulación e interfaz

El refugio Canvas 2D es la pantalla principal. La interfaz HTML añade herramientas, botones accesibles que siguen a la mascota y diálogos para crecimiento, viajes, cocina, colección y expediciones.

- `src/domain/game.ts`: reglas puras de cuidado, ciclo de vida, inventario, exploración, cocina, convivencia local y migración.
- `src/domain/game.test.ts`: invariantes, límites, inmutabilidad y casos de persistencia.
- `src/render/scene.ts`: dibujo procedural, etapas visuales, paseo y residentes del bioma.
- `src/main.ts`: entrada de ratón/táctil/teclado, diálogos, guardado y coordinación de actividades.
- `src/style.css`: presentación del mundo, herramientas, luciérnagas y diálogos adaptables.
- `tests/game.spec.ts`: recorridos con Chrome aislado y sin ventana.
- `scripts/check-pages.mjs`: comprobación de los recursos y el guardado del juego compilado bajo `/xisverso/`.

La escena comunica interacciones; no decide recursos ni cambia necesidades. Cada operación del dominio produce un estado nuevo y el coordinador lo guarda antes de actualizar la presentación.

## Primera entrada

Si no hay una partida v2 válida ni un respaldo v1 recuperable, la interfaz abre una bienvenida modal para escoger un patrón de huevo y el bioma de crianza. El borrador es solo una vista previa: no se guarda ni avanza la incubación, incluso si el usuario espera o recarga antes de confirmar. Los guardados válidos omiten esta pantalla.

`createStarterGame` construye la partida inicial elegida. Los patrones Moteado, Rayado y Estelar se codifican de manera estable en la semilla; el origen sigue siendo `pet.biome` y la ubicación inicial `currentBiome`. Se conserva el esquema v2 y no se modifica el comportamiento de la migración ni de los huevos que aparecen al liberar adultos.

Al confirmar se fija el inicio de la crianza y se guarda la elección. Si otra pestaña ya inició una partida mientras esta seguía en la bienvenida, debe retomarse ese guardado y cerrarse el selector para evitar reemplazar la historia creada.

## Identidad, etapa y lugar

La mascota activa conserva ID, nombre, semilla, bioma de origen, necesidades, vínculo, edad efectiva de crecimiento e historial de recetas. La etapa se deriva del crecimiento: huevo, joven o adulto. La incubación dura 60 segundos y la etapa joven otros 600 segundos efectivos. Dar calor al huevo añade 10 segundos de progreso; los cuidados y las recetas añaden crecimiento después de nacer. La representación cambia con la etapa, no por visitar otro lugar.

`pet.biome` es el **origen fijo** que determina rasgos procedurales. `currentBiome` es el escenario visitado. Las mascotas libres guardan además `habitatBiome`, el lugar donde viven desde que se liberaron. Separar estos valores evita transformar una mascota cuando el jugador viaja.

Al liberar un adulto se conserva en `freePets` con la misma identidad y se crea un huevo con nueva identidad en el bioma actual. El dominio rechaza liberar un huevo o joven, duplicar un adulto y liberar mientras una expedición requiere liquidación.

La colección contiene mascotas del mismo jugador. Los residentes presentes pueden aparecer en la escena e interactuar con el compañero nacido. Esto no representa usuarios remotos ni una conexión multijugador.

## Necesidades y alimentación

Todas las necesidades están entre 0 y 100. Hambre aumenta con el tiempo y comer la reduce; energía, higiene y ánimo empeoran al bajar. La lógica de estado de ánimo, los colores y las descripciones deben respetar esta diferencia.

La mochila contiene materiales y porciones de recetas conocidas. Cocinar comprueba todos los ingredientes y los consume de manera atómica; una receta incompleta no quita materiales. Alimentar consume una porción seleccionada y registra la receta en `pet.diet`. La selección de herramienta no gasta recursos.

El historial de dieta se conserva para un futuro diseño de evoluciones alimentarias. En esta versión no determina una rama de evolución ni modifica la apariencia.

## Exploraciones persistentes

Una expedición guarda ID, bioma de salida, hora inicial/final, hasta tres acompañantes y sus materiales previstos. Los acompañantes deben ser adultos libres reales, sin duplicados. La cantidad de materiales aumenta con el grupo.

El bioma y la recompensa se fijan al iniciar. Viajar o recargar mientras transcurre la actividad no cambia esos datos ni reinicia el reloj. La recompensa solo se reclama después de terminar y se liquida una vez; comenzar una segunda salida sin cerrar la primera se rechaza.

Se permite explorar mientras el compañero está en el huevo: el jugador puede reunir materiales antes de que nazca. Las expediciones son actividades locales, no resultados verificados por un servidor.

## Guardados y migración

La clave actual es `xisverso.save.v2`, con esquema `version: 2`. La aplicación busca un v2 válido. Si falta o está dañado, intenta recuperar un respaldo v1 válido y lo migra; el respaldo v1 se conserva sin modificar. Migrar convierte el antiguo valor de saciedad en hambre (`100 - valor anterior`), conserva la mascota previa como adulta y mantiene el progreso anterior.

La validación comprueba estructuras, valores finitos, límites, IDs únicos, recetas, inventario y expediciones. Un estado inválido se rechaza sin aceptar propiedades arbitrarias.

El tiempo se reconcilia al volver y al ejecutar acciones. No se aplican intervalos negativos y se limita la ausencia que modifica el cuidado; no hay muerte permanente. Los ritmos del prototipo son configurables y no constituyen fechas de juego definitivas.

`localStorage` puede estar bloqueado, llenarse o borrarse. Un fallo mantiene jugable la sesión e informa de que no se guardará. La sincronización entre pestañas escucha `storage` y reconcilia antes de operar; no equivale a transacciones ni a sincronización entre dispositivos. Otro origen web dispone de otro guardado.

## Dibujo, gestos y accesibilidad

Las etapas, los residentes, los paisajes y los efectos se dibujan mediante formas y curvas. El origen controla las paletas de las mascotas; el lugar actual controla el entorno. La costa utiliza vegetación costera y la tundra conserva sus propios elementos.

Las posiciones se expresan normalizadas respecto al lienzo, con márgenes para HUD y herramientas. El huevo no camina; jóvenes y adultos pueden seguir un destino. La escena respeta el movimiento reducido y pausa trabajo cuando la página está oculta.

El botón HTML de la mascota permite activar con teclado el mismo cuidado que un toque. La selección de herramientas tiene nombre accesible y estado; los diálogos tienen título, cierre y Escape. En móvil siempre existe la alternativa de seleccionar y tocar sin arrastrar.

## Luciérnagas

El minijuego conserva su sesión de 20 segundos. Los botones y su brillo deben verse sobre el campo nocturno y mantener una superficie táctil suficiente. Al finalizar se entrega una sola recompensa; salir antes no entrega premios. La visibilidad gráfica se comprueba además de los cambios de contador.

## Evolución al modo social

Las cuentas, visitas entre usuarios, salas privadas y minijuegos multijugador siguen pendientes. Un servidor deberá autenticar propiedad, inventario y resultados; cada premio tendrá un identificador idempotente. El estado local no se importará como prueba fiable de recursos.

Primero se validarán cuentas y visitas asincrónicas; después encuentros en tiempo real para grupos pequeños, con permisos, reconexión, bloqueo y reporte.
