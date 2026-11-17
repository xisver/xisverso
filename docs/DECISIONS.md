# Decisiones de Xisverso

Estas decisiones pueden revisarse con las pruebas del juego.

## Identidad y plataforma

**Xisverso** combina Xisver y universo. El desarrollo se firma **XisSoft** y el lema inicial es «Un mundo vivo de XisSoft». Se comienza con navegador, TypeScript, Vite y Canvas 2D para compartir una base entre computadora y móvil.

## Arte procedural e identidad estable

Huevos, cuerpos, rasgos y fondos se construyen con formas y curvas. La semilla y el bioma donde se crea un huevo fijan la identidad visual de esa mascota. Visitar otro lugar cambia el paisaje, no la especie ni su aspecto.

La etapa de vida puede cambiar tamaño, proporciones y detalles de la criatura. Las evoluciones condicionadas por alimentación se definirán después; por ahora se registra la dieta y el crecimiento sigue un ciclo general de huevo, joven y adulto.

La simulación permanece separada del dibujo. Si se decide incorporar 3D, sus reglas de cuidado, identidad y guardado seguirán siendo aprovechables.

Referencias de las APIs utilizadas: [formas en Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes), [animación](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations) y [movimiento reducido](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

## Elegir el primer compañero

La primera partida ofrece tres huevos visuales —Moteado, Rayado y Estelar— y tres biomas de crianza. Los patrones no conceden ventajas de cuidado ni anticipan ramas de evolución por alimentación; el jugador elige la apariencia y el primer hogar que prefiera.

La elección se confirma una vez, antes de empezar la incubación. Las partidas existentes conservan su identidad y entran directamente al refugio. El esquema de guardado sigue en v2: la semilla preserva el patrón y el bioma de origen conserva los rasgos del lugar de crianza.

## Crecer y dejar vivir

Un huevo recibe calor, nace como joven y crece hasta adulto. Los tiempos son breves y configurables para probar el ciclo. El adulto se puede dejar libre en el lugar visitado: permanece disponible para visitarlo, convivir y acompañar expediciones. Esto abre la crianza de otro huevo sin borrar al compañero anterior.

Las mascotas libres pertenecen a la partida local. Su interacción inicial sirve para validar compañía dentro de un mismo mundo antes de construir convivencia entre usuarios.

## Cuidado y cocina

La escala de **Hambre** expresa necesidad de comer: 0 significa ausencia de hambre y 100 mucha hambre. Energía, higiene y ánimo son bienestar: altos es mejor. Todas permanecen entre 0 y 100 y la ausencia no causa muerte permanente.

La exploración proporciona ingredientes y la cocina los convierte en porciones. Alimentar consume comida preparada, mientras que elegir o transportar una herramienta no gasta recursos. El jugador puede reunir ingredientes aunque su nueva mascota todavía sea un huevo.

## Explorar en grupo

El letrero del mundo abre exploraciones. Se pueden invitar hasta tres adultos libres; un grupo mayor consigue más materiales. El bioma, los acompañantes y el resultado previsto se fijan al salir para que cambiar de lugar o recargar no permita modificar el resultado. La recompensa se entrega una vez al reclamarla.

## Jugar dentro del refugio

La escena es la pantalla principal. Jóvenes y adultos caminan al tocar el suelo; la mascota responde a herramientas por toque, teclado o arrastre. El bienestar, el crecimiento, los viajes, la colección y la cocina se consultan en diálogos a demanda.

## Persistencia y comunidad

El nuevo esquema v2 migra partidas v1 y conserva el respaldo anterior. La mascota previa se mantiene como adulta, el progreso permanece y la antigua saciedad se convierte en hambre.

La economía local es modificable. Antes de cuentas o clasificaciones se decidirá cómo importar ese progreso; un servidor deberá validar propiedad, recursos y resultados. Las futuras salas serán privadas y pequeñas.

## Derechos y decisiones abiertas

Los derechos se reservan a XisSoft. No se incorpora una licencia de código abierto ni un servicio de pago sin una decisión expresa del propietario.

Quedan abiertos: público y edades, duración definitiva de crianza, ramas de evolución según recetas y dieta, especies, equilibrio de exploración y cocina, infraestructura de cuentas y presupuesto para salas remotas.
