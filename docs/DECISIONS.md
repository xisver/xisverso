# Decisiones de Xisverso

Estas decisiones pueden revisarse con las pruebas del juego.

## Identidad y plataforma

**Xisverso** combina Xisver y universo. El desarrollo se firma **XisSoft** y el lema es «Un mundo vivo de XisSoft». Navegador, TypeScript, Vite y Canvas 2D comparten una base entre computadora y móvil. La partida y su economía son locales; Firebase añade visitas voluntarias a vistas del refugio.

El repositorio es `xisver/xisverso` y el sitio existente se publica en GitHub Pages. Cada actualización llega al sitio después de superar la validación y completar el workflow de publicación. El nombre de la carpeta física puede variar entre equipos sin cambiar la identidad del producto.

## Arte procedural, tamaño y profundidad

Huevos, cuerpos, rasgos, decoraciones y fondos se construyen con formas y curvas. La semilla y el bioma de origen fijan la identidad visual. Visitar otro lugar cambia el paisaje, sin transformar a la mascota.

Cada etapa cambia la estructura: un bebé redondo o flotante, con ojos y sin extremidades; un joven con más detalles y extremidades pequeñas; un adulto completamente formado. El menor tamaño deja más mundo visible. El movimiento se ancla al suelo, ajusta la escala según la profundidad y ordena criaturas y objetos por su posición.

La simulación permanece separada del dibujo. La escena respeta movimiento reducido y conserva alternativas de teclado y táctiles. En móvil se acaricia deslizando el dedo sobre la mascota.

La hoja superior izquierda cambia de bioma y el letrero central muestra el nombre y cuatro barras de bienestar. La brújula sustituye el texto de exploración y lleva una señal roja si no hay adultos propios. Se retiran «Otros rincones» y el pie de marca y guardado para dejar más espacio al mundo.

Referencias de las APIs utilizadas: [formas en Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes), [animación](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations) y [movimiento reducido](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

## Elegir el primer compañero

La primera partida ofrece tres huevos —Moteado, Rayado y Estelar— y tres biomas. Los patrones son una elección visual, sin ventajas de cuidado ni ramas alimentarias anticipadas.

La confirmación inicia la incubación y el guardado. Los borradores no avanzan ni crean partidas parciales. Las partidas existentes conservan identidad y entran directamente al refugio. La semilla mantiene el patrón dentro del esquema v3.

## Crecer sin prisas

El huevo tarda cinco horas en nacer como bebé; el bebé necesita otras veinte horas para ser joven y el joven tres días para ser adulto. Son duraciones por etapa, con 97 horas acumuladas hasta adulto. El reloj real continúa cuando el juego está cerrado.

Estos tiempos son reglas internas de diseño. La interfaz muestra etapa y progreso, sin explicar las horas que tarda cada evolución ni mostrar una cuenta atrás.

Cuidados, recetas y minijuegos no saltan esas duraciones. Las caricias permanecen disponibles incluso con el Ánimo lleno. En mascotas nacidas añaden dos puntos de vínculo solo si el Ánimo previo es menor de 30; al recuperar ese nivel dejan de incrementar el vínculo. Se respeta el máximo de 100. No dan experiencia, puntos ni crecimiento, y acariciar el huevo no añade vínculo. El vínculo también puede aumentar por otros cuidados y actividades.

Al liberar un adulto, permanece en la colección y en el bioma donde se liberó mientras empieza la crianza de otro huevo. Sus apariciones en la escena son ocasionales: ventanas breves de hasta 24 segundos en ciclos de 180 segundos. Estar ausente de la escena no elimina al adulto ni impide seleccionarlo para una expedición.

## Bienestar y cocina

Internamente, **Apetito** usa 100 para lleno y 0 para mucha hambre. Comer lo aumenta y el tiempo lo reduce. Energía, higiene y ánimo mantienen la misma orientación de bienestar. Todas las necesidades están entre 0 y 100; la interfaz muestra sus barras y valores, sin explicar los extremos de Apetito.

El deterioro es lento y varía por etapa y bioma. Una ausencia larga limita el deterioro a ocho horas despierto, mientras la edad sigue avanzando durante toda la ausencia. No hay muerte permanente.

Alimentar muestra una ficha compacta encima del botón con la receta seleccionada, la recuperación de Apetito y una flecha para cambiarla; el selector permite acceder a la cocina. Elegir o llevar una herramienta no gasta recursos; cocinar descuenta ingredientes y alimentar consume una ración. La dieta se conserva para futuras evoluciones alimentarias, que todavía no están definidas.

La cocina y la tienda se presentan a pantalla completa. La cocina usa doce ingredientes y doce recetas, además de Comida Rara (+8 Apetito). Una preparación mezcla de una a tres unidades exactas, con cuatro gestos y dos segundos de cocción. Solo la liquidación final consume ingredientes y produce una ración; cerrar antes cancela sin consumo.

La experiencia de cocina abre seis niveles y nuevas páginas del recetario: 60 XP por nivel, 12 XP por receta correcta y 3 XP por mezcla rara. Preparar una receta la descubre. Los ingredientes de nivel superior requieren más puntos en la tienda, organizada en estantes de Ingredientes y Decoración. Las semillas se compran y se mezclan como ingredientes; no se añade un huerto.

## Explorar, jugar y decorar

Las expediciones requieren al menos una mascota adulta participante y aceptan hasta tres adultos libres diferentes como acompañantes. Los adultos libres pueden salir mientras la mascota principal sigue creciendo; esta no participa en la expedición. Destino, grupo y materiales se fijan al salir para impedir cambios de recompensa al viajar o recargar. Los materiales se reclaman una sola vez al terminar.

La partida nueva empieza con cero puntos, cero ingredientes y una ración de bienvenida. Explorar y comprar con puntos son fuentes de ingredientes; los de niveles de cocina superiores cuestan más. El historial `explorationStarts` guarda los dos últimos inicios y permite como máximo dos salidas por día calendario de Ciudad de México, con ocho horas entre inicios. El contador diario se reinicia a medianoche en `America/Mexico_City`; el descanso de ocho horas se mantiene aunque cambie el día. Viajar, recargar o liberar a la mascota no borra el historial.

Se conservan seis minijuegos de 20 segundos: buscar luciérnagas, recoger fruta, saltar charcos, bailar, recordar un sendero y empujar una pelota. Baile del bosque incorpora notas sincronizadas y atenúa la música de fondo. **¿Bajo qué coco?** añade un séptimo juego: hasta 60 segundos para encontrar a la mascota tres veces, con mezclas cada vez más rápidas.

Completar una de las seis actividades con aciertos aumenta el Ánimo y concede entre uno y cinco puntos. El premio de cocos exige los tres aciertos. Cancelar, terminar sin aciertos o no completar ese reto no concede puntos. Ningún minijuego entrega directamente ingredientes ni comida.

Los puntos locales obtenidos en los minijuegos (`coins`) permiten comprar ingredientes, semillas y seis decoraciones. Las compras son atómicas, no se duplican y quedan guardadas. No se incorporan pagos ni dinero real.

## Ambiente sonoro

La música ambiental usa las cuatro canciones proporcionadas por el propietario, alojadas junto al juego en `public/audio/`. Se reproducen por rondas aleatorias sin repetición inmediata, con independencia del bioma. No requiere un servicio de música externo. Los efectos de interacción y utensilios se siguen generando con Web Audio. La música empieza después de una interacción permitida por el navegador.

Música y efectos tienen activación y volumen independientes. Las preferencias persisten localmente. Ocultar la página o desactivar la música pausa la canción, que se retoma desde el mismo punto; viajar conserva la reproducción.

## Persistencia y visitas

El esquema v3 guarda Apetito, la etapa bebé, las decoraciones y, de forma aditiva, experiencia y descubrimientos de cocina. Los nuevos ingredientes y platos reciben contadores cero al recuperar partidas anteriores; los recursos ya obtenidos se conservan. La migración v2 conserva etapas y progreso relativo e invierte el hambre para obtener Apetito. La saciedad de v1 ya tiene la orientación correcta y su mascota se mantiene adulta. Se conservan los respaldos anteriores.

El historial de exploración se añade dentro de v3 y admite partidas anteriores sin ese campo. Una expedición ya iniciada conserva su salida en el historial. El nuevo saldo inicial y las restricciones económicas se aplican sin retirar recursos existentes de partidas migradas.

Las visitas Firebase comparten manualmente una vista mínima del refugio mediante un código. Auth anónima identifica al propietario y Firestore Lite realiza lecturas puntuales, sin directorio ni listeners permanentes. El dueño puede retirar la vista. El guardado, las necesidades, el inventario y los puntos permanecen locales.

El proyecto `xisverso-xissoft-20261117` utiliza aplicación web registrada, Auth anónima y base Firestore Standard gratuita en `nam5`, con facturación desactivada y sin productos de pago. Las reglas superaron 74 comprobaciones en emulador y el flujo real de publicación, visita y retirada quedó verificado, incluida la conservación de recursos del visitante y la limpieza de los datos e identidades temporales. El workflow de Pages compila el cliente con la configuración pública del proyecto. No hay juego simultáneo ni premios remotos.

La economía local es modificable. Antes de cuentas, clasificaciones o intercambios se decidirá cómo importar progreso; el servidor deberá validar propiedad, recursos y resultados sin confiar en el guardado local.

## Derechos y decisiones abiertas

Los derechos se reservan a XisSoft. No se incorpora una licencia de código abierto, un servicio de pago ni un despliegue público sin instrucciones del propietario.

Quedan abiertos público y edades, ramas de evolución según dieta, nuevas especies, equilibrio de juegos y cocina, identidad recuperable, guardado remoto y convivencia en vivo. Cualquier ampliación del alcance gratuito de Firebase deberá respetar sus cuotas y la decisión de no activar facturación.
