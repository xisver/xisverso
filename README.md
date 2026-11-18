# Xisverso

**Un mundo vivo de XisSoft.**

Xisverso combina **Xisver + universo**. Es un juego de mascotas originales: incubar, cuidar, explorar, cocinar y volver a encontrarse con las criaturas que han crecido contigo. Mascotas, huevos, decoraciones y escenarios se dibujan en Canvas 2D, sin sprites ni modelos externos. La partida y su economía se conservan en este navegador; las visitas opcionales con Firebase comparten una vista del refugio.

## Qué puedes hacer

- Elegir un huevo **Moteado, Rayado o Estelar** y un bioma de crianza: bosque, costa o tundra.
- Criar una mascota desde **huevo → bebé → joven → adulto**, con nombre editable, necesidades, vínculo y progreso.
- Acariciar tantas veces como quieras; después de nacer, alimentar, bañar y ayudar a descansar.
- Dejar libre a un adulto y cuidar otro huevo. Los adultos permanecen en tu colección, pueden acompañar expediciones y aparecen ocasionalmente en su bioma.
- Viajar entre Bosque Susurro, Costa Nácar y Tundra Aurora conservando el origen y los rasgos de cada mascota.
- Enviar adultos propios a explorar, ver cómo recolectan y reunir ingredientes. Puedes hacer dos salidas al día, separadas por ocho horas; los adultos libres también pueden salir mientras crías otro huevo.
- Jugar siete minijuegos: seis aventuras de 20 segundos, incluido un baile con música, y el reto de encontrar a tu mascota bajo cocos en tres rondas de dificultad creciente.
- Mezclar hasta tres ingredientes en una cocina a pantalla completa, descubrir doce recetas y progresar por seis niveles de cocina.
- Ganar puntos jugando, comprar ingredientes y semillas en la tienda, y decorar el refugio con seis objetos, sin dinero real.
- Escuchar cuatro canciones en orden aleatorio y efectos de sonido, con controles independientes.
- Compartir una vista de tu refugio y visitar el de un amigo mediante un código con Firebase.

## Cómo jugar

La primera vez aparece una bienvenida para escoger huevo y hogar. La crianza empieza al pulsar **Comenzar nuestra historia**. Esperar o cambiar opciones antes de confirmar no guarda ni incuba una partida parcial. Una partida válida entra directamente al refugio.

En móvil, desliza el dedo sobre tu compañero para acariciarlo. Con ratón, toca el huevo para darle cariño. Cuando nazca, toca el suelo para caminar y elige Caricias, Alimentar, Burbujas o Siesta antes de tocar a la mascota. También puedes arrastrar una herramienta hasta ella. Al pulsar **Alimentar** aparece una ficha pequeña con la ración elegida y el Apetito que recupera. La flecha **>** permite cambiar el alimento y abrir la cocina. Seleccionar una herramienta o una ración no consume recursos; alimentar consume una porción preparada.

La hoja verde superior izquierda cambia el bioma. El letrero central muestra el nombre y bienestar de tu compañero. La brújula permite explorar y lleva una señal roja si aún no tienes adultos. Pulsa el nombre de tu compañero para consultar **Apetito**, energía, higiene, ánimo y crecimiento. Comer recupera Apetito; el tiempo lo reduce lentamente.

Tu mascota sigue creciendo incluso con el juego cerrado. Las caricias siguen disponibles con el Ánimo lleno. Solo aumentan el vínculo cuando el Ánimo está bajo; no dan experiencia ni adelantan el crecimiento. Las necesidades bajan lentamente según la etapa y el bioma, sin muerte permanente.

El bebé es una pequeña forma redonda o flotante con ojos y sin extremidades. El joven desarrolla más rasgos y extremidades pequeñas; el adulto tiene su estructura completa. La mascota ocupa menos pantalla y cambia de escala según la profundidad al caminar. Las mascotas libres aparecen en visitas breves de hasta 24 segundos por ciclo de 180 segundos; la colección sigue disponible aunque no estén en la escena.

La brújula permite elegir hasta tres adultos libres para acompañar a la mascota principal adulta, o enviar solo adultos libres si tu compañero aún crece. Una animación muestra la salida, la recolección y el regreso. El cupo se reinicia a medianoche de Ciudad de México, manteniendo ocho horas entre inicios.

**Cocinar** abre una pantalla completa. Añade de una a tres unidades de ingredientes al cuenco y mezcla cuatro veces con el dedo o el botón. Tras dos segundos de preparación se crea una ración. Hay doce ingredientes y doce recetas, además de **Comida Rara**, que recupera 8 de Apetito cuando la combinación no corresponde a una receta disponible. Una receta correcta entrega 12 XP de cocina y una mezcla rara 3 XP; cada 60 XP se sube de nivel, hasta el sexto. El nivel abre nuevas páginas del recetario e ingredientes, y las recetas se descubren al prepararlas. Salir antes de terminar cancela la mezcla sin consumir recursos.

La **Tienda** ocupa toda la pantalla y organiza sus estantes en Ingredientes y Decoración. Compra semillas, ingredientes y objetos con puntos de minijuegos; los ingredientes de niveles superiores cuestan más. Las semillas se usan para cocinar; esta versión no incluye un huerto. La alimentación se registra para futuras evoluciones, que todavía no se ramifican por dieta.

## Juegos, puntos y sonido

**Jugar** ofrece Luciérnagas en compañía, Lluvia de frutas, Salta los charcos, Baile del bosque con música, Sendero de recuerdos, Pelota al claro y **¿Bajo qué coco?**. Tu mascota recoge, salta, baila, recuerda o empuja según el juego. Las seis primeras sesiones duran 20 segundos; el reto de cocos permite hasta 60 segundos para acertar tres rondas cada vez más rápidas. Completar el reto de cocos exige los tres aciertos; completar una partida con aciertos recupera Ánimo y entrega entre 1 y 5 puntos, una sola vez. Salir antes no concede premios ni ingredientes. El huevo podrá participar después de nacer.

Las partidas nuevas empiezan sin puntos ni ingredientes y con una ración preparada de bienvenida. Los puntos obtenidos en los minijuegos permiten comprar un jardín de flores, un farol, setas luminosas, un banco, una fuente y un arco. Las compras se guardan, no se duplican y sus elementos aparecen en el mundo. También puedes usar los puntos para comprar ingredientes y semillas. No hay compras con dinero real.

La música de fondo reproduce las cuatro canciones proporcionadas para el juego: **Pixel Peace**, **Pixel Peace (versión alternativa)**, **Lofi Christmas (Remix)** y **Morning Nap in the Garden**. La lista se baraja y recorre las cuatro canciones antes de volver a mezclarse, evitando repetir inmediatamente la última. Cambiar de bioma conserva la canción. Los archivos se sirven con el juego y se cargan conforme se necesitan; los efectos siguen generándose con Web Audio. El navegador inicia el audio después de una interacción. Puedes activar o silenciar música y efectos por separado y ajustar sus volúmenes; las preferencias se conservan. Ocultar la página o desactivar la música pausa la pista y permite retomarla desde el mismo punto. Durante Baile del bosque, el fondo se atenúa para escuchar las notas del ritmo. La cocina añade sonidos de utensilios y mezcla.

## Guardados y visitas

La clave actual es `xisverso.save.v3`. Si falta o está dañada, se buscan respaldos válidos v2 y v1. La migración conserva identidad, nombres, recursos, experiencia y récord. Los jóvenes y adultos de v2 mantienen la etapa alcanzada y su progreso relativo; el hambre de v2 se convierte en Apetito (`100 - hambre`). La saciedad de v1 ya tenía la orientación de Apetito y se conserva. Los respaldos anteriores no se eliminan. La ampliación de cocina mantiene v3: las partidas anteriores conservan sus cinco ingredientes, tres comidas y demás recursos, y reciben contadores cero para el contenido nuevo. El nivel y los descubrimientos de cocina también quedan guardados.

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

El producto se llama Xisverso con independencia del nombre de la carpeta de trabajo.

**Desarrollado por XisSoft.** Copyright © 2026 XisSoft. Todos los derechos reservados. No se concede una licencia de código abierto en esta etapa.
