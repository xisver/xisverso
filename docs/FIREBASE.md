# Visitas a refugios con Firebase

Las visitas son postales compartidas de un refugio: muestran el paisaje, la apariencia de la mascota y las decoraciones del momento en que su dueño lo compartió. No son multijugador en tiempo real y no modifican la partida del anfitrión. No se suben necesidades, inventario, puntos, progreso ni el archivo de guardado.

Cada jugador decide cuándo **compartir**, actualizar o retirar su postal. El código es el identificador opaco de su sesión anónima. Quien recibe ese código puede abrir la postal con una conexión anónima a Firebase; también puede reenviarlo. No hay directorio público ni búsqueda de personas. Para retirar el acceso, el dueño elimina la postal desde el juego.

## Proyecto configurado

El proyecto real es **Xisverso**, con ID `xisverso-xissoft-20261117` y aplicación Web `1:854036862665:web:ddc57dcb230ce58a359f18`. [Abrir su consola](https://console.firebase.google.com/project/xisverso-xissoft-20261117/overview).

La base `(default)` utiliza **Standard** en la ubicación multirregional **nam5**, con `freeTier: true` y recuperación a un punto en el tiempo desactivada. El servidor oficial de Firebase confirmó **Billing Enabled: No**: no se vinculó una cuenta de facturación ni se activaron servicios de pago. La CLI creó esta base durante la preparación de la validación de reglas; su ubicación definitiva es nam5.

Se habilitó exclusivamente el proveedor **Anonymous** de Authentication y se desplegaron las reglas de `firestore.rules`. `.firebaserc` selecciona este proyecto; `.env.local`, ignorado por Git, contiene su configuración pública Web. Las cuatro variables `VITE_FIREBASE_*` también están preparadas como variables públicas del repositorio de GitHub para futuras compilaciones. No contienen credenciales administrativas.

Configurar estos servicios no publica una nueva versión del sitio. La función se habilita en una compilación que incluya las variables del proyecto.

## Configurar otro proyecto gratuito

1. En [Firebase Console](https://console.firebase.google.com/), crear o seleccionar un proyecto con plan **Spark**, sin vincular facturación. No activar Blaze, App Hosting, Cloud Functions ni Storage para esta función.
2. Registrar una aplicación **Web** y copiar `apiKey`, `authDomain`, `projectId` y `appId` desde su configuración pública.
3. En **Authentication → Sign-in method**, habilitar **Anonymous**. Añadir el origen del juego en dominios autorizados si la consola lo solicita.
4. Crear la base `(default)` de **Cloud Firestore, edición Standard**, elegir su región y aplicar el archivo `firestore.rules`. El modo de prueba con escritura abierta no sirve para publicar esta función.
5. Copiar `.env.example` a `.env.local` y completar sus cuatro variables `VITE_FIREBASE_*`. No incluir credenciales de servicio, claves privadas ni tokens administrativos. Reiniciar Vite después de cambiar la configuración.
6. Comprobar desde dos perfiles de navegador: el primero comparte un refugio y el segundo introduce su código. El segundo debe poder verlo, pero no editarlo. Retirar la postal desde el primero debe impedir nuevas visitas.

La aplicación sigue siendo local si las variables no están completas. No crea usuarios ni hace solicitudes a Firebase al cargar el juego: la conexión empieza después de una acción del jugador.

Para publicar las reglas mediante CLI, con una sesión personal autenticada y el ID real del proyecto:

```powershell
npx.cmd -y firebase-tools@latest deploy --only firestore:rules --project ID_REAL_DEL_PROYECTO
```

El comando anterior modifica las reglas del proyecto indicado. Revisar primero `firestore.rules` y seleccionar el proyecto correcto. No despliega el sitio ni cambia su plan.

## Mantener el coste en cero

Spark tiene cuotas; gratuito no significa ilimitado. Firestore ofrece actualmente una base gratuita por proyecto, 1 GiB almacenado, 50 000 lecturas diarias y 20 000 escrituras diarias. Mantener el proyecto en Spark evita habilitar consumo facturado. Al alcanzar un límite, la función puede dejar de estar disponible hasta que se restablezca la cuota.

La implementación usa Firestore Lite: una lectura puntual por visita y una escritura por publicación, sin escuchas en tiempo real, búsquedas globales ni sincronización automática. La postal contiene pocos campos y hay un intervalo mínimo de 30 segundos entre actualizaciones. Las cuotas de altas anónimas también se aplican; no se crea una identidad nueva en cada visita.

Retirar la postal conserva la espera de publicación en la sesión actual. La regla de 30 segundos del servidor limita las actualizaciones de un documento existente; borrar y recrear desde un cliente modificado puede evitar ese intervalo. Este mecanismo reduce escrituras normales y no constituye un límite global contra abuso.

Las reglas restringen escritura y borrado al dueño autenticado. Los invitados solo pueden leer un documento si conocen su código; las consultas de colección están denegadas. Se validan todos los campos, tipos, tamaños, etapas, biomas y decoraciones. Las recompensas del juego permanecen locales: no se aceptan como recursos legítimos de un servidor.

Un código compartido no equivale a una lista privada de amigos. Antes de una apertura masiva conviene añadir protección contra abuso, moderación y cuentas recuperables. La aplicación no incluye chat, intercambios ni recompensas por visitar.

## Identidad y dispositivos

La identidad anónima se conserva en el navegador del mismo origen. Borrar sus datos, cambiar de dispositivo o cambiar el dominio puede perder el acceso como dueño a una postal ya compartida. Antes de borrar los datos del navegador, retirar la postal. Para recuperar propietarios entre dispositivos haría falta vincular la identidad a un proveedor de acceso; esta versión no lo hace ni sustituye la partida local por un guardado remoto.

## Verificación local

La validación de postales y códigos tiene pruebas sin red:

```powershell
node --experimental-strip-types --test src/social/firebase.test.ts
```

`firebase.json` incluye puertos locales para Authentication (9099) y Firestore (8080). Con Firebase CLI y Java compatibles instalados, iniciar emuladores sin tocar un proyecto real:

```powershell
npx.cmd -y firebase-tools@latest emulators:start --only auth,firestore --project demo-xisverso
```

Para conectar Vite a ellos, utilizar un `.env.local` de desarrollo con `VITE_FIREBASE_PROJECT_ID=demo-xisverso`, valores locales de configuración web y `VITE_FIREBASE_USE_EMULATORS=true`. El enrutamiento a emuladores se ignora al compilar para producción.

Antes de desplegar, verificar en el emulador o en Rules Playground: propietario crea/actualiza/borra; invitado hace `get`; invitado no escribe ni borra; anónimo sin autenticar no lee; nadie hace `list`; campos adicionales, decoraciones repetidas y datos malformados se rechazan. Las pruebas de validación del cliente no sustituyen las de las reglas.

La batería reproducible usa solo el proyecto ficticio `demo-xisverso` y requiere Java 21 en `PATH`:

```powershell
npm.cmd run test:firebase-rules
```

Las reglas actuales superaron la compilación remota mediante `deploy --only firestore:rules --dry-run` y 74 comprobaciones con los emuladores oficiales antes de desplegarse. Se comprobaron publicación, visita, retirada, permisos de dueño e invitado, denegación de consultas y accesos privados, intervalo entre actualizaciones y 26 datos inválidos tanto al crear como al actualizar.

También pasó la comprobación contra el proyecto real: publicar, visitar desde otra sesión, conservar la partida del invitado y retirar el refugio. Puede repetirse con `npm.cmd run check:firebase`; esta prueba elimina las postales y las dos identidades anónimas temporales al terminar. Las cuotas gratuitas siguen aplicándose a esta comprobación. Las pruebas del cliente por sí solas no sustituyen la validación de reglas ni una revisión antes de abrir el juego a una audiencia amplia.

## Fuentes oficiales

- [Plan Spark y facturación](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
- [Cuotas gratuitas de Firestore](https://firebase.google.com/docs/firestore/quotas).
- [Acceso anónimo en la Web](https://firebase.google.com/docs/auth/web/anonymous-auth).
- [Persistencia de Authentication](https://firebase.google.com/docs/auth/web/auth-state-persistence).
- [Lecturas de Firestore](https://firebase.google.com/docs/firestore/query-data/get-data).
- [Reglas por campos y tipos](https://firebase.google.com/docs/firestore/security/rules-fields).
- [Pruebas de reglas y emuladores](https://firebase.google.com/docs/firestore/security/get-started).
