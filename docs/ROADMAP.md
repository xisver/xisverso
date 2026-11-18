# Ruta de Xisverso

La prioridad es cerrar ciclos jugables pequeños antes de ampliar el mundo. El orden indica dependencias, no fechas comprometidas. La integración exige pruebas locales y la publicación se verifica mediante el workflow asociado al commit.

| Hito                      | Alcance                                                                                         | Criterio para avanzar                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Base y publicación        | Repositorio `xisver/xisverso`, comandos y GitHub Pages existente.                               | Instalar, probar, compilar y publicar siguiendo la guía.                                |
| Refugio interactivo       | Mundo procedural, profundidad al caminar, mascota más pequeña, teclado y móvil.                 | Control visual y accesible alineado con el punto de apoyo y la perspectiva.             |
| Crianza de cuatro etapas  | Huevo, bebé, joven y adulto; progreso visible sin explicaciones de tiempo.                      | Mantener las duraciones internas, identidad y etapas durante migración y ausencia.      |
| Convivencia local         | Adultos libres, apariciones ocasionales, colección y expediciones.                              | Conservar adultos aunque no aparezcan y evitar pérdidas o duplicados al liberar.        |
| Alimentación y cocina     | Ficha compacta de comida, recuperación de Apetito y flecha para cambiar; cocina en el selector. | Elegir no consume; cocinar y alimentar descuentan exactamente sus recursos.             |
| Exploración limitada      | Mascota principal adulta, dos salidas por día de Ciudad de México y ocho horas entre inicios.   | Conservar historial y recompensas; reiniciar el cupo a medianoche sin saltar la espera. |
| Juegos y decoraciones     | Seis actividades con la mascota; Ánimo y uno a cinco puntos por partida con aciertos.           | Premiar una vez, sin entregar ingredientes ni comida, y guardar compras sin duplicados. |
| Ambiente sonoro           | Cuatro canciones en orden aleatorio y efectos independientes.                                   | Iniciar tras interacción, conservar preferencias y pausar al ocultar la página.         |
| Visitas con Firebase      | Vista compartida voluntaria y lectura por código; proyecto gratuito y flujo real verificados.   | Mantener las comprobaciones y publicar el cliente con su configuración pública.         |
| Evoluciones alimentarias  | Ramas y rasgos según historial de recetas.                                                      | Reglas comprensibles que conserven identidad y partidas anteriores.                     |
| Cuentas y guardado remoto | Identidad recuperable, sincronización y permisos.                                               | Propiedad correcta y política de migración de recursos locales.                         |
| Convivencia en vivo       | Salas privadas pequeñas, gestos y actividades entre usuarios.                                   | Reconexión sin duplicar recursos, bloqueo y reporte.                                    |
| Expansión compartida      | Cooperación, competición, especies, biomas y objetos.                                           | Resultados y premios validados por servidor.                                            |

## Iteración actual

El ciclo une incubar, criar un bebé, cuidar, crecer, dejar libre, explorar, cocinar y volver a criar. El crecimiento usa reloj real; los cuidados y las caricias no acortan las etapas. Las necesidades bajan lentamente por etapa y bioma; la ausencia limita el deterioro sin limitar la edad ni causar muerte permanente.

La apariencia cambia de estructura: bebé redondo o flotante con ojos y sin extremidades, joven con rasgos adicionales y adulto completo. El origen fija la identidad visual y viajar solo cambia el paisaje. Los adultos liberados permanecen en la colección y visitan la escena ocasionalmente, en ventanas de hasta 24 segundos por ciclo de 180 segundos.

Alimentar muestra una ficha pequeña con la comida seleccionada, cuánto Apetito recupera y una flecha `>` para elegir otra; la cocina se abre desde ese selector. Las barras conservan sus valores, sin explicar los extremos de Apetito. Las etapas mantienen sus reglas internas de crecimiento, pero la interfaz no explica cuántas horas tarda cada evolución.

La partida nueva empieza con cero puntos y cero ingredientes, más una ración de bienvenida. Explorar es la única fuente de ingredientes nuevos y requiere que la mascota principal sea adulta. Se permiten dos salidas por día calendario de Ciudad de México y al menos ocho horas entre sus inicios, aunque esa espera cruce la medianoche. Los adultos libres son acompañantes y no habilitan a un compañero que todavía crece. `explorationStarts` conserva las dos últimas salidas y se añade a v3 sin retirar los recursos que ya tenían las partidas anteriores.

Luciérnagas en compañía, Lluvia de frutas, Salta los charcos, Baile del bosque, Sendero de recuerdos y Pelota al claro duran 20 segundos. Completar una partida con aciertos aumenta el Ánimo y entrega de uno a cinco puntos para comprar flores, un farol, setas, un banco, una fuente y un arco. Los juegos no entregan ingredientes ni comida. La música ambiental reproduce cuatro canciones alojadas con el juego en orden aleatorio y sin repetición inmediata. Los efectos se generan localmente con Web Audio. Ambos tienen controles separados y la canción se pausa al ocultar la página.

La dieta sigue registrada para diseñar evoluciones futuras. Esta iteración no define ramas alimentarias ni cambios de aspecto causados por una receta.

## Criterios de verificación

- Apetito aumenta al comer y disminuye con el tiempo; su barra no explica los extremos de la escala.
- Huevo, bebé y joven respetan sus duraciones reales; cuidados y juegos no las acortan.
- Las caricias siempre se aceptan, incluso con Ánimo lleno. Solo añaden dos puntos de vínculo si el Ánimo previo de una mascota nacida es menor de 30, sin superar 100 ni dar XP, puntos o crecimiento.
- La edad avanza durante toda la ausencia; solo el deterioro se limita a ocho horas despierto.
- Las partidas v1 y v2 migran a v3 sin perder identidad, recursos, etapas alcanzadas ni progreso relativo.
- Los guardados v3 anteriores admiten el historial aditivo de exploración sin perder recursos ni expediciones en marcha.
- Solo se libera un adulto; permanece en colección y no se duplica al repetir la operación.
- Una expedición conserva destino y acompañantes y entrega materiales una sola vez.
- Solo una mascota principal adulta puede iniciar expediciones; tener adultos libres no habilita otras etapas.
- Se permiten dos inicios por día calendario de Ciudad de México y hay ocho horas entre ellos. El cupo se reinicia a medianoche; la espera persiste aunque cambie el día, se recargue o se viaje.
- Una partida nueva comienza con cero puntos y cero ingredientes; la ración de bienvenida se conserva.
- Cocinar, alimentar y comprar decoraciones consumen recursos de manera atómica.
- Los seis juegos mueven a la mascota, recuperan Ánimo y entregan entre uno y cinco puntos una sola vez al terminar con aciertos, sin añadir materiales ni comida. Las decoraciones se compran con esos puntos.
- La ficha de Alimentar muestra la receta elegida y su recuperación, y abre el selector con la flecha.
- Los paneles de crecimiento no muestran tiempos de evolución.
- Sonidos y música respetan controles, preferencias y visibilidad de la página.
- La profundidad, las formas por etapa y los controles funcionan en móvil y escritorio.
- Firebase valida la vista compartida, deniega escritura ajena y no expone inventarios ni puntos.

Usar `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e` y `npm.cmd run check:pages` para las comprobaciones locales. Registrar los resultados de la iteración después de ejecutarlos. Las reglas Firebase superaron 74 comprobaciones con `npm.cmd run test:firebase-rules` (Java 21 en `PATH`, emuladores y proyecto `demo-xisverso`). El recorrido real `npm.cmd run check:firebase` aprobó publicación, visita sin alterar identidad ni recursos del visitante, retirada que impide nuevas visitas y limpieza de vistas e identidades temporales. Este último comando consume cuota real; las comprobaciones en emulador no la consumen.

## Activación de visitas y siguientes pasos

El proyecto **Xisverso** (`xisverso-xissoft-20261117`) utiliza aplicación web, Auth anónima y Firestore Standard gratuito en `nam5`, con facturación desactivada. La conexión y el flujo real están comprobados. La compilación de Pages incorpora las variables públicas de Firebase. Las vistas se comparten manualmente por código; no hay listado de usuarios, listeners permanentes, interacción simultánea ni recompensas remotas.

Antes de ampliar la comunidad, definir público y edades, normas, bloqueo y reporte. Un servidor deberá validar identidad, propiedad, inventario y premios de cualquier modo compartido futuro. Reproducción, intercambios y economía entre usuarios se evaluarán después de validar esos límites.
