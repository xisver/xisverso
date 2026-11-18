# Xisverso

**Un mundo vivo de XisSoft.**

Xisverso combina **Xisver + universo**. Es un juego de mascotas originales: incubar, cuidar, explorar, cocinar y volver a encontrarse con las criaturas que han crecido contigo. Mascotas, huevos, decoraciones y escenarios se dibujan en Canvas 2D, sin sprites ni modelos externos. La partida y su economía se conservan en este navegador; las visitas opcionales con Firebase comparten una vista del refugio.

## Qué puedes hacer

- Elegir un huevo **Moteado, Rayado o Estelar** y un bioma de crianza: bosque, costa o tundra.
- Criar una mascota desde **huevo → bebé → joven → adulto**, con nombre editable, necesidades, vínculo y progreso.
- Acariciar tantas veces como quieras; después de nacer, alimentar, bañar y ayudar a descansar.
- Dejar libre a un adulto y cuidar otro huevo. Los adultos permanecen en tu colección, pueden acompañar expediciones y aparecen ocasionalmente en su bioma.
- Viajar entre Bosque Susurro, Costa Nácar y Tundra Aurora conservando el origen y los rasgos de cada mascota.
- Explorar con hasta tres adultos libres, reunir ingredientes y preparar tres recetas. Puedes hacer dos salidas cada 24 horas, separadas por ocho horas.
- Jugar seis minijuegos de 20 segundos en los que participa tu mascota.
- Ganar puntos jugando y comprar seis decoraciones para el mundo, sin dinero real.
- Escuchar música ambiental propia de cada bioma y efectos de sonido, con controles independientes.
- Compartir una vista de tu refugio y visitar el de un amigo mediante un código con Firebase.

## Cómo jugar

La primera vez aparece una bienvenida para escoger huevo y hogar. La crianza empieza al pulsar **Comenzar nuestra historia**. Esperar o cambiar opciones antes de confirmar no guarda ni incuba una partida parcial. Una partida válida entra directamente al refugio.

Toca el huevo para darle cariño. Cuando nazca, toca el suelo para caminar y elige Caricias, Alimentar, Burbujas o Siesta antes de tocar a la mascota. También puedes arrastrar una herramienta hasta ella. Al pulsar **Alimentar** aparece una ficha pequeña con la ración elegida y el Apetito que recupera. La flecha **>** permite cambiar el alimento y abrir la cocina. Seleccionar una herramienta o una ración no consume recursos; alimentar consume una porción preparada.

Pulsa el nombre de tu compañero para consultar **Apetito**, energía, higiene, ánimo y crecimiento. Comer recupera Apetito; el tiempo lo reduce lentamente.

Tu mascota sigue creciendo incluso con el juego cerrado. Las caricias siguen disponibles con el ánimo lleno y no aumentan vínculo, experiencia ni crecimiento. Las necesidades bajan lentamente según la etapa y el bioma, sin muerte permanente.

El bebé es una pequeña forma redonda o flotante con ojos y sin extremidades. El joven desarrolla más rasgos y extremidades pequeñas; el adulto tiene su estructura completa. La mascota ocupa menos pantalla y cambia de escala según la profundidad al caminar. Las mascotas libres aparecen en visitas breves de hasta 24 segundos por ciclo de 180 segundos; la colección sigue disponible aunque no estén en la escena.

El letrero **Explorar** inicia una salida y permite recoger los materiales al terminar. Es la única fuente de ingredientes nuevos; el panel muestra las salidas disponibles y la espera hasta la siguiente. La cocina muestra ingredientes, recetas y raciones. La dieta se registra, pero todavía no decide ramas de evolución ni cambios de aspecto.

## Juegos, puntos y sonido

**Jugar** ofrece Luciérnagas en compañía, Lluvia de frutas, Salta los charcos, Baile del bosque, Sendero de recuerdos y Pelota al claro. Tu mascota recoge, salta, baila, recuerda o empuja según el juego. Cada sesión dura 20 segundos; completar una partida con aciertos entrega entre 1 y 5 puntos, una sola vez. Salir antes no concede premios ni ingredientes. El huevo podrá participar después de nacer.

Las partidas nuevas empiezan sin puntos y con una ración preparada de bienvenida. Los puntos permiten comprar un jardín de flores, un farol, setas luminosas, un banco, una fuente y un arco. Las compras se guardan, no se duplican y sus elementos aparecen en el mundo. No hay compras con dinero real.

La música ambiental combina piano suave, frases espaciadas y una reverberación ligera. Es una composición original generada con Web Audio, al igual que los efectos, sin descargar pistas ni usar servicios externos. El navegador inicia el audio después de una interacción. Puedes activar o silenciar música y efectos por separado y ajustar sus volúmenes; las preferencias se conservan y el audio se pausa al ocultar la página.

## Guardados y visitas

La clave actual es `xisverso.save.v3`. Si falta o está dañada, se buscan respaldos válidos v2 y v1. La migración conserva identidad, nombres, recursos, experiencia y récord. Los jóvenes y adultos de v2 mantienen la etapa alcanzada y su progreso relativo; el hambre de v2 se convierte en Apetito (`100 - hambre`). La saciedad de v1 ya tenía la orientación de Apetito y se conserva. Los respaldos anteriores no se eliminan.

Cada navegador, dispositivo y origen conserva su propia partida. Borrar sus datos elimina ese guardado. El inventario y los puntos son locales y modificables; no constituyen recursos verificados para competir o comerciar entre usuarios.

Las visitas de Firebase son voluntarias: se comparte manualmente una vista con nombre, bioma, apariencia de la mascota y decoraciones. Un amigo la abre con el código exacto. No se publica un directorio de usuarios ni se suben inventario, puntos o el guardado completo. El dueño puede retirar la vista. No hay interacción simultánea ni recompensas remotas.

La aplicación utiliza el proyecto Firebase **Xisverso** (`xisverso-xissoft-20261117`), con aplicación web registrada, acceso anónimo y Firestore Standard gratuito en `nam5`, con facturación desactivada. Las reglas superaron 74 comprobaciones en emulador y el flujo real de visitas está verificado. Las compilaciones de Pages reciben la configuración pública desde las variables del repositorio. Consulta [Configuración de Firebase](docs/FIREBASE.md).

## Ejecutar y verificar con PowerShell

Requiere Node.js 24 y npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre personalmente http://127.0.0.1:4173/ o la dirección que muestre Vite. También puedes usar `powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1`; esa opción solo afecta a ese proceso.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run check:pages
```

Las pruebas de dominio comprueban simulación, migración y economía; las de interfaz ejercitan los flujos con Chrome aislado y sin ventana en el puerto 4174. Requieren Google Chrome instalado y no usan los datos del navegador personal. `build` comprueba TypeScript y genera `dist/`; `check:pages` comprueba los recursos y la persistencia bajo `/xisverso/`. Las pruebas locales no sustituyen la verificación de Firebase contra un proyecto configurado.

Las comprobaciones de Firebase se ejecutan por separado:

```powershell
npm.cmd run test:firebase-rules
npm.cmd run check:firebase
```

`test:firebase-rules` requiere Java 21 en `PATH` y usa los emuladores de Auth y Firestore con el proyecto de prueba `demo-xisverso`, sin consumir cuota remota. `check:firebase` consume una pequeña parte de la cuota real: crea dos identidades anónimas temporales, publica una vista, la visita desde la segunda sesión y la retira. El recorrido real aprobó la conservación de identidad, inventario y puntos del visitante, la denegación de una nueva visita tras retirar la vista y la limpieza de las vistas e identidades de prueba.

## Desarrollo y publicación

Tecnologías: TypeScript, Vite, Canvas 2D, Web Audio y Firebase modular para las visitas opcionales. La simulación está separada del dibujo, la interfaz y la conexión remota.

- [Ruta del proyecto](docs/ROADMAP.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Decisiones de diseño y tecnología](docs/DECISIONS.md)
- [Publicar en GitHub Pages con PowerShell](docs/GITHUB_PAGES.md)
- [Configurar visitas con Firebase](docs/FIREBASE.md)

El repositorio es [xisver/xisverso](https://github.com/xisver/xisverso) y el sitio existente está publicado en [GitHub Pages](https://xisver.github.io/xisverso/). Los cambios locales no aparecen allí hasta que se suben y termina el workflow de publicación de `main`. `build:pages` genera la base `/xisverso/` y los scripts no cambian automáticamente la visibilidad del repositorio.

La carpeta de este checkout es `C:\Users\Lenovo\Documents\ChatGPT\Xisverso`; el nombre del producto es Xisverso.

**Desarrollado por XisSoft.** Copyright © 2026 XisSoft. Todos los derechos reservados. No se concede una licencia de código abierto en esta etapa.
