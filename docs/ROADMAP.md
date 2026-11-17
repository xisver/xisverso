# Ruta de Xisverso

La prioridad es cerrar ciclos jugables pequeños antes de ampliar el mundo. El orden indica dependencias, no fechas comprometidas.

| Hito                               | Alcance                                                                           | Criterio para avanzar                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Base                               | Identidad, repositorio, comandos y configuración de Pages.                        | Se puede instalar, probar, compilar y publicar siguiendo la guía.                             |
| Refugio interactivo                | Mundo procedural, cuidados por toque/arrastre, paseo, teclado y móvil.            | La mascota y los controles permanecen utilizables en los tamaños comprobados.                 |
| Crianza y convivencia local        | Huevo, joven, adulto, liberación, nuevo huevo y visitas a mascotas propias.       | Cada etapa se conserva; liberar no borra ni duplica adultos; viajar no altera el origen.      |
| Exploración y cocina               | Ingredientes por bioma, hasta tres compañeros libres, recetas y comida preparada. | El inventario no se vuelve negativo; recargar conserva la expedición y no duplica materiales. |
| Evoluciones alimentarias           | Definir ramas y rasgos según historial de recetas.                                | El diseño de dieta tiene reglas comprensibles y conserva identidad y partidas previas.        |
| Cuentas y visitas                  | Identidad, guardado remoto, amistades y permisos.                                 | Cada usuario solo modifica sus recursos y existe una política de migración local.             |
| Convivencia en vivo                | Salas privadas pequeñas, gestos y actividades entre usuarios.                     | Dos clientes ven el mismo resultado; reconectar no duplica recursos; hay bloqueo y reporte.   |
| Minijuegos compartidos y expansión | Cooperación, competición, nuevas especies, biomas y objetos.                      | El servidor valida resultados y premios; añadir contenido no obliga a rehacer el cuidado.     |

## Iteración de crianza

El siguiente ciclo une incubar, cuidar, crecer, dejar libre, explorar y cocinar para otra cría. Los adultos permanecen en el bioma donde se liberaron y pueden volver a encontrarse con su nuevo compañero. La colección y las interacciones de esta etapa pertenecen a una misma partida local.

El origen del huevo fija características procedurales. `currentBiome` solo representa una visita; no cambia a una criatura de bosque por otra de costa. La costa usa su paisaje propio y los residentes conservan sus rasgos de origen.

La alimentación se registra para diseñar evoluciones futuras. En esta etapa no hay ramas alimentarias ni cambios de aspecto causados por una receta.

## Criterios de verificación

- Hambre usa 0 como ausencia de hambre; comer la reduce y el tiempo la aumenta.
- Las etapas y el progreso sobreviven a una recarga. Las partidas v1 migran sin perder identidad ni progreso.
- Solo se libera un adulto y ese compañero queda visitable; una segunda operación no duplica la criatura.
- Una exploración tiene como máximo tres adultos libres distintos, conserva su bioma de salida y entrega materiales una vez.
- Cocinar consume todos los ingredientes de manera atómica y alimentar consume una porción preparada.
- Las luciérnagas son visibles y activables; las recompensas de una partida se entregan una sola vez.
- Los controles mantienen alternativas de teclado y funcionan en móvil vertical y horizontal.

## Antes de abrir la comunidad

Definir edades y audiencia, permisos de visita, normas, bloqueo y reporte. Empezar con gestos predefinidos. El servidor deberá validar identidad, propiedad, inventario y resultados, sin aceptar el guardado local como prueba de recursos legítimos.

La reproducción entre mascotas, los intercambios, la economía entre usuarios y un mundo masivo se evaluarán después de validar crianza, exploración y convivencia básica.

Verificación de la iteración de crianza: 27 pruebas de dominio y 17 recorridos de interfaz. También se comprobó el juego compilado bajo `/xisverso/`, incluido el huevo, su incubación y el guardado v2.
