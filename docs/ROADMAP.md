# Ruta de Xisverso

La prioridad es cerrar ciclos jugables pequeños antes de ampliar el mundo. El orden indica dependencias, no fechas comprometidas. La integración exige pruebas locales y la publicación se verifica mediante el workflow asociado al commit.

| Hito                      | Alcance                                                                                                    | Criterio para avanzar                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Base y publicación        | Repositorio `xisver/xisverso`, PowerShell y GitHub Pages.                                                  | Instalar, probar, compilar y publicar siguiendo la guía.                                                |
| Refugio interactivo       | Mundo procedural, profundidad, hoja de viaje, nombre y bienestar centrales, brújula y caricias táctiles.   | Controles accesibles y utilizables en escritorio, móvil y movimiento reducido.                          |
| Crianza de cuatro etapas  | Huevo, bebé, joven y adulto; progreso visible sin tiempos de evolución.                                    | Mantener reloj real, identidad y etapas durante migración y ausencia.                                   |
| Convivencia local         | Adultos libres, apariciones ocasionales, colección y expediciones.                                         | Conservar adultos y evitar pérdidas o duplicados al liberar.                                            |
| Cocina y recetario        | Pantalla completa, doce ingredientes, doce recetas, Comida Rara y seis niveles de cocina.                  | Mezclar hasta tres unidades; descubrir recetas; liquidar una vez al terminar y no consumir al cancelar. |
| Mercado                   | Estantes de Ingredientes y Decoración; semillas y productos por nivel.                                     | Comprar con puntos de manera atómica y conservar inventario y compras.                                  |
| Exploración limitada      | Al menos un adulto participante, animación de recolección, dos salidas diarias y ocho horas entre inicios. | Conservar grupo y recompensa; reiniciar el cupo a medianoche de Ciudad de México sin saltar la espera.  |
| Siete minijuegos          | Seis actividades de 20 segundos y cocos de tres rondas dentro de 60 segundos.                              | Premiar una vez al cumplir el objetivo, sin entregar directamente ingredientes ni comida.               |
| Ambiente sonoro           | Cuatro canciones aleatorias, ritmo musical y efectos de interacción y cocina.                              | Iniciar tras interacción, conservar preferencias y pausar al ocultar la página.                         |
| Visitas con Firebase      | Vista compartida voluntaria y lectura por código.                                                          | Mantener permisos y publicar el cliente con su configuración pública.                                   |
| Evoluciones alimentarias  | Futuras ramas y rasgos según historial de recetas.                                                         | Definir reglas comprensibles que conserven identidad y partidas anteriores.                             |
| Cuentas y guardado remoto | Identidad recuperable, sincronización y permisos.                                                          | Definir propiedad y política de migración de recursos locales.                                          |
| Convivencia en vivo       | Futuras salas pequeñas, gestos y actividades entre usuarios.                                               | Reconectar sin duplicar recursos; disponer de bloqueo y reporte.                                        |
| Expansión compartida      | Cooperación, competición, especies, biomas y objetos.                                                      | Validar resultados y premios desde un servidor.                                                         |

## Iteración actual: cocina y aventuras (0.3.0)

El ciclo une incubar, criar un bebé, cuidar, crecer, dejar libre, explorar, cocinar y volver a criar. El crecimiento usa reloj real; cuidados y juegos no acortan las etapas. Las necesidades bajan lentamente por etapa y bioma; la ausencia limita el deterioro sin limitar la edad ni causar muerte permanente.

La apariencia cambia de estructura: bebé redondo o flotante sin extremidades, joven con rasgos adicionales y adulto completo. El origen fija la identidad visual; viajar solo cambia el paisaje. Los adultos liberados permanecen en la colección y visitan la escena en ventanas de hasta 24 segundos por ciclo de 180 segundos.

La hoja superior izquierda abre el cambio de bioma. El letrero central muestra el nombre de la mascota y cuatro barras de bienestar. La brújula no tiene texto visible y lleva una señal roja si no existen adultos propios. Se retiran el cartel «Otros rincones» y el pie de marca y guardado. En móvil, las caricias se hacen deslizando el dedo sobre la mascota; ratón y teclado mantienen sus alternativas.

Alimentar muestra la ración seleccionada, cuánto Apetito recupera y una flecha `>` para cambiarla. La cocina se abre desde ese selector o desde el menú y ocupa toda la pantalla. Permite combinar de una a tres unidades, mezclar cuatro veces y esperar dos segundos de preparación. El resultado consume los ingredientes y crea una ración una sola vez. Cerrar antes de terminar cancela sin consumo.

La cocina contiene doce ingredientes y doce recetas, además de Comida Rara (+8 Apetito). Una receta correcta entrega 12 XP y una mezcla rara 3 XP; cada 60 XP se sube un nivel, hasta el sexto. El nivel abre ingredientes y páginas del libro, y preparar una receta la descubre. La tienda también ocupa la pantalla completa y organiza sus estantes en Ingredientes y Decoración. Los ingredientes de niveles superiores cuestan más puntos. Las semillas son ingredientes comprables y mezclables; esta iteración no incorpora un huerto.

Una partida nueva empieza con cero puntos y cero ingredientes, más una ración de bienvenida. Los ingredientes proceden de exploraciones o compras con puntos. La mascota principal adulta puede salir con hasta tres adultos libres; si aún está creciendo, debe seleccionarse al menos un adulto libre y el compañero principal se queda en el refugio. La animación muestra a los participantes recolectando. Se permiten dos salidas por día calendario de Ciudad de México y al menos ocho horas entre inicios, aunque esa espera cruce la medianoche.

Luciérnagas en compañía, Lluvia de frutas, Salta los charcos, Baile del bosque, Sendero de recuerdos y Pelota al claro duran 20 segundos. Baile del bosque incorpora música sincronizada y atenúa la lista ambiental. **¿Bajo qué coco?** da hasta 60 segundos para encontrar a la mascota tres veces, con mezclas cada vez más rápidas. Los juegos entregan entre uno y cinco puntos y Ánimo al completar su objetivo con aciertos; el reto de cocos exige los tres aciertos. Cancelar no entrega premios. Los puntos permiten comprar ingredientes, semillas y seis decoraciones.

La música ambiental conserva las cuatro canciones alojadas con el juego, en rondas aleatorias sin repetición inmediata. Los efectos y utensilios se generan con Web Audio. Música y efectos tienen controles separados y se pausan al ocultar la página.

La ampliación mantiene `xisverso.save.v3`: añade experiencia y descubrimientos de cocina y nuevos contadores de ingredientes y platos. Los guardados anteriores reciben ceros para el contenido nuevo y conservan identidad, recursos, dieta, decoraciones y expediciones legítimas. La dieta sigue registrada para diseñar evoluciones futuras; todavía no define ramas ni cambios de apariencia.

## Criterios de verificación

- Apetito aumenta al comer y disminuye con el tiempo; todas las necesidades permanecen entre 0 y 100.
- Huevo, bebé y joven respetan sus duraciones reales; cuidados y juegos no las acortan.
- Las caricias se aceptan incluso con Ánimo lleno. Solo añaden vínculo si el Ánimo previo de una mascota nacida es menor de 30, sin XP, puntos ni crecimiento.
- La edad usa toda la ausencia; el deterioro se limita a ocho horas despierto y no hay muerte permanente.
- Las partidas v1 y v2 migran a v3 sin perder identidad, recursos, etapas alcanzadas ni progreso relativo.
- Las partidas v3 anteriores admiten el progreso de cocina y los nuevos contadores sin perder recursos ni expediciones.
- Liberar conserva al adulto en su colección y no duplica criaturas.
- Una expedición tiene al menos un adulto real, conserva su destino, grupo y recompensa y entrega los materiales una vez.
- El cupo de dos exploraciones se reinicia a medianoche de Ciudad de México; la espera de ocho horas persiste al cambiar de día, recargar o viajar.
- La brújula cambia su señal de bloqueo cuando hay un adulto propio y la animación utiliza los participantes seleccionados.
- Seleccionar ingredientes o cancelar la cocina no consume recursos. Terminar la preparación produce una sola ración y la experiencia correspondiente.
- Las mezclas de una a tres unidades respetan cantidades exactas, nivel, inventario y descubrimientos; una combinación sin receta disponible genera Comida Rara.
- El recetario y los ingredientes respetan el nivel de cocina, que se conserva al recargar.
- Comprar ingredientes y decoraciones verifica saldo y disponibilidad; las decoraciones no se compran dos veces.
- Los seis juegos de 20 segundos premian aciertos una vez. Cocos requiere tres aciertos para premiar y cada ronda aumenta la velocidad.
- Los minijuegos no entregan directamente ingredientes ni raciones.
- La cocina, el mercado, la navegación y las caricias funcionan en móvil y escritorio; salir y usar teclado tienen alternativas accesibles.
- Música, ritmo y utensilios respetan volumen, silencio y visibilidad de la página.
- Firebase valida la vista compartida, deniega escritura ajena y no expone inventarios ni puntos.

Usar `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e` y `npm.cmd run check:pages` para las comprobaciones locales. Registrar los resultados después de ejecutarlos. Las comprobaciones de reglas Firebase se ejecutan por separado con `npm.cmd run test:firebase-rules`, Java 21 y los emuladores del proyecto `demo-xisverso`. `npm.cmd run check:firebase` comprueba el proyecto real, consume cuota y limpia sus vistas e identidades temporales; no forma parte de las pruebas locales habituales.

## Comunidad y siguientes pasos

Las visitas Firebase siguen compartiendo manualmente vistas del refugio por código. No incluyen listado de usuarios, interacción simultánea, sincronización de partidas ni recompensas remotas. La configuración y las verificaciones del proyecto se documentan en [FIREBASE.md](FIREBASE.md).

Antes de ampliar la comunidad, definir público y edades, normas, bloqueo y reporte. Un servidor deberá validar identidad, propiedad, inventario y premios de cualquier modo compartido. Reproducción, intercambios y economía entre usuarios se evaluarán después de validar esos límites.
