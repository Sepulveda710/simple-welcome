# Contexto del proyecto — léeme antes de tocar código

Esta app se construyó en conversación con otra instancia de Claude (en claude.ai,
sin poder ejecutar la app de verdad — solo revisando sintaxis a ciegas). Ahora
que trabajas tú con acceso real a la terminal, puedes y debes correr la app,
ver errores reales, y corregir sobre la marcha — eso es justo lo que antes no
se podía hacer.

## Nombre y versión

La app se llama **Simple Welcome** (antes "app-bienvenida" — el nombre del
paquete en `package.json` y el `<title>` de `index.html` ya se actualizaron;
la carpeta en disco se quedó con su nombre viejo a propósito, renombrarla es
decisión de Abel, no algo para hacer sin que lo pida). Ícono: una "S"
estilizada en `assets/icono.svg` (fuente del ícono; `assets/icono.png` es
el render usado de verdad en `main.js`, regenerable con
`node_modules\.bin\electron.cmd scripts\generar-icono.js` si el SVG cambia).

**Versionado (Beta X.Y, guardado en `package.json` como X.Y.0):** Abel dejó
esto a criterio de quien trabaje en el código — sube tú misma la versión
según el tamaño del cambio, sin preguntar cada vez. Corrección explícita
de Abel (2026-09-12): **subir X (el número principal) casi nunca** — se
subió a Beta 6.0 por un rediseño de Configuración y Abel lo consideró
demasiado pronto para un cambio de número principal; se revirtió a
seguir la serie de Y (5.3). Regla real:
- Sube **Y** (ej. 5.2 → 5.3) para CASI TODO: features nuevas completas,
  rediseños de una pantalla, varios cambios chicos juntos, fixes,
  ajustes visuales — este es el bump por defecto.
- Sube **X** (ej. 4.0 → 5.0) SOLO para algo dramáticamente más grande que
  cualquiera de lo anterior — un cambio de arquitectura de fondo, o una
  acumulación tan grande que Y ya se sentiría absurdo (¿5.19?). Ante la
  duda, es Y — Abel prefiere corregir un X de más rebajándolo que ver la
  beta subir de número principal seguido.
- Estamos en **Beta 5.10** al momento de escribir esto (4.0 → 4.1: separar
  el tema claro/oscuro del modo cálido de lectura, que antes compartían la
  misma variable — ver "Decisiones técnicas importantes" abajo. 4.1 → 4.2:
  mejoras a la barra lateral del modo lectura. 4.2 → 5.0: portada del
  artículo + tinte adaptativo de color — este X sí se quedó, fue antes de
  la corrección de arriba. 5.0 → 5.1: splash de bienvenida al arrancar
  — **quitado por completo en 5.6, ver abajo; no existe en el código
  ahora mismo aunque las notas de 5.1 abajo lo describan en presente**.
  5.1 → 5.2: auditoría de seguridad y optimizaciones. 5.2 → 5.3: rediseño
  completo de Configuración. 5.3 → 5.4: Panel de desarrollo
  (Ctrl+Shift+D) — revertido en 5.5. 5.4 → 5.5: se quitó el Panel de
  desarrollo (le pasó justo el bug que se supone debía evitar). 5.5 →
  5.6: el splash SEGUÍA atascándose incluso arreglado (una segunda
  captura de Abel lo confirmó) — se quitó por completo, ver "Estado
  actual" al final de este archivo antes de tocar nada relacionado.
  5.6 → 5.7: la app quedó lista para empaquetarse e instalarse de verdad,
  con actualización automática. 5.7 → 5.8: inicio con Windows + el "por
  qué" de la app. 5.8 → 5.9: instalador nítido en pantallas de alta
  resolución, caja de comentarios y Configuración rediseñada estilo
  Windows 11 con edición de fuentes. 5.9 → 5.10: lector de noticias en voz
  alta (voces de Windows) y la Revista del Consumidor de Profeco como
  fuente — ver "Estado actual").

  Ojo: las versiones son X.Y numéricas, no decimales — 5.10 va DESPUÉS de
  5.9 (package.json "5.10.0", electron-updater lo compara bien con semver).

## Cómo le gusta trabajar a Abel (el usuario)

- **"Anota, no ejecutes"**: cuando Abel dice "anota" o "apunta" algo, es una
  señal explícita de que quiere ir acumulando una lista de pendientes para
  ejecutarlos todos juntos después — NO se debe tocar código en ese momento,
  ni aunque el cambio parezca trivial o urgente. Solo se ejecuta cuando dice
  "ejecuta", "continúa", o algo equivalente. Esto es una preferencia de
  workflow explícita, respétala igual que la anterior instancia aprendió a
  respetarla (después de una corrección directa de Abel).
- Le gusta entender el **por qué** de las cosas, no solo el qué — explica
  brevemente la causa raíz de los bugs, no solo la corrección.
- Antes de implementar features grandes o ambiguas, es mejor preguntar/aclarar
  el diseño primero (ver ejemplos abajo) en vez de asumir y construir.
- A veces pega prompts que él mismo le dio a Gemini pidiendo código o
  sugerencias de diseño. Revísalos con sentido crítico: Gemini no tiene
  acceso al código real de este proyecto, así que a veces asume estructuras
  HTML/CSS que no existen aquí, o sugiere cosas que ya están implementadas
  de otra forma, o que chocan con decisiones ya tomadas (ver historial abajo).
  Avísale cuando eso pase, en vez de aplicar el código tal cual.

### Reglas de flujo de trabajo con Git (acordadas el 2026-09-20)

Abel le pidió a Gemini unas reglas de desarrollo y las revisamos juntos;
esta es la versión adaptada a trabajar directo sobre sus archivos (no
copiando código desde un chat). Aplican siempre:

1. **Avance incremental**: tareas en pasos pequeños y probables; cada
   pieza se prueba (por código, sin automatizar pantalla real) antes de
   pasar a la siguiente.
2. **Ediciones puntuales, no reescribir archivos enteros**, y después de
   cada cambio dar a Abel un **resumen en palabras simples** de qué se
   tocó y por qué — no se espera que lea código línea por línea. Puede
   ver los cambios en verde/rojo en VS Code o GitHub si quiere.
3. **Commit en cada punto que funcione** (local, con mensaje claro).
   Subir a GitHub (`git push`) y publicar releases **solo con el OK de
   Abel**. Antes de sugerir el siguiente paso, cerrar el anterior con
   su commit.
4. **Dependencias**: antes de instalar algo, verificar que existe, está
   vigente y sin vulnerabilidades (`npm audit`), y explicar en una línea
   por qué se recomienda.
5. **Explicar la lógica**, corto y con el porqué (ya era su preferencia).
6. **Pedir permiso antes de borrar o rehacer desde cero** una parte del
   proyecto, explicando los riesgos. Solo se limpian sin preguntar
   artefactos generados por mí en la misma sesión (ej. un release a medias).
7. **Ramas para funciones nuevas** (`git switch -c nombre`): `main` se
   mantiene estable. Cuando la función está probada, preguntar a Abel
   "¿la pasamos a main?" y él solo responde sí/no — Abel no escribe
   comandos de git, los corro yo. Fixes chicos pueden ir directo a `main`.
8. **Probar antes de dar algo por bueno**, y decir claramente qué se
   probó y qué no (ej. el inicio con Windows solo se comprueba con la
   versión instalada).

## Prioridades del proyecto (en orden)

1. **Funcionamiento primero, estética después.** Así se construyó desde el
   día uno: primero la base funcional, después el pulido visual (Fluent
   Design, animaciones, Mica). Si hay que elegir entre "que funcione bien" y
   "que se vea perfecto", gana lo primero.
2. **Arquitectura modular, sin duplicar lógica.** Cada archivo en `src/` tiene
   una sola responsabilidad (ver `main.js` para ver cómo se conectan). Antes
   de escribir una función nueva, revisa si ya existe algo parecido que se
   pueda reutilizar/parametrizar en vez de copiar-pegar con variaciones.
3. **Todo lo editable va en `config/`, no hardcodeado.** Fuentes de noticias,
   nombre de usuario, ciudad, tema — todo vive en `config/*.json` o se
   gestiona desde la interfaz (Configuración), no como constantes en el código.

## Decisiones técnicas importantes (no las reviertas sin saber por qué)

- **El tema (claro/oscuro) y el modo cálido de lectura son dos estados
  independientes, a propósito** — NO los vuelvas a fusionar en una sola
  variable. Antes `config.tema` aceptaba 'claro'/'oscuro'/'calido' y el
  botón de modo cálido cambiaba ese mismo valor; el bug real era que si
  estabas en oscuro y prendías el modo cálido, TODA la app volvía a claro
  de golpe (porque nada más definía cómo se ve "oscuro + cálido" a la vez).
  Ahora `config.tema` solo es 'claro'/'oscuro' (aplicado en
  `document.documentElement.dataset.tema`) y `config.modoCalidoLectura` es
  un booleano aparte (aplicado como clase `.calido` en `#modo-lectura`,
  ver styles.css) — así conviven cualquier combinación de los dos.
- **Electron fijado a `>=38.0.0`** en `package.json` (no bajarlo). Versiones
  anteriores tienen un bug real de Chromium/Electron donde cualquier ventana
  translúcida (con `backgroundMaterial`) queda forzada a no-redimensionable.
- **`backgroundMaterial: 'mica'` sin `transparent: true`** en `main.js`. Se
  probó agregar `transparent: true` (sugerido por Gemini) y se descartó a
  propósito: es la combinación con más bugs reportados de Mica en Electron.
- **`Menu.setApplicationMenu(null)`** en `main.js`. Sin esto, Ctrl+R y F5
  quedan atados al "Recargar" del menú por defecto de Electron (recarga toda
  la ventana) en vez de a nuestro atajo personalizado que solo refresca los
  datos.
- El body es `background: transparent` para dejar ver el Mica nativo — si
  algún día Mica no se ve, primero descarta que sea un problema de Windows
  (Configuración > Accesibilidad > Efectos visuales, temas de alto
  contraste, drivers de video) antes de tocar el código; ya pasó una vez y
  no era un bug nuestro.
- El modo lectura usa `position: absolute` para el encabezado del artículo
  (flota sobre el contenido, no lo empuja) — esto fue a propósito para
  evitar que arrastrar la barra de scroll se sintiera trabado (el bug
  original era con `max-height` cambiando el alto scrolleable en cada frame).

## Estructura rápida

```
main.js              → arranca la ventana, conecta todos los módulos por IPC
preload.js            → puente seguro (contextIsolation) entre main y la interfaz
config/
  fuentes.json        → fuentes de RSS (editable desde Configuración > Mis fuentes)
  usuario.json        → nombre, ciudad, tema, noticias por página
src/                  → un módulo por responsabilidad (lector-rss, modo-lectura,
                         estado-lectura, configuracion, recordatorios, clima,
                         cita, guardados, gestion-fuentes, saludo, ventana-estado)
renderer/
  index.html          → toda la estructura (una sola página, varios paneles/modales)
  styles.css          → todo el CSS, con variables de tema en :root
  renderer.js          → toda la lógica de interfaz (sin build step, JS plano)
```

No hay paso de compilación (no bundler, no framework) — es Electron +
HTML/CSS/JS planos a propósito, para que sea fácil de razonar sin herramientas
extra.

## Estado actual

La app está en **Beta 4.0** (ver "Nombre y versión" arriba). Lo último
implementado (sesión 2026-09-10/11, la que subió de Beta 3 a Beta 4):

- **Píldora de selección en modo lectura** (`#pildora-seleccion`): al
  seleccionar texto en un artículo aparece un mini-menú flotante (copiar,
  traducir [pendiente de conectar], y buscar con IA).
- **Panel de búsqueda con IA** (`src/panel-ia.js`): el botón de la píldora
  abre una `WebContentsView` acoplada al borde derecho de la ventana con una
  búsqueda de Google en Modo IA (`udm=50`) para el texto seleccionado — no
  es una API, es la página real, sin recortar. Se cierra con el botón ✕
  flotante (`#boton-cerrar-panel-ia`).
- **Chía** (`renderer/expresiones-chia.js` + tarjeta debajo del calendario):
  mascota con carita ASCII (formato fijo `[ ojoIzq boca ojoDer ]`, 5 piezas
  separadas por espacios — cualquier expresión nueva debe seguir ese formato
  para que el parpadeo automático le funcione). Por ahora solo respira y
  parpadea en estado "relajado"; el catálogo completo de 20 expresiones ya
  existe para cuando haya algo real que decida el estado de ánimo (ver
  `mostrarExpresionChia` en `renderer.js`).
- **Aviso de conexión**: Chía se pone "triste" y aparece un banner
  (`#banner-conexion`) cuando `navigator.onLine` es `false`; al reconectar
  vuelve sola a "relajado" con un aviso breve de "de vuelta en línea".
- **Filtro "Ver por fuente"** (`#grid-fuentes`): además de las pestañas por
  categoría, se puede filtrar la lista de noticias a un solo sitio desde un
  grid de tarjetas con el color de identidad de cada fuente.
- **Cita del día en español**: `src/cita.js` usa FraseDelDia
  (`frasedeldia.azurewebsites.net`) en vez de ZenQuotes (que solo da citas
  en inglés) — es un proyecto de un solo mantenedor sin SLA, así que puede
  dejar de responder algún día; ya está pensado para fallar en silencio si
  pasa (el widget de Chía simplemente no muestra cita ese día).
- **Fuentes de RSS**: se quitó Genbeta (dejó de publicar hace 8 meses, no es
  un problema de la app) y El País Economía (Abel prefiere que Economía sea
  100% de medios mexicanos); se agregaron SoftZone (Tecnología) y Expansión,
  Infobae Economía (luego quitada por Abel) y La Jornada Economía (Economía).
  Antes de agregar una fuente nueva, probar que el feed responda 200 Y que
  tenga artículos de fecha reciente — un feed puede seguir respondiendo
  aunque el medio ya no publique nada nuevo (así se descubrió lo de Genbeta).

**Sesión 2026-09-11 (Beta 4.1 → 4.2): mejoras a la barra lateral del modo
lectura**, a partir de una lluvia de ideas con Abel:

- **Bug corregido**: `articulosModoLectura` (lo que ve la barra lateral y
  Anterior/Siguiente) ignoraba `fuenteActiva` — si filtrabas por un solo
  medio con "Ver por fuente" y abrías una noticia, la barra lateral mostraba
  igual toda la categoría (o todo, en "Para ti hoy") en vez de solo ese
  medio. Ahora `fuenteActiva` manda primero, igual que en la lista principal
  (ver `abrirModoLectura` en `renderer.js`).
- **Indicador de posición y sin leer** (`#resumen-barra-lateral`): "3 de 12 ·
  8 sin leer" arriba de la lista, calculado sobre `articulosModoLectura` —
  siempre refleja el filtro activo, no el total de noticias.
- **Separadores de fecha** ("Hoy" / "Ayer" / fecha) en la barra lateral,
  insertados sin reordenar el array (ya viene ordenado por fecha desde
  `lector-rss.js`) para no romper el orden de Anterior/Siguiente.
- **Restaurar scroll** de la lista principal (`scrollPrincipalGuardado`) al
  volver del modo lectura — `pintarListaDesdeCache()` reconstruye la lista
  desde cero y podía dejarte en otra posición si el alto de página cambió.
- **Auto-colapso en ventanas angostas** (`window.innerWidth < 900`): la
  barra lateral arranca colapsada si no hay espacio, en vez de competir con
  el artículo. El atajo J/K para Anterior/Siguiente ya existía de antes.

**Sesión 2026-09-11 (Beta 4.2 → 5.0): portada del artículo + tinte
adaptativo de color**, con boceto visual acordado con Abel antes de
construir (bocetos de intensidad y alcance en un artifact aparte):

- **Portada híbrida** (`insertarPortadaArticulo` en `renderer.js`): la
  miniatura del feed (`articulo.imagen`, la misma de las tarjetas y la
  barra lateral) siempre se muestra como portada del artículo — ya no
  depende de si Readability la conservó dentro del `textoHtml`. Si sí la
  conservó (misma ruta de imagen), se quita del texto extraído para no
  duplicarla (`mismaImagen`, compara por `pathname` porque el feed y el
  artículo casi nunca traen la URL idéntica — cambian los parámetros de
  tamaño).
- **Tinte adaptativo** (`src/color-articulo.js` + `aplicarTinteArticulo`
  en `renderer.js`): color dominante de la portada aplicado a toda la
  ventana del modo lectura (barra lateral incluida — Abel eligió alcance
  "toda la ventana" e intensidad "Medio" entre los bocetos). El cálculo
  corre en el proceso principal con `nativeImage` (no un `<canvas>` en el
  renderer) porque leer píxeles de una imagen externa desde el renderer
  choca con CORS — la mayoría de CDNs de noticias no manda
  `Access-Control-Allow-Origin`. El algoritmo promedia el tono (hue) solo
  de píxeles con saturación (ignora cielo/asfalto/fondos neutros) para
  quedarse con lo que "destaca" en la foto, no un promedio gris. Solo
  aplica en tema claro — el guard está en CSS
  (`html[data-tema="claro"] #modo-lectura.con-tinte ...`), no solo en JS,
  para que se apague solo si cambias de tema a media lectura. Se excluye
  a propósito cuando el modo cálido de lectura está activo (`:not(.calido)`
  en las reglas de `.panel-articulo`/`.encabezado-articulo`) — son dos
  tratamientos de fondo que no deben mezclarse, mismo espíritu que la
  separación tema/cálido de la sesión anterior.

**Sesión 2026-09-11 (Beta 5.0 → 5.1): splash de bienvenida al arrancar**,
a partir de un prompt/spec que Abel le había pedido a Gemini — Gemini
asumió cosas que no existen en este proyecto (una "barra izquierda de
IA" que en realidad es el calendario, un ícono de IA genérico en vez de
Chía) y ya se corrigieron al construir:

- **Una vez al día, no una vez por apertura** (pedido explícito de Abel):
  `src/splash-estado.js` guarda la fecha de la última vez que se mostró
  en un JSON aparte (mismo patrón que `ventana-estado.js`) y compara
  contra el día calendario actual — `debeMostrarSplashHoy()` marca el día
  como visto la primera vez que se llama, así que no hace falta una
  función aparte para "marcar como visto".
- **Reusa a Chía en vez de inventar un ícono de IA** — la cara del splash
  es `EXPRESIONES_CHIA.muyFeliz` (`[ ^ U ^ ]`), el mismo catálogo de
  `expresiones-chia.js` que ya existía.
- **Tres fases coordinadas desde `reproducirSplashBienvenida()` en
  `renderer.js`**: aparecer (fade+scale, CSS puro vía `@keyframes
  splash-entrada`), permanecer 1.5s, desvanecerse hacia arriba, y luego
  revelar `columna-izquierda` seguida 100ms después por `#saludo` (clases
  `.preparando-entrada` → `.entrada-arranque`, reutilizando el keyframe
  `entrada-fluent` que ya existía). Las tarjetas de noticias no se
  tocaron: ya tenían su propia entrada escalonada de antes
  (`crearTarjetaConRetraso`), Gemini pedía reinventar algo que ya estaba.
- **Sin parpadeos**: el overlay es visible por defecto en el HTML (no
  depende de que JS corra a tiempo) y `columna-izquierda`/`#saludo` se
  ocultan de entrada, antes incluso de saber si hoy toca splash — están
  tapados por el overlay durante esa consulta de todos modos. Si hoy ya
  se mostró, todo eso se deshace al instante, sin animación.

**Sesión 2026-09-11 (Beta 5.1 → 5.2): auditoría completa de seguridad y
optimización**, pedida explícitamente por Abel ("audita mi programa con
totalidad"). Hallazgo principal: el HTML de artículos/feeds externos se
metía en la interfaz sin sanitizar en varios lugares — corregido de
raíz, no parche superficial:

- **`src/modo-lectura.js` sanitiza con DOMPurify** el HTML que devuelve
  Readability antes de que cruce a la interfaz (reusa el mismo `window`
  de jsdom que ya se creaba ahí) — antes, un feed comprometido podría
  meter `<script>`, `onerror=""` o `href="javascript:..."` en el cuerpo
  de un artículo y se ejecutaría tal cual en el renderer.
- **`escaparHtml()` en `renderer.js`**, aplicado en los ~9 lugares donde
  se arma `innerHTML` a mano con texto que no es literal nuestro: título/
  fuente/categoría/imagen de artículos (vienen del feed RSS), nombre de
  "Mostrando: X" al filtrar por fuente, nombre/categoría/color en "Mis
  fuentes" y texto/hora/color de recordatorios (los escribe Abel a mano,
  pero igual se sanean por si algún día se conectan a un calendario
  externo — ver el pendiente de Outlook más abajo). Todo lo que ya usaba
  `textContent` (como `#lectura-titulo`) no necesitaba esto — el problema
  era solo en los `innerHTML` armados con template strings.
- **`@mozilla/readability` actualizado de 0.5.0 a 0.6.0** — `npm audit`
  marcó una vulnerabilidad real de denegación de servicio por regex
  (GHSA-3p6v-hrg8-8qj7) en versiones anteriores; sin parche disponible sin
  subir de versión. Confirmado que la API que usamos (`.parse()` con
  `.title`/`.content`/`.siteName`) no cambió.
- **CSP en `index.html`** (`script-src 'self'`, sin overrides): defensa en
  profundidad — bloquea cualquier `<script>` inline o `onerror=""` que se
  escapara de la sanitización de arriba, incluso si algún día se agrega
  otro lugar que meta HTML externo sin pasar por `escaparHtml`/DOMPurify.
- **`main.js`**: `abrirExterno` ahora valida que el enlace sea http(s)
  antes de pasarlo a `shell.openExternal` (podía venir de un `<a href>`
  dentro de un artículo externo); `will-navigate` bloqueado siempre (la
  interfaz nunca necesita navegar de verdad, solo cambiar de artículo por
  JS) y `setWindowOpenHandler` deniega ventanas nuevas — ambos evitan que
  contenido externo mande la ventana principal a cargar algo remoto con
  `preload.js` (y su `window.api`) todavía puesto encima.
- **Optimizaciones**: `cacheArticulos` en `modo-lectura.js` ahora tiene un
  tope de 60 artículos (FIFO) — antes crecía sin límite durante una sesión
  larga; `guardados.js` ya no reescribe el archivo en disco en cada
  apertura del panel si no había nada que depurar.
- **Comentario desactualizado corregido** en `preload.js` (decía "estas
  tres funciones" cuando ya son más de 20).

**Pendiente de decisión (NO se tocó solo):** `src/configuracion.js` y
`src/gestion-fuentes.js` guardan `config/usuario.json` y
`config/fuentes.json` en la carpeta del propio proyecto (relativo a
`__dirname`), no en `app.getPath('userData')` como el resto de los
módulos de estado (`ventana-estado.js`, `estado-lectura.js`,
`guardados.js`, `recordatorios.js`, `splash-estado.js`). Esto es a
propósito según el README original (archivos editables a mano, junto al
código) — pero si algún día se empaqueta la app con electron-builder (ya
anotado como pendiente futuro), esa carpeta queda de solo lectura (ej.
Program Files) y guardar cambios desde Configuración o "Mis fuentes"
fallaría. Migrar a `userData` es sencillo pero cambia dónde vive el
archivo que Abel edita a mano — hay que decidirlo con él, no asumirlo.

**Sesión 2026-09-11/12 (Beta 5.2 → 5.3): rediseño completo de
Configuración**, a partir de otro prompt/boceto de Gemini que Abel pidió
opinar antes de construir — como con el splash, Gemini asumió cosas que
no existen (una categorización de "cita del día" que la API de
FraseDelDia probablemente ni soporta, dos campos de "Ubicación"
redundantes). Esa parte de la cita del día NO se construyó a propósito
(Abel lo pidió explícitamente excluir) — todo lo demás sí. (Esto arrancó
como Beta 6.0 y se corrigió a 5.3 — ver la nota de versionado arriba,
Abel pidió no subir el número principal tan seguido.):

- **Version dinámica**: `acerca-de-version` ya no es texto fijo en
  `index.html` (decía "0.1.0" mientras la app iba por Beta 5) — sale de
  `app.getVersion()` (lee `package.json` solo, misma fuente que
  `npm start`) vía IPC nueva `obtener-version-app`, mostrada como
  "Beta X.Y".
- **Nuevos campos en `config/usuario.json`** (ver `VALORES_POR_DEFECTO`
  en `src/configuracion.js`): `formato24h`, `unidadTemperatura`
  ('celsius'/'fahrenheit', ver `src/clima.js` — usa el param
  `temperature_unit` de Open-Meteo), `caraChiaPredeterminada` (id de
  `EXPRESIONES_CHIA`), `mostrarSaludoInicio` (apaga el splash sin
  importar si "hoy toca" — ver `reproducirSplash` en `iniciar()`).
- **Selector de cara de Chía**: el catálogo completo de 20 expresiones
  como chips en Configuración — la elegida reemplaza el 'relajado' fijo
  como cara "de reposo" (`caraChiaPredeterminada`, variable de módulo en
  `renderer.js`); los estados contextuales (`triste` sin internet,
  `muyFeliz` en el splash) la siguen pisando temporalmente sin tocarse.
- **Toggle On/Off por fuente** (`src/gestion-fuentes.js`:
  `alternarFuenteActiva`, campo `activa` en cada fuente — las guardadas
  antes de este cambio se asumen `true` hasta que se apaguen a propósito):
  apaga temporalmente un medio sin borrar su color/categoría/URL.
  `lector-rss.js` filtra `activa !== false` antes de pedir noticias.
  "Mis fuentes" se rediseñó como tarjetas en 2 columnas (franja de color
  arriba + favicon real, mismo lenguaje visual que las tarjetas de "Ver
  por fuente" en la pantalla principal — antes eran dos estilos distintos
  para la misma idea) a pedido explícito de Abel, sobre el boceto de
  Gemini.
- **"Restablecer predeterminados"**: nueva `restablecerConfiguracion()`
  en `configuracion.js` — reemplaza TODO el archivo por
  `VALORES_POR_DEFECTO` (a diferencia de `guardarConfiguracion`, que
  mezcla). Pide confirmación (`confirm()`) antes de aplicar. No toca
  fuentes/leídos/guardados/recordatorios, solo esta pantalla.
- **Reordenado visualmente en 4 grupos** (Perfil y clima / Interfaz y
  noticias / Asistente Chía / Mis fuentes) en vez de una lista plana de
  campos — panel más ancho (480px), interruptores Fluent en vez de
  checkboxes nativos donde aplica.
- Probado sin automatización de escritorio: se inyectó JS de prueba
  temporalmente en `main.js` vía `webContents.executeJavaScript` (guardar
  cambios, alternar una fuente, leer los resultados por consola) y se
  quitó después — no dejar ese código si se vuelve a necesitar probar algo
  similar, rehacerlo temporalmente.

**Sesión 2026-09-12 (Beta 5.3 → 5.4 → 5.5): Panel de desarrollo,
construido y luego revertido en la misma sesión** — Abel pidió una
ventana con dev tools fáciles de usar para probar cosas sin esperar
(ejemplo que dio: el splash de bienvenida). Se construyó en 5.4
(Ctrl+Shift+D: reproducir splash a mano, selector de expresión de Chía,
simular conexión, muestras de tinte, abrir DevTools de Chromium), pero el
propio botón de "reproducir splash" dejó el overlay atascado a medio
desvanecer (una captura de pantalla de Abel lo confirmó: fondo blanco
difuminado sin texto/Chía visibles) — la causa real: nada impedía
disparar `reproducirSplashBienvenida()` dos veces a la vez (doble clic,
o clic mientras la anterior corría todavía), y dos corridas concurrentes
se pisaban los `setTimeout`/clases entre sí. Abel pidió revertir el panel
completo y dejar algo más simple. En 5.5:

- **Se quitó TODO el Panel de desarrollo** (HTML, CSS, JS, el IPC de
  DevTools, el atajo Ctrl+Shift+D) — si en el futuro hace falta algo así
  de nuevo, construirlo sabiendo que necesita protegerse contra
  reentradas desde el día uno (ver el punto siguiente).
- **La causa real quedó corregida de todos modos**: `reproducirSplashBienvenida()`
  ahora tiene un guard (`reproduciendoSplash`, con `try/finally` para
  nunca quedarse trabado en `true` aunque algo lance un error a medio
  camino) — una segunda llamada mientras la primera sigue corriendo
  simplemente no hace nada, en vez de correr en paralelo y corromper el
  estado de las clases CSS.
- **En su lugar**: un botón simple, "▶ Probar animación de bienvenida",
  dentro de Configuración > Asistente Chía — mismo resultado que pedía
  Abel (probar el splash sin esperar al día siguiente), sin la superficie
  extra del panel completo.
- Sigue en pie el fix de `overlay.remove()` → `classList.add('oculto')`
  de la sesión 5.4 (necesario para que el botón de Configuración pueda
  reproducirlo más de una vez por sesión) — eso no era el bug, era
  correcto y se quedó.
- Probado con JS inyectado temporalmente en `main.js` vía
  `webContents.executeJavaScript` (disparando el botón 5 veces seguidas
  de golpe y confirmando que solo una corrida real ocurre y termina
  limpia), quitado después de confirmar — sin automatizar clicks/pantalla
  reales.

**Sesión 2026-09-12 (Beta 5.5 → 5.6): el splash de bienvenida se quitó
por completo — no existe en el código en este momento.** Con el guard de
reentrada de 5.5 puesto, Abel lo probó igual y una SEGUNDA captura de
pantalla mostró el mismo síntoma (overlay `--superficie-fuerte` blureado
visible, sin Chía/texto, sin poder interactuar con nada salvo el scroll)
— así que el guard no era la causa real, o no era la única. La sospecha
más fuerte sin haberlo podido confirmar con consola en vivo: el
`@keyframes splash-entrada` estaba declarado directo en la regla base de
`.splash-contenido-bienvenida` (no en una clase que se agregara/quitara),
así que el truco de `void contenido.offsetWidth` para forzar un reflow en
`reproducirSplashBienvenida()` probablemente nunca reiniciaba de verdad
esa animación — pudo estar fallando incluso en la primerísima vez que
corría en el día, no solo al repetirla a mano. Abel pidió quitarlo entero
en vez de seguir parchando a ciegas ("mejor quitamos lo de la animación,
lo agreguemos después").

Se quitó de raíz: el overlay y su contenido de `index.html`, todo el CSS
(`@keyframes splash-entrada/salida`, `.preparando-entrada`/`.entrada-arranque`,
que solo existían para esto), `reproducirSplashBienvenida()` y toda la
lógica de decisión en `iniciar()`, el botón "Probar animación de
bienvenida" y el toggle "Saludo animado al iniciar" de Configuración.
`iniciar()` volvió a su forma simple de antes de la sesión 5.1 (columna-izquierda
y saludo visibles desde el primer frame, sin ocultarlos nunca).

**Lo que NO se tocó, a propósito, por si se retoma esto más adelante**:
`src/splash-estado.js` (el conteo de "una vez al día") y su IPC en
`main.js`/`preload.js` (`debeMostrarSplash`) se quedaron tal cual, sin
usarse — inertes pero listos para reconectar. El campo
`mostrarSaludoInicio` sigue en `VALORES_POR_DEFECTO` de
`configuracion.js` por la misma razón. `caraChiaPredeterminada` y su
selector en Configuración SÍ se quedaron activos — eso nunca fue parte
del bug, es una feature aparte que funciona bien.

Si se retoma el splash algún día: antes de reconstruirlo, verificar con
DevTools real (F12/inspeccionar) qué está pasando con la animación de
`.splash-contenido-bienvenida` en vivo — no repetir el patrón de esta
sesión de arreglar a ciegas sin consola. Vale la pena considerar
`element.getAnimations()` (Web Animations API) en vez de CSS
`animation` + reflow manual, que es más fácil de reiniciar de forma
confiable por código.

**Sesión 2026-09-15 (Beta 5.6 → 5.7): la app quedó lista para
empaquetarse, instalarse y actualizarse sola** — Abel preguntó cómo
asegurar que futuras ideas se puedan instalar encima sin perder datos ni
reinstalar a mano; se armó de una vez con la idea de "luego vamos a
chambear con GitHub" como siguiente paso (repo/owner reales, primer
release — eso quedó pendiente para esa sesión).

- **Se migraron `config/usuario.json` y `config/fuentes.json` a
  `%APPDATA%\simple-welcome`** (`src/configuracion.js` y
  `src/gestion-fuentes.js`) — antes vivían junto al código de la app, así
  que un instalador que actualiza la app los habría borrado en cada
  actualización (el mismo problema que ya evitaban `estado-lectura.json`,
  `guardados.json`, etc. desde siempre). `migrarSiHaceFalta()` copia (no
  mueve) el contenido viejo la primera vez que corre esta versión — ya
  confirmado en la práctica: el nombre, ciudad y las 8 fuentes de Abel
  pasaron completos. Los archivos viejos en `config/` se quedan como
  semilla de esa migración, ahora en `.gitignore` (tienen datos
  personales: nombre, ciudad, coordenadas).
- **`nativeTheme.themeSource = obtenerConfiguracion()...`** se movió de
  nivel de módulo (arriba de todo en `main.js`) a dentro de
  `app.whenReady()` — ahora que `obtenerConfiguracion()` usa
  `app.getPath('userData')`, necesita que la app esté lista antes de
  llamarse.
- **`app.setName('simple-welcome')` fijado explícitamente al principio de
  `main.js`**, antes de cualquier require — sin esto, si algún día
  `productName` ("Simple Welcome", con mayúsculas y espacio, para el
  instalador/accesos directos) se filtrara a `app.getName()`, la carpeta
  de `userData` cambiaría de nombre y toda la configuración/noticias
  leídas/guardados "desaparecerían" de la vista de la app (seguirían en
  disco, solo que en la carpeta vieja). Este único candado evita esa
  clase entera de bug para siempre, pase lo que pase con el branding.
- **`electron-builder` (empaquetador) + `electron-updater` (actualizador)
  instalados**, configuración en `package.json` (`"build"`): NSIS
  (`oneClick: false, perMachine: false` — instala por usuario, sin pedir
  permisos de administrador, necesario para que las actualizaciones
  automáticas se instalen solas sin ventana de UAC cada vez),
  `publish.provider: "github"` con `owner`/`repo` en placeholder
  (`TU-USUARIO-DE-GITHUB`/`TU-REPO`) hasta que exista el repo real.
  `config/` excluido del paquete a propósito (`"!config/**"` en
  `"files"`) — no tiene caso empaquetar los datos personales de Abel como
  si fueran una plantilla del producto, y ya no hace falta: la migración
  ya corrió, `userData` ya tiene todo.
- **`autoUpdater.checkForUpdatesAndNotify()`** en `main.js`, dentro de
  `app.whenReady()`, con guard `if (app.isPackaged)` — corriendo con
  `npm start` (como Abel y yo trabajamos siempre) esto no hace nada; solo
  se activa en una instalación real, y ahí busca versión nueva en GitHub
  Releases, la descarga sola, y avisa con la notificación nativa de
  Windows cuando ya está lista para instalarse (al cerrar la app).
- **Scripts nuevos**: `npm run dist` (arma el instalador sin publicarlo,
  queda en `dist/`) y `npm run release` (arma Y publica a GitHub Releases
  de una — necesita el repo real y estar autenticado con GitHub, pendiente
  de la próxima sesión). `npm run dist` ya se probó de verdad: generó
  `dist\Simple Welcome Setup 5.6.0.exe` (108 MB) sin errores — confirma
  que la configuración de electron-builder funciona antes de meter GitHub
  en la ecuación. Ese .exe es un build de prueba de la versión 5.6, se
  puede borrar (`dist/` está en `.gitignore` y no se sube a ningún lado).
- **Sin firma de código** — el instalador no está firmado (comprar un
  certificado de firma de código es una decisión aparte, con costo, no
  se tomó aquí). Windows SmartScreen va a mostrar la advertencia
  "Windows protegió su PC" la primera vez que alguien lo instale — normal
  para apps personales/indie sin certificado, no es un error de la
  configuración.

**Sesión 2026-09-20: GitHub montado y primer release publicado.**
Repo público: https://github.com/Sepulveda710/simple-welcome (Abel eligió
público — el actualizador funciona sin token). `package.json` ya apunta a
`owner: Sepulveda710, repo: simple-welcome, releaseType: release` (sin
`releaseType`, electron-builder publica borradores y el actualizador no
los ve). Los commits usan el correo noreply de GitHub
(`<id>+Sepulveda710@users.noreply.github.com`, configurado solo en este
repo) para no publicar el correo personal de Abel. Primer release: v5.7.0
(instalador de 108 MB + `latest.yml` + blockmap). Abel inició sesión con
`gh auth login` él mismo; el token vive en el llavero de Windows, no en
ningún archivo del proyecto.

**Cómo publicar una versión nueva** (probado — hay una trampa):
1. Subir la versión en `package.json` (regla de versionado arriba), commit
   y `git push`.
2. **Crear el release ANTES** de correr el empaquetador:
   `gh release create vX.Y.Z --title "X.Y.Z" --notes "..."` (esto crea
   también el tag). Si no, `electron-builder` sube dos archivos en
   paralelo y ambos intentan crear el release a la vez: uno gana, el otro
   falla con "422 Published releases must have a valid tag" y el
   instalador no se sube (así pasó en el primer intento; hubo que
   borrar el release a medias y repetir).
3. `$env:GH_TOKEN = (gh auth token); npm run release` — sube instalador,
   blockmap y `latest.yml` al release ya creado. El token solo vive en
   esa sesión de PowerShell.
4. Verificar con `gh release view vX.Y.Z --json assets`: deben estar los
   TRES archivos (`.exe`, `.exe.blockmap`, `latest.yml`).
Las instalaciones existentes se actualizan solas al abrir la app.

`git` y `gh` se instalaron con winget en esta sesión; en una terminal
recién abierta ya están en el PATH (si no, refrescarlo).

**PENDIENTES ANOTADOS POR ABEL (2026-09-20) — anotados, NO ejecutar hasta
que Abel diga "ejecuta"** (regla "anota, no ejecutes" de arriba):

**ACTUALIZACIÓN (rama `configuracion-windows`, sin publicar aún): los
pendientes 1 y 2 de abajo YA SE HICIERON**, junto con un rediseño completo
de Configuración que Abel eligió (opción A, estilo "Configuración de
Windows 11"): vista con menú de secciones a la izquierda (Perfil y clima,
Apariencia, Fuentes, Chía, Inicio, Comentarios, Acerca de) y contenido a
la derecha; el contenido hace scroll por su cuenta (`overscroll-behavior:
contain`) y `html:has(.capa-configuracion:not(.oculto)) { overflow:
hidden; scrollbar-gutter: stable }` bloquea el scroll de la página de
atrás para TODAS las ventanas emergentes. Los cambios se **aplican y
guardan al momento** (sin botón "Guardar cambios"): `CAMPOS_CONFIGURACION`
y `guardarCampoConfiguracion()` en `renderer.js`; `aplicarConfigEnVivo()`
ahora solo actúa sobre lo que cambió (si no, la animación circular de
tema y el estado de Chía se dispararían en cada campo). La ciudad avisa
en línea (`#aviso-ciudad`) en vez de `alert`. **Editar fuentes**:
`editarFuente()` + `validarFuente()` en `gestion-fuentes.js` (nombre
obligatorio, URL http(s), sin URLs repetidas; `agregarFuente`/`editarFuente`
devuelven `{ ok, fuentes }` o `{ ok:false, error }`, no lanzan errores),
lápiz ✎ en cada tarjeta, mismo formulario para agregar y editar,
sugerencias de categoría (`<datalist>`), Enter guarda.
- **Técnica de verificación visual segura** (usada aquí): desde
  `main.js`, `ventana.webContents.capturePage()` captura SOLO la ventana de
  la app (no el escritorio) y se guarda en el scratchpad para leerla. Trampa:
  si la ventana no está repintando, devuelve un cuadro viejo (una captura
  salió con el estado de arranque) — confirmar el estado con el DOM, no
  solo con la imagen.

1. **[HECHO] Bug en la pantalla de Configuración: el scroll se "cuela" a la página
   de atrás.** Al hacer scroll dentro de Configuración también se mueve la
   página principal de noticias. Probable arreglo: `overscroll-behavior:
   contain` en el contenido del modal y/o bloquear el scroll del body
   mientras haya un modal abierto (aplica a todos los `.capa-configuracion`,
   no solo Configuración — revisar Guardados, Ver por fuente, calendario).
2. **[HECHO] Poder EDITAR una fuente ya agregada** (hoy solo se puede borrar y
   volver a crear). Caso real: Abel agregó una fuente de motorización sin
   categoría y tuvo que borrarla y rehacerla. Editar nombre, URL,
   categoría y color desde "Mis fuentes" (`gestion-fuentes.js` +
   `pintarListaFuentes`). Considerar también no dejar guardar sin
   categoría (hoy cae en 'General') o avisarlo.
3. **Animación de inicio bonita** (el splash se quitó en 5.6 tras dos
   intentos fallidos — leer la nota de esa sesión antes de rehacerlo).
   Abel tiene una animación que Gemini le generó y le gustó mucho, pero
   Claude no puede ver videos: pedirle a Abel el código/prompt de Gemini,
   o 3–5 capturas de momentos clave (inicio/medio/fin) con tiempos, o el
   video para sacarle cuadros (requeriría instalar ffmpeg — pedir permiso).
   Al rehacerlo: verificar con DevTools/`getAnimations()`, no a ciegas.
4. **Lector de noticias en voz alta, lo más natural posible** ("como si
   una persona te lo leyera"), para dejarlo de fondo mientras hace otra
   cosa. Opciones evaluadas con Abel el 2026-09-20: voces de Windows
   (`speechSynthesis`, gratis, robóticas), Piper TTS (offline, gratis,
   bastante natural, pesa por voz), y nube con llave propia (Azure Speech
   voces es-MX neuronales, ElevenLabs, OpenAI TTS) — decisión pendiente.
   Diseñarlo con el motor de voz intercambiable.
5. **Ligereza de la app** (ver la nota de "app más ligera" arriba) — Abel
   quiere que sea ligera pero lo dejó **para casi al final**.
6. **Compartir la app con otras personas** (grupo de Facebook de
   vibe-coders): ver "Ideas para si Abel algún día comparte la app
   públicamente" abajo. Abel decidió (2026-09-20) por ahora compartir solo
   una captura y un video corto para pedir consejos — no el instalador; la
   licencia se decide con calma más adelante.
   - **Caja de comentarios: HECHA en la rama `comentarios`** (Configuración
     > Comentarios): botón "Reportar en GitHub" (abre `issues/new` con la
     versión prellenada, visible antes de enviar) y botón "Enviar un
     comentario" que abre el formulario de Tally de Abel
     (`URL_FORMULARIO_COMENTARIOS` en `renderer.js` = https://tally.so/r/A7k5Ye;
     si está vacía, el botón se oculta). Las respuestas le llegan a su
     correo. Nada se envía desde la app.
**[HECHO en la rama `lector-voz`, sin publicar aún] Los pendientes 4 y 7 (lector de voz), primera etapa con voces de Windows:** `renderer/lector-voz.js` tiene dos capas — `MotorVozWindows` (speechSynthesis; solo sabe hablar un texto) y `LectorVoz` (párrafo actual, avanzar, pausa, saltar, sin tocar el DOM; avisa por callback). Para cambiar a Piper u otro motor solo se reemplaza el motor. Botón 🔊 en el modo lectura + reproductor flotante (pausa/continuar, párrafo anterior/siguiente, velocidad, detener) + párrafo resaltado. Configuración > Lectura en voz: voz, velocidad, probar voz y "seguir con la siguiente noticia" (`vozNombre`, `vozVelocidad`, `vozSiguienteAuto` en `configuracion.js`). Gotchas: las voces cargan tarde (la 1ª consulta a `getVoices()` sale vacía — se piden desde el arranque); un enunciado cancelado avisa `onend/onerror` tarde, por eso el contador `generacion`; Chromium puede recolectar el enunciado a media frase si no se guarda la referencia. Probado por código con volumen 0 (pausa, saltos, velocidad, detener, auto-siguiente, cortar al cerrar); la captura visual de Configuración > Lectura en voz no se pudo (capturePage devolvió cuadros viejos). Piper (voz más natural) sigue pendiente. Ajustes tras probarlo Abel: "1× normal" = 1.5 real del motor de Windows (`VELOCIDAD_NORMAL` en `MotorVozWindows`, porque el 1.0 real le sonó muy lento); escala de la app 0.5/0.75/1/1.25/1.5; estados del lector `leyendo/pausado/detenido/inactivo`: ⏹ = `parar()` (voz parada, vuelve al inicio, reproductor visible), ✕ y el botón 🔊 = `cerrar()`. GOTCHA CSS: `.oculto {display:none}` es más débil que cualquier regla de clase con `display` propio (p. ej. `.reproductor-voz`, `.boton-nav`) — la clase se agrega pero el elemento sigue visible; por eso existe `.reproductor-voz.oculto, .boton-nav.oculto`. Al probar visibilidad usar `getComputedStyle(el).display`, no `classList.contains("oculto")`.

7. **Lector de voz — plan acordado**: empezar con las voces de Windows
   (`speechSynthesis`, gratis, sin dependencias) y después probar Piper
   (offline, más natural). Abel quiere algo sencillo que suene bien, no
   complejo. Motor intercambiable. Aún no se construye; Abel decide si se
   incluye en la próxima versión.

**Rediseño de la barra del modo lectura — opción 3 de tres propuestas mostradas a Abel** (menos ruido visual, sin botón de volver duplicado): quedan siempre visibles Anterior/Siguiente/★/🔊, y dos menús flotantes nuevos, "Aa" (el control de tamaño de texto A-/100%/A+, que antes estaba siempre a la vista) y "···" (actualizar, copiar enlace, modo cálido, abrir en el navegador — mismos botones/IDs de siempre, solo reubicados con icono+texto). Arriba del artículo YA NO hay botón de cerrar — el único es "← Volver" de la barra lateral, que no cambió. Verificado que Backspace/Alt+Izquierda (el atajo que de verdad cierra el modo lectura) sigue intacto; **Escape NO cerraba el modo lectura antes de esto ni lo hace ahora** (solo cierra calendario/Configuración/Guardados/Fuentes/ayuda — corrijo aquí una suposición mía equivocada de la sesión anterior) — Escape ahora además cierra un menú flotante abierto, sin tocar el modo lectura.

**Bug real encontrado y corregido al probar**: los dos menús quedaban SIEMPRE visibles sin importar la clase "oculto" — mismo problema de especificidad CSS que ya documentaba este archivo para `.reproductor-voz` (un selector por ID o una regla de clase declarada más abajo en el archivo le ganaban a `.oculto`). Arreglo: `.menu-flotante.oculto { display: none; }` (dos clases juntas), nunca un ID para controlar el display de algo que se oculta con `.oculto`. Ya van dos veces con el mismo bug — mirar esto primero si algo con `.oculto` en Configuración/Guardados/etc. alguna vez se ve como si no reaccionara a los clics.

**Tablas del modo lectura sin estilo — corregido, rama `arreglo-tablas-lectura`** (Abel mostró una tabla de especificaciones de Xataka que en la app salía con huecos enormes entre filas). Causa: no había NINGÚN CSS para `table/th/td` en `.contenido-articulo`, y varios medios (Xataka entre ellos) meten cada línea de una celda en su propio `<p>` (ej. una celda con 7 modos de cocina = 7 `<p>`) — cada uno heredaba el margen normal de párrafo, y eso multiplicado por fila es lo que inflaba todo. Arreglo en `styles.css`: estilos reales de tabla (bordes, padding, encabezado con `--accent-fondo`, filas alternadas) + `margin` a 0 (con un pequeño espacio solo entre `<p>` seguidos dentro de la misma celda) SOLO para `p` dentro de `th`/`td` — no toca los párrafos normales del cuerpo del artículo. Probado con el artículo real de Xataka (URL de la CrushBOSS) en claro/oscuro/cálido — se ve compacta y legible en los tres.

**Pendiente detectado al probar 5.10 (bug menor previo, no arreglado):** la CSP (`script-src 'self'`, agregada en 5.2) bloquea los manejadores `onerror="..."` en línea de las imágenes (favicon del encabezado en `index.html`, `favicon-lateral`, miniaturas de tarjetas/guardados, portada) — cuando una imagen falla, NO se oculta/quita como se pretendía y queda el ícono roto. Arreglo: quitar los `onerror` inline y usar un solo `document.addEventListener("error", ..., true)` que oculte `<img>` rotas (delegación en fase de captura, los eventos error de img no burbujean).

**Revista del Consumidor (Profeco) como fuente — HECHA en la rama `revista-consumidor`, sin publicar aún** (Abel pidió "la opción 1", 2026-09-20). La revista NO tiene RSS: su sitio es una app de JS que lee la API pública `https://bibliotecadelconsumidor.profeco.gob.mx/api/revista` (sin llave, no documentada; otros endpoints dan 401) y cada artículo es un PDF mensual (~19 por edición, todos con la misma fecha). `src/fuente-profeco.js` la lee y devuelve el contrato normal más `detalle` (sección, ej. "Guía de consumo") y `externo: true`; `lector-rss.js` la elige solo cuando la URL de la fuente es de `revistadelconsumidor.profeco.gob.mx` o `bibliotecadelconsumidor.profeco.gob.mx` (dominio exacto), así que Abel la agrega desde Configuración > Fuentes con la URL del sitio, como cualquier otra. Solo muestra la edición más reciente. En el renderer, una tarjeta `externo` abre el PDF con `abrirExterno`, se marca leída y muestra "· PDF ↗"; los externos se filtran de `articulosModoLectura` (Anterior/Siguiente, barra lateral) y en Guardados también abren fuera. Sin modo lectura ni lector de voz para PDFs — la opción 2 (extraer el texto del PDF, con librería nueva y limpieza de columnas/guiones) queda como idea si le gusta; probé que `pdftotext` saca el texto pero maquetado a columnas con palabras cortadas. Si la API cambia, falla en silencio (devuelve []). Probado por código con datos aislados (`app.setPath("userData", tmp)` temporal): 19 artículos, pestaña Consumo, clic abre el PDF y marca leída, guardados, barra lateral sin PDFs; captura visual OK.

Pendiente conocido para el futuro (mencionado pero no diseñado a fondo
todavía): que la app se abra sola al iniciar Windows (el empaquetado en sí
ya está resuelto, ver la sesión de arriba — esto es aparte, un acceso
directo en la carpeta de inicio o una entrada de registro); interacción
con Chía vía una IA local; versión para tablet Android (arquitectura sin
definir); login + sync de configuración/leídos contra un servidor propio;
integración con calendario de Outlook.

**Sesión 2026-09-20 (Beta 5.7 → 5.8): inicio con Windows + el "por qué"
de la app.** `iniciarConWindows` (default `true`) en `configuracion.js`;
`aplicarInicioConWindows()` en `main.js` usa `app.setLoginItemSettings` y
solo actúa con `app.isPackaged` (con `npm start` registraría el
`electron.exe` suelto de node_modules como programa de inicio). Se
re-aplica en cada arranque, al guardar Configuración y al restablecer.
Interruptor en Configuración > "Al encender tu computadora", con el
mensaje de propósito (`.mensaje-proposito` en `index.html`, redactado a
partir de lo que Abel contó: recuperar el hábito de leer noticias de sus
fuentes con un café/comida en vez de dejar que las redes decidan qué lee;
por eso abrir al encender la PC — Abel puede ajustar el texto). El mismo
"por qué" está en el README. Probado en dev por código (guardar/leer el
interruptor); **el registro real en Windows solo se puede comprobar con la
versión instalada** — VERIFICADO por Abel el 2026-09-20: instaló la 5.8,
reinició la PC y la app arrancó sola.
Abel prefiere fuentes de tecnología y economía; no política ni deportes
por defecto (clickbait) — ver el mensaje del README.

**Idea anotada (no ejecutar todavía): leer la noticia en voz alta** —
botón en modo lectura para que la app narre el artículo mientras Abel
hace otra cosa (comer, etc.). Punto de partida probable: la API de voz
del sistema (`speechSynthesis` en el renderer usa voces de Windows,
sin costo ni internet); ver antes qué voces en español hay instaladas.

**Idea anotada (no ejecutar todavía): app más ligera / dejar Electron.**
Abel quiere que sea un programa ligero que corra en cualquier PC. Medido
el 2026-09-20 (build 5.8): instalado ≈ 384 MB, de los cuales ~290 MB son
el motor Electron/Chromium, 48 MB idiomas de Chromium (`locales`) y solo
~16 MB son el código y dependencias propias (`app.asar`). Instalador de
108 MB (las actualizaciones bajan solo lo que cambió, por el blockmap).
RAM medida por Abel en el Administrador de tareas (2026-09-20): 145 MB
recién arrancada; 254 MB tras un rato de uso antes de reiniciar. Normal
para Electron — vigilar que no siga creciendo con los días (si pasa de
~500 MB y sube, buscar fuga: cachés, imágenes, listas en `renderer.js`).
- **Paso barato y sin riesgo**: conservar solo español e inglés con
  `"electronLanguages": ["es", "en-US"]` en `build` de `package.json`
  (~45 MB menos, ≈340 MB instalado). Probar el build antes de publicar.
- **Paso grande, a futuro**: dejar Electron por Tauri (Rust + WebView2,
  ~10–20 MB) o .NET + WebView2. Reusa `renderer/` casi tal cual — el único
  punto de contacto es `window.api` en `preload.js` — pero hay que
  reescribir `src/` (RSS, Readability, DOMPurify, color dominante,
  clima…) que hoy es Node, y rehacer instalador y actualizador. Hacerlo en
  una **rama aparte**, con la versión Electron funcionando mientras tanto.
  No compensa hasta que el tamaño/memoria sean un problema real; antes de
  decidir, medir la RAM real y probar en una PC vieja/modesta.
- Cuidar mientras tanto lo que hace pesada a una app: no dejar timers o
  cachés que crezcan sin límite (ya se acotó la caché de artículos), y
  cargar/pintar solo lo necesario.

**Ideas para si Abel algún día comparte la app públicamente** (anotadas el
2026-09-20, solo ideas — hoy la app es solo para uso personal de Abel, no
hay que hacer nada de esto todavía, y "anota" significa no ejecutar):
- **Firma de código**: hoy el instalador no está firmado (SmartScreen
  avisa la primera vez, no afecta las actualizaciones automáticas). Camino
  gratis: SignPath Foundation — pide licencia open source aprobada (el repo
  hoy no tiene ninguna; MIT sería lo simple), repo público (ya lo es),
  proyecto no comercial, y construir el instalador en GitHub Actions en vez
  de en la PC (habría que escribir el workflow y cambiar el flujo de
  `npm run release`). El certificado sale a nombre de "SignPath
  Foundation", no de Abel. Verificar requisitos actuales en signpath.org
  antes de aplicar; Azure Trusted Signing probablemente no aplica a
  personas en México.
- **Donaciones voluntarias**: encajan con una app limpia y sin anuncios
  (GitHub Sponsors, Ko-fi, Buy Me a Coffee). Verificar disponibilidad en
  México y cómo se declaran fiscalmente — no se investigó. Ojo: SignPath
  exige que el proyecto no sea comercial; donaciones suelen ser aceptables
  pero revisar sus términos.
- **Publicidad**: el modo lectura quita los anuncios de los sitios a
  propósito (Readability). Reactivarlos cargando la página real chocaría
  con la sanitización/CSP de `modo-lectura.js` y `index.html`. Alternativa
  que respeta a los medios: botón "Ver en el sitio original" (WebContentsView
  como `panel-ia.js`, o navegador externo — `abrirExterno` ya existe).
  Anuncios propios dentro de la app: AdSense no permite apps de escritorio,
  rompe el estilo minimalista y volvería comercial el proyecto (choca con
  SignPath).
- **Derechos de autor**: el modo lectura muestra el texto completo de
  artículos de otros medios. Bien para uso personal; con distribución
  amplia, considerar mostrar solo resumen + enlace al original.
- **Compartir con conocidos/desconocidos (grupo de Facebook de
  vibe-coders) y miedo a que copien la idea** (Abel, 2026-09-20): hechos a
  tener presentes — (a) el repo YA es público, así que el código ya es
  visible; sin licencia, por defecto todos los derechos quedan reservados
  a Abel (nadie puede reutilizarlo legalmente), y el historial de commits
  con fechas prueba que él lo hizo primero; (b) cualquier app Electron
  expone su código: el `app.asar` del instalador se abre fácil, así que
  compartir el `.exe` equivale a compartir el código; (c) para pedir
  opinión sin regalar nada: capturas/video/demo, o dejar que prueben el
  instalador sabiendo lo de (b); (d) elegir licencia es decisión de Abel:
  MIT = cualquiera puede copiar y hasta vender; una "source-available"
  no comercial (ej. PolyForm Noncommercial / CC BY-NC) restringe uso
  comercial pero NO es open source (y SignPath exige OSI — incompatible);
  (e) idea de **botón de comentarios en la app**: opciones sin servidor
  propio — abrir un Google Form/Tally (sin cuenta, llega por correo) y/o
  GitHub Issues; `mailto:` expondría su correo (usar un alias); NO enviar
  nada en silencio (privacidad) — si se agrega versión/SO, que sea
  visible para el usuario antes de enviar.
- **Privacidad**: si otras personas la usan, tendría que cuidarse qué
  datos suyos se guardan/envían (ciudad para el clima, favicons vía
  Google, etc.) y quizá agregar una política de privacidad.
