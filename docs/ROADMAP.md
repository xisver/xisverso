# Ruta de Xisverso

La prioridad es terminar ciclos jugables pequeños antes de ampliar el mundo. Los hitos se ordenan por dependencias y no representan fechas comprometidas.

| Hito                                       | Alcance                                                                                                                 | Criterio para avanzar                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Base del proyecto                       | Identidad Xisverso, repositorio, estructura, decisiones y comandos de desarrollo.                                       | Otra persona puede instalar, ejecutar, probar y compilar el proyecto siguiendo el README.                                                             |
| 1. Primera mascota — versión inicial       | Una criatura procedural, cuatro necesidades, acciones de cuidado, nombre editable, vínculo y guardado local.            | Cada acción responde de forma visible; las necesidades permanecen entre 0 y 100; cerrar y volver conserva la partida válida.                          |
| 2. Primer ciclo de juego — versión inicial | Minijuego de luciérnagas, experiencia, monedas y selección de tres biomas de demostración.                              | La partida tiene principio y final; una sesión entrega una sola recompensa; los cambios de bioma conservan la identidad y el progreso.                |
| 3. Refugio de biomas                       | Varias mascotas propias, especies originales, hábitats e inventario; diferencias jugables entre bosque, costa y tundra. | Se puede cuidar a cada mascota sin perder su estado; añadir una especie no exige reescribir la simulación ni el guardado.                             |
| 4. Cuentas y visitas                       | Identidad, guardado remoto, amistades, permisos y visitas asincrónicas.                                                 | Un usuario solo modifica sus propios recursos; las visitas respetan permisos; hay recuperación de errores y política de migración del progreso local. |
| 5. Convivencia en vivo                     | Salas privadas para 2–4 usuarios, gestos y actividades sencillas entre mascotas.                                        | Dos clientes ven el mismo resultado; salir o reconectar no duplica recursos; existen bloqueo y reporte.                                               |
| 6. Minijuego multijugador                  | Una actividad cooperativa y, después, una competitiva.                                                                  | El servidor resuelve la partida y valida sus premios; reintentar una petición no vuelve a pagar una recompensa.                                       |
| 7. Expansión                               | Más especies, biomas, decoración, evolución y actividades según el uso real.                                            | El contenido se amplía con datos y componentes reutilizables; las nuevas funciones conservan las partidas existentes.                                 |

## Diseño del cuidado

- El bienestar importa más que acumular tareas repetitivas.
- La ausencia no causa muerte permanente; el deterioro tiene un límite configurable.
- El vínculo abre expresiones y comportamientos antes que ventajas competitivas.
- Cada bioma debe cambiar alguna decisión de cuidado, exploración o juego.
- Las variantes visuales de una criatura conservan una identidad estable mediante una semilla.

## Antes de abrir la comunidad

Definir edades y audiencia, normas de interacción, permisos de visita, bloqueo y reporte. Empezar con gestos predefinidos en vez de chat libre. Separar la simulación decorativa de las acciones que consumen o entregan recursos.

El guardado local es modificable. Su conversión a una cuenta requerirá una decisión explícita: importar como progreso casual sin clasificaciones, validarlo con límites o empezar una economía en línea independiente. No se debe aceptar como prueba una cantidad de monedas enviada por el cliente.

## Ideas para evaluar después

Reproducción, intercambio de criaturas, economía entre usuarios, mundo masivo y chat libre. Son propuestas abiertas: cada una cambia el equilibrio y la operación del juego, por lo que se decidirán después de validar el cuidado y la convivencia básica.

## Estado del arranque — 17 de noviembre de 2026

Los hitos 1 y 2 están implementados como prototipo local: una mascota procedural, cuidados, guardado, tres biomas de demostración y el minijuego. La base local está preparada; la creación y subida del repositorio remoto depende de completar la autenticación de GitHub CLI. Los hitos 3–7 siguen pendientes.

La verificación inicial incluye 13 pruebas de simulación y 7 pruebas de flujos de interfaz. El flujo de GitHub Actions está configurado para comprobar simulación y compilación cuando el repositorio se publique; todavía no se ha ejecutado remotamente.
