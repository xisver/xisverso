# Decisiones de Xisverso

Estas decisiones pueden revisarse con las pruebas del juego.

## Identidad y plataforma

**Xisverso** combina Xisver y universo. El desarrollo se firma **XisSoft** y el lema es «Un mundo vivo de XisSoft». Navegador, TypeScript, Vite y Canvas 2D comparten una base entre computadora y móvil. La partida y su economía son locales; Firebase añade visitas voluntarias a vistas del refugio.

El repositorio es `xisver/xisverso` y el sitio existente se publica en GitHub Pages. Cada actualización llega al sitio después de superar la validación y completar el workflow de publicación. La carpeta de este checkout se llama `Xisverso`.

## Arte procedural, tamaño y profundidad

Huevos, cuerpos, rasgos, decoraciones y fondos se construyen con formas y curvas. La semilla y el bioma de origen fijan la identidad visual. Visitar otro lugar cambia el paisaje, sin transformar a la mascota.

Cada etapa cambia la estructura: un bebé redondo o flotante, con ojos y sin extremidades; un joven con más detalles y extremidades pequeñas; un adulto completamente formado. El menor tamaño deja más mundo visible. El movimiento se ancla al suelo, ajusta la escala según la profundidad y ordena criaturas y objetos por su posición.

La simulación permanece separada del dibujo. La escena respeta movimiento reducido y conserva alternativas de teclado y táctiles.

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

## Explorar, jugar y decorar

Las expediciones requieren que la mascota principal sea adulta y aceptan hasta tres adultos libres diferentes como acompañantes. La colección de adultos libres no habilita a una mascota principal en una etapa anterior. Destino, grupo y materiales se fijan al salir para impedir cambios de recompensa al viajar o recargar. Los materiales se reclaman una sola vez al terminar.

La partida nueva empieza con cero puntos, cero ingredientes y una ración de bienvenida. Explorar es la única fuente de ingredientes nuevos. El historial `explorationStarts` guarda los dos últimos inicios y permite como máximo dos salidas por día calendario de Ciudad de México, con ocho horas entre inicios. El contador diario se reinicia a medianoche en `America/Mexico_City`; el descanso de ocho horas se mantiene aunque cambie el día. Viajar, recargar o liberar a la mascota no borra el historial.

Los seis minijuegos duran 20 segundos y hacen participar a la mascota: buscar luciérnagas, recoger fruta, saltar charcos, bailar, recordar un sendero y empujar una pelota. Puntúan acciones propias de cada actividad. Completar una partida con aciertos aumenta el Ánimo y concede entre uno y cinco puntos, sin ingredientes ni comida. Cancelar o terminar sin aciertos no concede puntos.

Los puntos locales obtenidos en los minijuegos (`coins`) permiten comprar seis decoraciones. Las compras son atómicas, no se duplican y quedan guardadas. No se incorporan pagos ni dinero real.

## Ambiente sonoro

Web Audio genera piano ambiental original por bioma y efectos de interacción. El piano usa armónicos suaves, ataque breve, caída larga, acordes espaciados, reverberación y pausas amplias. No copia melodías ni necesita muestras, descargas o servicios de audio. La música empieza después de una interacción permitida por el navegador.

Música y efectos tienen activación y volumen independientes. Las preferencias persisten localmente y ocultar la página pausa el audio para evitar que siga sonando en segundo plano.

## Persistencia y visitas

El esquema v3 guarda Apetito, la etapa bebé y las decoraciones. La migración v2 conserva etapas y progreso relativo e invierte el hambre para obtener Apetito. La saciedad de v1 ya tiene la orientación correcta y su mascota se mantiene adulta. Se conservan los respaldos anteriores.

El historial de exploración se añade dentro de v3 y admite partidas anteriores sin ese campo. Una expedición ya iniciada conserva su salida en el historial. El nuevo saldo inicial y las restricciones económicas se aplican sin retirar recursos existentes de partidas migradas.

Las visitas Firebase comparten manualmente una vista mínima del refugio mediante un código. Auth anónima identifica al propietario y Firestore Lite realiza lecturas puntuales, sin directorio ni listeners permanentes. El dueño puede retirar la vista. El guardado, las necesidades, el inventario y los puntos permanecen locales.

El proyecto `xisverso-xissoft-20261117` utiliza aplicación web registrada, Auth anónima y base Firestore Standard gratuita en `nam5`, con facturación desactivada y sin productos de pago. Las reglas superaron 74 comprobaciones en emulador y el flujo real de publicación, visita y retirada quedó verificado, incluida la conservación de recursos del visitante y la limpieza de los datos e identidades temporales. El workflow de Pages compila el cliente con la configuración pública del proyecto. No hay juego simultáneo ni premios remotos.

La economía local es modificable. Antes de cuentas, clasificaciones o intercambios se decidirá cómo importar progreso; el servidor deberá validar propiedad, recursos y resultados sin confiar en el guardado local.

## Derechos y decisiones abiertas

Los derechos se reservan a XisSoft. No se incorpora una licencia de código abierto, un servicio de pago ni un despliegue público sin instrucciones del propietario.

Quedan abiertos público y edades, ramas de evolución según dieta, nuevas especies, equilibrio de juegos y cocina, identidad recuperable, guardado remoto y convivencia en vivo. Cualquier ampliación del alcance gratuito de Firebase deberá respetar sus cuotas y la decisión de no activar facturación.
