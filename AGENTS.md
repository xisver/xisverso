# Trabajo en Xisverso

- Ejecutar los comandos mediante PowerShell. No automatizar ventanas ni controlar el navegador del usuario sin una nueva petición explícita.
- Producto: Xisverso, desarrollado por XisSoft; interfaz y documentación en español.
- TypeScript con comprobación estricta. La simulación vive en `src/domain/game.ts`; no debe depender del DOM ni del almacenamiento.
- El arte de `src/render/scene.ts` es procedural Canvas 2D, sin sprites ni modelos externos.
- La versión inicial es local. No presentar usuarios, visitas o partidas remotas ficticias como funcionalidad real.
- Las futuras recompensas en línea deben validarse en un servidor. El estado local no es una prueba de recursos legítimos.
- Mantener guardados versionados, necesidades entre 0 y 100 y ausencia sin muerte permanente.
- Verificación: `npm.cmd test`, `npm.cmd run build`; cambios de interfaz o flujos, `npm.cmd run test:e2e` (Chrome instalado, ejecución sin ventana).
- No añadir licencias de código abierto, servicios de pago ni despliegues públicos sin instrucciones del propietario.
