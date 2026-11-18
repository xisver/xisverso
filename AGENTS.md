# Trabajo en Xisverso

- Ejecutar los comandos mediante PowerShell. No automatizar ventanas ni controlar el navegador del usuario sin una nueva petición explícita.
- Producto: Xisverso, desarrollado por XisSoft; interfaz y documentación en español.
- TypeScript con comprobación estricta. La simulación vive en `src/domain/game.ts`; no debe depender del DOM ni del almacenamiento.
- El arte de `src/render/scene.ts` es procedural Canvas 2D, sin sprites ni modelos externos.
- La partida, el inventario y los puntos son locales. Firebase solo comparte vistas voluntarias del refugio por código; no presentar usuarios, visitas, despliegues o partidas remotas ficticias como funcionalidad real.
- Las futuras recompensas en línea deben validarse en un servidor. El estado local no es una prueba de recursos legítimos.
- Mantener guardados versionados y migración v1/v2 a v3, necesidades entre 0 y 100 y ausencia sin muerte permanente. Apetito usa 100 para lleno y 0 para mucha hambre.
- Respetar las etapas huevo (5 horas), bebé (20 horas), joven (3 días) y adulto. La edad usa todo el tiempo real; limitar solo el deterioro por ausencia. Las caricias siempre están permitidas. Solo añaden vínculo si el Ánimo previo es menor de 30; nunca dan XP ni crecimiento.
- La exploración requiere al menos una mascota adulta participante, principal o libre. Si la principal aún crece, seleccionar un adulto libre antes de salir. Máximo dos salidas por día calendario de Ciudad de México y ocho horas entre inicios. Explorar entrega ingredientes y la tienda también permite comprarlos con puntos. Los minijuegos dan puntos y Ánimo. La cocina mezcla de una a tres unidades, conserva nivel y recetas descubiertas, y consume ingredientes solo al completar la preparación.
- Verificación: `npm.cmd test`, `npm.cmd run build`; cambios de interfaz o flujos, `npm.cmd run test:e2e` (Chrome instalado, ejecución sin ventana).
- No añadir licencias de código abierto, servicios de pago ni despliegues públicos sin instrucciones del propietario.
