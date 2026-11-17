# Decisiones iniciales

Fecha: 17 de noviembre de 2026. Estas decisiones pueden revisarse a partir de las pruebas del juego.

## Identidad

**Xisverso** combina Xisver y universo. El desarrollo se firma como **XisSoft** y el lema inicial es «Un mundo vivo de XisSoft». El nombre es una decisión creativa del proyecto; no equivale a una búsqueda o registro de marca.

## Plataforma inicial

Comenzar con una aplicación de navegador en TypeScript, Vite y Canvas 2D. Esta ruta permite probar desde computadora y móvil con una misma base. Instalar como aplicación, publicar en tiendas o crear una versión de escritorio son decisiones posteriores.

## Mascotas y escenarios por código

Construir cuerpos, rasgos y fondos con formas y curvas. Utilizar semillas para variaciones reproducibles y parámetros para expresar estados. Evitar la dependencia inicial de sprites o modelos externos.

La simulación y la apariencia permanecen separadas. Si las pruebas justifican el 3D, se podrá añadir un renderizador y preparar modelos procedurales en Blender manteniendo las reglas de cuidado.

Referencias técnicas primarias:

- [Formas en Canvas — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes)
- [Animación en Canvas — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
- [Movimiento reducido — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

## Cuidado amable

Usar cuatro necesidades con escala de 0 a 100: saciedad, energía, higiene y ánimo. El abandono temporal no provoca muerte permanente. Limitar el deterioro por ausencia para permitir regresar a una partida recuperable.

## Alcance de la demostración

Una mascota y tres biomas seleccionables permiten comprobar la dirección visual. La gestión de varias mascotas, las especies desbloqueables y un sistema de hábitats completo pertenecen a etapas posteriores. Monedas, experiencia y recompensas son locales y carecen de valor real.

## Persistencia local primero

El prototipo guarda un estado versionado en el navegador. Antes de cuentas o clasificaciones se definirá cómo migrar un progreso que el usuario puede modificar. No se tratará el estado local como una fuente confiable de recursos en línea.

## Social por capas

Implementar cuentas y visitas asincrónicas antes de salas privadas en vivo. El servidor será la autoridad de los recursos, la propiedad y los resultados de juego. Iniciar las interacciones con gestos predefinidos y actividades pequeñas.

## Repositorio y derechos

Crear el repositorio de GitHub inicialmente privado. No añadir una licencia de código abierto sin una decisión expresa del propietario. Los derechos se reservan a XisSoft durante esta etapa de desarrollo.

## Pendientes de decisión

- Público y edades a quienes va dirigido el juego.
- Reglas de crecimiento, evolución y personalidad.
- Número de mascotas y coste de mantener hábitats.
- Política de importación del guardado local a una cuenta.
- Infraestructura y presupuesto para persistencia y salas remotas.
- Publicación, distribución y licencia definitiva.
