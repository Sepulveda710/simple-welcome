// Este archivo SOLO pinta cosas en pantalla. No sabe cómo se leen los RSS
// ni cómo se arma el saludo — eso vive en src/. Aquí solo se consume
// window.api, el contrato fijo que expone preload.js.

// Caché en memoria: para no volver a pedir la lista de artículos cada vez
// que se cambia de noticia dentro del modo lectura.
let articulosCache = [];
let leidosCache = [];
let guardadosCache = []; // artículos guardados "para después"
let articulosModoLectura = []; // subconjunto de articulosCache que ve la barra lateral/Anterior/Siguiente mientras se lee
let tarjetaBajoElMouse = null; // para el atajo "M" (marcar leída con el mouse encima)
let enlaceActual = null; // el artículo que se está viendo ahora mismo en modo lectura
let ultimoScrollTop = 0; // para saber si el scroll va hacia arriba o hacia abajo
let textoSeleccionActual = ''; // último texto seleccionado en modo lectura, para los botones de la píldora
let scrollPrincipalGuardado = 0; // posición del scroll de la lista principal al entrar a modo lectura, para restaurarla al volver
let caraChiaPredeterminada = 'relajado'; // elegida en Configuración > Chía — la cara "de reposo"; se sobreescribe con la config guardada al iniciar

function estaGuardado(enlace) {
  return guardadosCache.some((g) => g.enlace === enlace);
}

// Escapa texto antes de meterlo en un template de innerHTML. Hace falta
// en cualquier lado que interpole texto que no escribimos nosotros mismos
// como literal — título/fuente/categoría vienen de feeds RSS externos (un
// feed comprometido o mal intencionado podría poner HTML/JS en su
// <title>), y nombre/categoría de "Mis fuentes" y el texto de un
// recordatorio los escribe el usuario a mano. Todo lo que ya usa
// textContent (como #lectura-titulo) no lo necesita — solo esto, que arma
// HTML a mano con template strings.
function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[caracter]));
}

// Pequeña ayuda para las transiciones: espera a que termine una animación
// CSS antes de conmutar la clase "oculto" (display:none), para que el
// fade-out se alcance a ver en vez de cortarse de golpe.
function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

let NOTICIAS_POR_PAGINA = 20; // se sobreescribe con la configuración guardada al iniciar
let noticiasVisibles = NOTICIAS_POR_PAGINA; // cuántas se muestran de momento en la lista
let categoriaActiva = 'Para ti hoy'; // 'Para ti hoy' agrupa por sección; cualquier otro valor filtra a esa categoría
let fuenteActiva = null; // si no es null, manda sobre categoriaActiva y filtra a un solo sitio (ver "Ver por fuente")

// --- Estado del calendario ---
let mesVisible = new Date(); // el mes que se está mostrando (el día no importa aquí)
let diaSeleccionado = new Date(); // el día activo en la sección de recordatorios
let recordatoriosCache = {}; // { "2026-09-09": [ { id, texto, color, hora } ] }
const COLORES_RECORDATORIO = ['#0067c0', '#2e7d32', '#e65100', '#7c3aed'];

// Un enlace se considera "de una fuente propia" si su dominio coincide con
// el dominio de algún artículo que ya trajimos por RSS. Así no hace falta
// mantener una lista de dominios a mano — se deduce de lo que ya tenemos.
function obtenerDominio(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function esFuentePropia(url) {
  const dominio = obtenerDominio(url);
  if (!dominio) return false;
  return articulosCache.some((a) => obtenerDominio(a.enlace) === dominio);
}

// Favicon real del sitio, vía un servicio público — así no hace falta
// descargar ni guardar íconos a mano para cada medio.
function urlFavicon(enlace) {
  const dominio = obtenerDominio(enlace);
  return dominio ? `https://www.google.com/s2/favicons?domain=${dominio}&sz=32` : '';
}

// La versión ya no se escribe a mano en index.html (se quedaba
// desactualizada — decía "0.1.0" cuando ya íbamos por Beta 5) — sale de
// package.json vía app.getVersion(), la misma fuente de verdad que usa
// "npm start". X.Y.0 en package.json se muestra como "Beta X.Y" (ver
// "Nombre y versión" en CLAUDE.md).
async function pintarVersionApp() {
  const version = await window.api.obtenerVersionApp(); // ej. "5.2.0"
  const [mayor, menor] = version.split('.');
  document.getElementById('acerca-de-version').textContent = `Beta ${mayor}.${menor}`;
}

async function pintarSaludo() {
  const saludo = await window.api.obtenerSaludo();
  document.getElementById('fecha').textContent = saludo.fecha;
  document.getElementById('mensaje').textContent = saludo.mensaje;
  document.getElementById('hora').textContent = `Son las ${saludo.horaTexto}`;
  document.getElementById('avatar-usuario').textContent = saludo.nombre.charAt(0).toUpperCase();
}

// Si no hay ubicación configurada o el servicio falla (sin internet,
// caído, etc.), el widget simplemente no aparece — no rompe nada más.
async function pintarClima() {
  try {
    const clima = await window.api.obtenerClima();
    if (!clima) return;

    document.getElementById('icono-clima').textContent = clima.icono;
    document.getElementById('temperatura-clima').textContent = `${clima.temperatura}°${clima.unidad}`;

    const widget = document.getElementById('widget-clima');
    widget.title = clima.ubicacion;
    widget.classList.remove('oculto');
  } catch {
    // sin conexión o el servicio de clima falló — se queda oculto, nada más.
  }
}

async function pintarCitaDelDia() {
  try {
    const cita = await window.api.obtenerCita();
    if (!cita) return;
    document.getElementById('cita-del-dia').textContent = `"${cita.texto}" — ${cita.autor}`;
  } catch {
    // sin cita disponible — el espacio se queda vacío, sin romper el layout.
  }
}

// --- Chía (ver renderer/expresiones-chia.js para el catálogo completo) ---
//
// Por ahora nada decide de verdad el estado de ánimo de Chía — solo se usa
// "relajado", con un parpadeo periódico para que no se sienta
// completamente estática. Elegir expresión según contexto (horario,
// eventos de la app, o algún día una IA local) queda para más adelante;
// el catálogo entero ya está listo para cuando llegue ese momento.
let expresionActualChia = 'relajado';

function pintarCaraChia(idExpresion, caraForzada = null) {
  const expresion = EXPRESIONES_CHIA[idExpresion];
  if (!expresion) return;
  document.getElementById('cara-chia').textContent = caraForzada || expresion.cara;
}

// Toda cara sigue el formato "[ ojoIzq boca ojoDer ]" (5 piezas separadas
// por espacios, ver expresiones-chia.js) — cerrar los ojos es simplemente
// reemplazar las piezas 2 y 4 por "-", sin importar cuál sea la expresión.
function ojosCerrados(cara) {
  const piezas = cara.split(' ');
  if (piezas.length !== 5) return cara;
  piezas[1] = '-';
  piezas[3] = '-';
  return piezas.join(' ');
}

// Punto de entrada para más adelante: cambia la expresión activa de Chía.
// Ya funciona hoy (probalo desde la consola: mostrarExpresionChia('feliz')),
// solo que todavía nada de la app lo llama automáticamente.
function mostrarExpresionChia(idExpresion) {
  expresionActualChia = idExpresion;
  pintarCaraChia(idExpresion);
}

// Parpadeo: cada 3-7 segundos (al azar, para que no se sienta mecánico),
// cierra los ojos un instante y vuelve a la expresión activa en ese
// momento — funciona sin importar cuál esté puesta.
function programarParpadeoChia() {
  const espera = 3000 + Math.random() * 4000;
  setTimeout(() => {
    const expresion = EXPRESIONES_CHIA[expresionActualChia];
    if (expresion) pintarCaraChia(expresionActualChia, ojosCerrados(expresion.cara));
    setTimeout(() => pintarCaraChia(expresionActualChia), 150);
    programarParpadeoChia();
  }, espera);
}

// --- Aviso de conexión ---
//
// navigator.onLine + los eventos 'online'/'offline' del propio navegador —
// no hace falta hacer ping a nada nosotros mismos. Reutiliza a Chía en vez
// de inventar un ícono nuevo: se pone triste mientras no hay internet
// (ver EXPRESIONES_CHIA.triste) y vuelve a relajado sola al reconectar.
let tokenConexion = 0; // evita que un "de vuelta en línea" atrasado tape un "sin conexión" más reciente si la red parpadea

async function actualizarEstadoConexion() {
  const banner = document.getElementById('banner-conexion');
  const miToken = ++tokenConexion;

  if (navigator.onLine) {
    // Si ya estaba relajado, la app abrió con internet desde el principio
    // — no hay nada que anunciar.
    if (expresionActualChia !== 'triste') return;

    mostrarExpresionChia(caraChiaPredeterminada);
    banner.textContent = '✅ De vuelta en línea';
    banner.className = 'banner-conexion reconectado';
    await esperar(2600);
    if (miToken !== tokenConexion) return; // la red volvió a cambiar mientras esperábamos
    banner.classList.add('saliendo');
    await esperar(200);
    if (miToken !== tokenConexion) return;
    banner.className = 'banner-conexion oculto';
  } else {
    mostrarExpresionChia('triste');
    banner.textContent = '📡 Sin conexión — Chía está esperando a que vuelva el internet';
    banner.className = 'banner-conexion sin-conexion';
  }
}

window.addEventListener('online', actualizarEstadoConexion);
window.addEventListener('offline', actualizarEstadoConexion);

function crearTarjetaNoticia(articulo) {
  const yaLeida = leidosCache.includes(articulo.enlace);
  const yaGuardada = estaGuardado(articulo.enlace);

  const div = document.createElement('div');
  div.className = `noticia ${yaLeida ? 'leida' : 'no-leida'}`;
  div.addEventListener('mouseenter', () => { tarjetaBajoElMouse = div; });
  div.addEventListener('mouseleave', () => { if (tarjetaBajoElMouse === div) tarjetaBajoElMouse = null; });
  div.innerHTML = `
    ${articulo.imagen ? `<img class="miniatura" src="${escaparHtml(articulo.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
    <div class="info-noticia">
      <span class="categoria">${escaparHtml(articulo.categoria)}</span>
      <h3>${escaparHtml(articulo.titulo)}</h3>
      <p class="meta">${escaparHtml(articulo.fuente)}</p>
    </div>
    <div class="acciones-noticia">
      <button class="boton-marcar" title="Marcar como leída/no leída">${yaLeida ? '✓' : ''}</button>
      <button class="boton-guardar-noticia ${yaGuardada ? 'guardado' : ''}" title="Guardar para después">★</button>
    </div>
  `;

  div.addEventListener('click', () => abrirModoLectura(articulo.enlace));

  // El botón de marcar manual no debe abrir el artículo al hacer clic.
  const boton = div.querySelector('.boton-marcar');
  boton.addEventListener('click', async (evento) => {
    evento.stopPropagation();
    await alternarLeidoLocal(articulo.enlace);
    div.classList.toggle('leida');
    div.classList.toggle('no-leida');
    boton.textContent = div.classList.contains('leida') ? '✓' : '';
  });

  const botonGuardar = div.querySelector('.boton-guardar-noticia');
  botonGuardar.addEventListener('click', async (evento) => {
    evento.stopPropagation();
    if (estaGuardado(articulo.enlace)) {
      guardadosCache = await window.api.eliminarGuardado(articulo.enlace);
    } else {
      guardadosCache = await window.api.guardarArticulo(articulo);
    }
    botonGuardar.classList.toggle('guardado');
  });

  return div;
}

// Pinta las pestañas de categoría ("Para ti hoy" + una por cada categoría
// que exista entre los artículos ya descargados). Se recalculan solas: si
// mañana agregas una fuente con una categoría nueva en config/fuentes.json,
// aparece aquí sin tocar este archivo.
function pintarPestanas() {
  const contenedor = document.getElementById('pestanas-categoria');
  contenedor.innerHTML = '';

  // Con una fuente activa, las pestañas de categoría se reemplazan por un
  // solo chip — ver el sitio filtrado es la vista completa, no tiene
  // sentido combinarla con categorías al mismo tiempo.
  if (fuenteActiva) {
    const chip = document.createElement('div');
    chip.className = 'chip-fuente-activa';
    chip.innerHTML = `Mostrando: <strong>${escaparHtml(fuenteActiva)}</strong>`;

    const botonQuitar = document.createElement('button');
    botonQuitar.className = 'boton-quitar-chip';
    botonQuitar.title = 'Quitar filtro';
    botonQuitar.textContent = '✕';
    botonQuitar.addEventListener('click', () => quitarFiltroFuente());
    chip.appendChild(botonQuitar);

    contenedor.appendChild(chip);
    return;
  }

  const categorias = [...new Set(articulosCache.map((a) => a.categoria))];
  const opciones = ['Para ti hoy', ...categorias];

  opciones.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.className = `pestana ${opcion === categoriaActiva ? 'activa' : ''}`;
    boton.textContent = opcion;
    boton.addEventListener('click', () => cambiarCategoria(opcion));
    contenedor.appendChild(boton);
  });
}

function cambiarCategoria(categoria) {
  categoriaActiva = categoria;
  noticiasVisibles = NOTICIAS_POR_PAGINA; // reinicia la paginación al cambiar de vista
  pintarPestanas();
  pintarListaDesdeCache();
}

function quitarFiltroFuente() {
  fuenteActiva = null;
  noticiasVisibles = NOTICIAS_POR_PAGINA;
  pintarPestanas();
  pintarListaDesdeCache();
}

// Crea una tarjeta con su retraso de animación ya calculado — lo
// reutilizan tanto la vista agrupada como la vista filtrada.
function crearTarjetaConRetraso(articulo, indice) {
  const tarjeta = crearTarjetaNoticia(articulo);
  tarjeta.style.animationDelay = `${Math.min(indice, 12) * 0.035}s`;
  return tarjeta;
}

// Vista "Para ti hoy": agrupa por categoría, cada una con un puñado de
// artículos y un "Ver todo" que cambia a la pestaña de esa categoría.
function pintarSecciones(contenedor) {
  const categorias = [...new Set(articulosCache.map((a) => a.categoria))];

  categorias.forEach((categoria) => {
    const articulos = articulosCache.filter((a) => a.categoria === categoria).slice(0, 6);
    if (articulos.length === 0) return;

    const seccion = document.createElement('div');
    seccion.className = 'seccion-categoria';

    const cabecera = document.createElement('div');
    cabecera.className = 'cabecera-seccion';
    cabecera.innerHTML = `<h2>Último en ${escaparHtml(categoria)}</h2>`;

    const botonVerTodo = document.createElement('button');
    botonVerTodo.className = 'enlace-ver-todo';
    botonVerTodo.textContent = 'Ver todo ›';
    botonVerTodo.addEventListener('click', () => cambiarCategoria(categoria));
    cabecera.appendChild(botonVerTodo);

    const listaSeccion = document.createElement('div');
    listaSeccion.className = 'lista-noticias';
    articulos.forEach((articulo, indice) => {
      listaSeccion.appendChild(crearTarjetaConRetraso(articulo, indice));
    });

    seccion.appendChild(cabecera);
    seccion.appendChild(listaSeccion);
    contenedor.appendChild(seccion);
  });
}

// Vista de una categoría específica: lista plana filtrada, con el mismo
// "Cargar más" que ya teníamos.
function pintarCategoriaFiltrada(contenedor) {
  const filtrados = articulosCache.filter((a) => a.categoria === categoriaActiva);

  if (filtrados.length === 0) {
    contenedor.innerHTML = '<p class="estado">No hay noticias en esta categoría por ahora.</p>';
    return;
  }

  filtrados.slice(0, noticiasVisibles).forEach((articulo, indice) => {
    contenedor.appendChild(crearTarjetaConRetraso(articulo, indice));
  });

  if (noticiasVisibles < filtrados.length) {
    const boton = document.createElement('button');
    boton.className = 'boton-cargar-mas';
    boton.textContent = 'Cargar más';
    boton.addEventListener('click', () => {
      noticiasVisibles += NOTICIAS_POR_PAGINA;
      pintarListaDesdeCache();
    });
    document.getElementById('zona-cargar-mas').appendChild(boton);
  }
}

// Vista de una sola fuente (ver "Ver por fuente" / #grid-fuentes): mismo
// patrón que pintarCategoriaFiltrada, pero filtrando por sitio en vez de
// por categoría — fuenteActiva manda por encima de categoriaActiva.
function pintarFuenteFiltrada(contenedor) {
  const filtrados = articulosCache.filter((a) => a.fuente === fuenteActiva);

  if (filtrados.length === 0) {
    contenedor.innerHTML = '<p class="estado">No hay noticias de esta fuente por ahora.</p>';
    return;
  }

  filtrados.slice(0, noticiasVisibles).forEach((articulo, indice) => {
    contenedor.appendChild(crearTarjetaConRetraso(articulo, indice));
  });

  if (noticiasVisibles < filtrados.length) {
    const boton = document.createElement('button');
    boton.className = 'boton-cargar-mas';
    boton.textContent = 'Cargar más';
    boton.addEventListener('click', () => {
      noticiasVisibles += NOTICIAS_POR_PAGINA;
      pintarListaDesdeCache();
    });
    document.getElementById('zona-cargar-mas').appendChild(boton);
  }
}

// Pinta la lista usando lo que YA tenemos en caché — no vuelve a tocar la
// red. Se usa al volver del modo lectura, donde lo único que cambió es
// el estado de leído/no leído, no las noticias en sí.
function pintarListaDesdeCache() {
  const contenedor = document.getElementById('lista-noticias');
  const zonaBoton = document.getElementById('zona-cargar-mas');
  contenedor.innerHTML = '';
  zonaBoton.innerHTML = '';

  if (articulosCache.length === 0) {
    contenedor.innerHTML = '<p class="estado">No se encontraron noticias por ahora.</p>';
    return;
  }

  if (fuenteActiva) {
    pintarFuenteFiltrada(contenedor);
  } else if (categoriaActiva === 'Para ti hoy') {
    pintarSecciones(contenedor); // agrupada, sin "Cargar más" — cada sección tiene su "Ver todo"
  } else {
    pintarCategoriaFiltrada(contenedor);
  }
}

// Tarjetas "fantasma" con brillo, mientras llegan las noticias de verdad.
function pintarEsqueletoNoticias() {
  const contenedor = document.getElementById('lista-noticias');
  contenedor.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const esqueleto = document.createElement('div');
    esqueleto.className = 'tarjeta-skeleton';
    contenedor.appendChild(esqueleto);
  }
}

// Esta sí toca la red: descarga los 5 feeds RSS desde cero. Solo debe
// llamarse al iniciar la app (o en un futuro botón de "actualizar"),
// nunca solo para reflejar un cambio de estado de lectura.
async function pintarNoticias() {
  pintarEsqueletoNoticias();

  const [articulos, leidos] = await Promise.all([
    window.api.obtenerNoticias(),
    window.api.obtenerLeidos()
  ]);

  articulosCache = articulos;
  leidosCache = leidos;

  pintarPestanas();
  pintarListaDesdeCache();
}

// Cambia el estado de leído/no leído tanto en el servidor (main process)
// como en la caché local, para que la barra lateral y la lista principal
// se mantengan sincronizadas sin tener que volver a pedir todo.
async function alternarLeidoLocal(enlace) {
  await window.api.alternarLeido(enlace);
  if (leidosCache.includes(enlace)) {
    leidosCache = leidosCache.filter((e) => e !== enlace);
  } else {
    leidosCache.push(enlace);
  }
}

// "Hoy" / "Ayer" / fecha corta — para los separadores de la barra lateral.
// Compara solo el día calendario, no las 24h exactas, para que un artículo
// de las 00:05 de hoy no caiga en "Ayer" por unos minutos.
function formatearSeparadorFecha(fechaIso) {
  if (!fechaIso) return null;
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return null;

  const inicioDia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
  const hoy = inicioDia(new Date());
  const dia = inicioDia(fecha);
  const diffDias = Math.round((hoy - dia) / 86400000);

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  return fecha.toLocaleDateString('es', { day: 'numeric', month: 'long' });
}

function pintarBarraLateral(enlaceActivo) {
  const lista = document.getElementById('lista-lateral');
  const resumen = document.getElementById('resumen-barra-lateral');
  lista.innerHTML = '';

  const indiceActivo = articulosModoLectura.findIndex((a) => a.enlace === enlaceActivo);
  const sinLeer = articulosModoLectura.filter((a) => !leidosCache.includes(a.enlace)).length;
  resumen.textContent = articulosModoLectura.length
    ? `${indiceActivo === -1 ? '—' : indiceActivo + 1} de ${articulosModoLectura.length} · ${sinLeer} sin leer`
    : '';

  let separadorAnterior = null;

  articulosModoLectura.forEach((articulo) => {
    // El orden ya viene por fecha descendente desde lector-rss.js, así que
    // insertar el separador apenas cambia el día no rompe el orden de
    // Anterior/Siguiente — solo agrupa visualmente lo que ya está agrupado.
    const separador = formatearSeparadorFecha(articulo.fecha);
    if (separador && separador !== separadorAnterior) {
      const cabecera = document.createElement('div');
      cabecera.className = 'separador-fecha-lateral';
      cabecera.textContent = separador;
      lista.appendChild(cabecera);
      separadorAnterior = separador;
    }

    const yaLeida = leidosCache.includes(articulo.enlace);

    const item = document.createElement('div');
    item.className = `item-lateral ${articulo.enlace === enlaceActivo ? 'activo' : ''} ${yaLeida ? 'leida' : ''}`;
    if (articulo.colorFuente) item.style.setProperty('--source-color', articulo.colorFuente);

    item.innerHTML = `
      ${articulo.imagen ? `<img class="miniatura-lateral" src="${escaparHtml(articulo.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <div class="contenido-item-lateral">
        <div class="meta-lateral">
          <img class="favicon-lateral" src="${urlFavicon(articulo.enlace)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
          <span class="fuente-lateral">${escaparHtml(articulo.fuente)}</span>
        </div>
        <span class="titulo-lateral">${escaparHtml(articulo.titulo)}</span>
      </div>
    `;

    item.addEventListener('click', () => abrirModoLectura(articulo.enlace));

    lista.appendChild(item);
  });

  // Si al avanzar con Anterior/Siguiente el artículo activo queda fuera
  // de la vista en la barra lateral, la acompaña automáticamente.
  const activo = lista.querySelector('.item-lateral.activo');
  if (activo) activo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Compara dos URLs de imagen por su ruta, no por la URL completa — muchos
// sitios sirven el mismo archivo con parámetros de tamaño/query distintos
// entre el feed RSS y el artículo (ej. "?w=300" vs "?w=1200").
function mismaImagen(urlA, urlB) {
  try {
    return new URL(urlA).pathname === new URL(urlB).pathname;
  } catch {
    return urlA === urlB;
  }
}

// Híbrido: la miniatura del feed se usa siempre como portada (confiable,
// no depende de si Readability la conservó), PERO si el propio texto
// extraído ya trae esa misma imagen al inicio, se quita de ahí para no
// mostrarla dos veces.
function insertarPortadaArticulo(contenido, urlImagen) {
  if (!urlImagen) return;

  const primeraImagen = contenido.querySelector('img');
  if (primeraImagen && mismaImagen(primeraImagen.src, urlImagen)) {
    (primeraImagen.closest('figure') || primeraImagen).remove();
  }

  const portada = document.createElement('img');
  portada.className = 'portada-articulo';
  portada.src = urlImagen;
  portada.alt = '';
  portada.loading = 'lazy';
  portada.onerror = () => portada.remove();
  contenido.prepend(portada);
}

// Tinte adaptativo: el color dominante de la portada se aplica a TODA la
// ventana — barra lateral, panel, y también el margen fuera de la
// columna de 960px (ver la regla de "body" en styles.css) para que no
// queden bordes de Mica neutro a los costados en ventanas anchas. Por
// eso la variable y la clase van en <html>, no en #modo-lectura: así
// tanto el body (ancestro) como el contenido de lectura (descendiente)
// pueden leer --tinte-color por herencia normal de CSS. Solo aplica en
// tema claro — el guard real está en CSS (ver "Tinte adaptativo" en
// styles.css), esto solo evita cargar la variable si ni siquiera aplica.
// null limpia el tinte (artículo sin imagen, o mientras carga uno nuevo).
function aplicarTinteArticulo(colorHex) {
  const raiz = document.documentElement;
  if (colorHex) {
    raiz.style.setProperty('--tinte-color', colorHex);
    raiz.classList.add('con-tinte');
  } else {
    raiz.classList.remove('con-tinte');
  }
}

async function abrirModoLectura(enlace, forzar = false, direccion = null) {
  const panel = document.getElementById('modo-lectura');
  const contenido = document.getElementById('lectura-contenido');

  enlaceActual = enlace;
  actualizarBotonGuardarArticulo();

  // Si ya estábamos en modo lectura (viniendo de Anterior/Siguiente o de
  // la barra lateral), no repetimos la transición de entrada — esa ya
  // pasó una vez y aquí solo cambia el contenido del artículo.
  const entrandoPorPrimeraVez = panel.classList.contains('oculto');

  if (entrandoPorPrimeraVez) {
    // La barra lateral y Anterior/Siguiente se quedan fijos al filtro que
    // tenías activo al momento de abrir — fuenteActiva manda sobre
    // categoriaActiva (igual que en la lista principal, ver pintarListaDesdeCache);
    // si no había ningún filtro de fuente y la categoría era "Para ti hoy",
    // ven de todo.
    if (fuenteActiva) {
      articulosModoLectura = articulosCache.filter((a) => a.fuente === fuenteActiva);
    } else if (categoriaActiva === 'Para ti hoy') {
      articulosModoLectura = articulosCache;
    } else {
      articulosModoLectura = articulosCache.filter((a) => a.categoria === categoriaActiva);
    }

    scrollPrincipalGuardado = window.scrollY;

    // En ventanas angostas la barra lateral y el artículo compiten por
    // espacio — arranca colapsada ahí; en ventanas anchas no hace falta.
    const barra = document.getElementById('barra-lateral');
    const botonAlternar = document.getElementById('alternar-barra');
    const debeColapsar = window.innerWidth < 900;
    barra.classList.toggle('colapsada', debeColapsar);
    botonAlternar.textContent = debeColapsar ? '⟩' : '⟨';

    const saludoEl = document.getElementById('saludo');
    const filaEl = document.getElementById('fila-principal');

    saludoEl.classList.add('transicion-salida');
    filaEl.classList.add('transicion-salida');
    await esperar(140);
    saludoEl.classList.remove('transicion-salida');
    filaEl.classList.remove('transicion-salida');
    saludoEl.classList.add('oculto');
    filaEl.classList.add('oculto');

    panel.classList.remove('oculto');
    panel.classList.add('transicion-entrada-lectura');
    setTimeout(() => panel.classList.remove('transicion-entrada-lectura'), 240);
  }

  document.getElementById('contenedor').classList.add('modo-ancho');

  pintarBarraLateral(enlace);
  actualizarBotonesNavegacion(enlace);

  // Al cambiar de artículo, el encabezado siempre debe empezar visible
  // y el scroll debe regresar al inicio del nuevo artículo.
  document.getElementById('area-scroll').scrollTop = 0;
  document.getElementById('encabezado-articulo').classList.remove('oculto-scroll');
  ultimoScrollTop = 0;

  document.getElementById('lectura-titulo').textContent = 'Cargando artículo…';
  contenido.innerHTML = '';
  contenido.style.paddingTop = `${document.getElementById('encabezado-articulo').offsetHeight}px`;
  aplicarTinteArticulo(null); // limpio mientras carga — se aplica de nuevo abajo si el artículo nuevo tiene color

  // El feed ya trae la miniatura del artículo (la misma que se ve en las
  // tarjetas y en la barra lateral) — se usa como portada y como fuente
  // del tinte, en paralelo con la extracción del texto, para no alargar
  // la carga.
  const datosFeed = articulosCache.find((a) => a.enlace === enlace) || null;

  try {
    const [articulo, colorDominante] = await Promise.all([
      window.api.leerArticulo(enlace, forzar),
      window.api.obtenerColorDominante(datosFeed?.imagen)
    ]);
    document.getElementById('lectura-sitio').textContent = articulo.sitio;
    document.getElementById('favicon-fuente').src = urlFavicon(enlace);
    document.getElementById('lectura-titulo').textContent = articulo.titulo;
    contenido.innerHTML = articulo.textoHtml;
    insertarPortadaArticulo(contenido, datosFeed?.imagen);
    aplicarTinteArticulo(colorDominante);

    // Elige la animación según cómo se llegó aquí: Anterior/Siguiente
    // deslizan en su dirección; abrir desde la lista o la barra lateral
    // usa el efecto de "entrada" (drill-in). El encabezado nunca se anima.
    contenido.classList.remove('entrada-articulo', 'desliza-siguiente', 'desliza-anterior');
    void contenido.offsetWidth; // fuerza un reflow para poder repetir la misma animación seguidas veces
    if (direccion === 'siguiente') contenido.classList.add('desliza-siguiente');
    else if (direccion === 'anterior') contenido.classList.add('desliza-anterior');
    else contenido.classList.add('entrada-articulo');

    // El encabezado ahora "flota" (position: absolute) sobre el contenido,
    // así que hay que reservarle su alto real como espacio arriba —
    // el título puede tener 1, 2 o 3 líneas y varía cada vez.
    contenido.style.paddingTop = `${document.getElementById('encabezado-articulo').offsetHeight}px`;

    await window.api.marcarLeido(enlace); // automático al abrirlo
    if (!leidosCache.includes(enlace)) leidosCache.push(enlace);
    pintarBarraLateral(enlace); // refresca para que se vea atenuado en la lista lateral
  } catch (error) {
    document.getElementById('lectura-titulo').textContent = 'No se pudo abrir el artículo';
    contenido.innerHTML = `<p>${escaparHtml(error.message)}. Puedes intentar abrirlo directamente en el navegador.</p>`;
    contenido.style.paddingTop = `${document.getElementById('encabezado-articulo').offsetHeight}px`;
  }
}

// El orden de navegación sigue el mismo orden en que aparecen en la lista
// (más recientes primero) — no hace falta un criterio nuevo, ya viene de
// lector-rss.js ordenado así.
function actualizarBotonesNavegacion(enlaceAbierto) {
  const indice = articulosModoLectura.findIndex((a) => a.enlace === enlaceAbierto);
  const anterior = document.getElementById('articulo-anterior');
  const siguiente = document.getElementById('articulo-siguiente');

  anterior.disabled = indice <= 0;
  siguiente.disabled = indice === -1 || indice >= articulosModoLectura.length - 1;

  anterior.onclick = () => {
    if (indice > 0) abrirModoLectura(articulosModoLectura[indice - 1].enlace, false, 'anterior');
  };
  siguiente.onclick = () => {
    if (indice < articulosModoLectura.length - 1) abrirModoLectura(articulosModoLectura[indice + 1].enlace, false, 'siguiente');
  };
}

async function cerrarModoLectura() {
  const panel = document.getElementById('modo-lectura');
  const saludoEl = document.getElementById('saludo');
  const filaEl = document.getElementById('fila-principal');

  panel.classList.add('transicion-salida-lectura');
  await esperar(160);
  panel.classList.remove('transicion-salida-lectura');
  panel.classList.add('oculto');
  document.getElementById('contenedor').classList.remove('modo-ancho');
  aplicarTinteArticulo(null); // el tinte es propio del modo lectura — al salir, la app vuelve a Mica neutro

  saludoEl.classList.remove('oculto');
  filaEl.classList.remove('oculto');
  saludoEl.classList.add('transicion-entrada');
  filaEl.classList.add('transicion-entrada');
  setTimeout(() => {
    saludoEl.classList.remove('transicion-entrada');
    filaEl.classList.remove('transicion-entrada');
  }, 220);

  // obtenerLeidos() es una lectura local (un archivo pequeño en disco),
  // no una petición de red — es rápida y no recarga los RSS.
  leidosCache = await window.api.obtenerLeidos();
  pintarListaDesdeCache();

  // pintarListaDesdeCache() reconstruye la lista desde cero; si esa
  // reconstrucción cambió el alto de la página, el navegador puede recortar
  // el scroll — la restauramos al punto donde estabas antes de leer.
  window.scrollTo(0, scrollPrincipalGuardado);
}

document.getElementById('cerrar-lectura').addEventListener('click', cerrarModoLectura);

// Botón explícito: abre el artículo actual en el navegador del sistema,
// sin importar de qué sitio sea (útil si el modo lectura no extrajo bien el texto).
document.getElementById('abrir-externo').addEventListener('click', () => {
  if (enlaceActual) window.api.abrirExterno(enlaceActual);
});

// Botón de actualizar: vuelve a intentar cargar el artículo actual desde
// cero (forzar = true), por si la primera vez no cargó bien.
document.getElementById('actualizar-articulo').addEventListener('click', () => {
  if (enlaceActual) abrirModoLectura(enlaceActual, true);
});

// --- Guardar, compartir y modo cálido del artículo ---

// Toma los datos del artículo desde articulosCache si está ahí (para
// tener imagen/categoría); si se llegó por un enlace externo que no
// venía del feed, usa lo que ya se ve en pantalla como respaldo.
function datosArticuloActual() {
  const enCache = articulosCache.find((a) => a.enlace === enlaceActual);
  if (enCache) return enCache;
  return {
    enlace: enlaceActual,
    titulo: document.getElementById('lectura-titulo').textContent,
    fuente: document.getElementById('lectura-sitio').textContent,
    imagen: null,
    categoria: null
  };
}

function actualizarBotonGuardarArticulo() {
  document.getElementById('guardar-articulo').classList.toggle('guardado', estaGuardado(enlaceActual));
}

async function alternarGuardarArticuloActual() {
  if (!enlaceActual) return;
  if (estaGuardado(enlaceActual)) {
    guardadosCache = await window.api.eliminarGuardado(enlaceActual);
  } else {
    guardadosCache = await window.api.guardarArticulo(datosArticuloActual());
  }
  actualizarBotonGuardarArticulo();
}

document.getElementById('guardar-articulo').addEventListener('click', alternarGuardarArticuloActual);

// Compartir: por ahora solo copia el enlace real al portapapeles.
document.getElementById('compartir-articulo').addEventListener('click', async () => {
  if (!enlaceActual) return;
  await navigator.clipboard.writeText(enlaceActual);
  const boton = document.getElementById('compartir-articulo');
  boton.classList.add('guardado'); // reutiliza el mismo estilo "activo" como confirmación breve
  setTimeout(() => boton.classList.remove('guardado'), 900);
});

// Cambia data-tema con la misma transición circular de softzone.es: un
// círculo que crece desde el punto del clic que originó el cambio (ver
// @keyframes circulo-tema en styles.css). Si el navegador no soporta la
// View Transitions API, cambia el tema igual, solo que sin animación.
// Envuelve cualquier cambio de estado visual en la misma transición
// circular (ver @keyframes circulo-tema en styles.css) — la usan tanto el
// tema claro/oscuro como el modo cálido de lectura, son dos cosas
// independientes pero se ven igual de bien al cambiar.
function conTransicionCircular(xOrigen, yOrigen, cambiarEstado) {
  document.documentElement.style.setProperty('--origen-tema-x', `${xOrigen}px`);
  document.documentElement.style.setProperty('--origen-tema-y', `${yOrigen}px`);

  if (document.startViewTransition) {
    document.startViewTransition(cambiarEstado);
  } else {
    cambiarEstado();
  }
}

function cambiarTema(temaNuevo, xOrigen, yOrigen) {
  conTransicionCircular(xOrigen, yOrigen, () => {
    document.documentElement.dataset.tema = temaNuevo;
  });
}

function actualizarIconoTema(tema) {
  document.getElementById('alternar-tema').textContent = tema === 'oscuro' ? '🌙' : '☀️';
}

// Botón de la pantalla principal: alterna claro/oscuro para TODA la app
// (a diferencia del modo cálido de abajo, que solo toca el panel de
// lectura). Disponible aquí y no solo en Configuración, como pidió Abel.
document.getElementById('alternar-tema').addEventListener('click', async (evento) => {
  const nuevo = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  cambiarTema(nuevo, evento.clientX, evento.clientY);
  actualizarIconoTema(nuevo);
  await window.api.guardarConfiguracion({ tema: nuevo });
});

// Modo cálido de lectura: antes reutilizaba la misma variable "tema"
// (claro/oscuro/cálido) y por eso activarlo mientras estabas en oscuro
// hacía que TODA la app volviera a claro de golpe — este bug es justo lo
// que pidió Abel corregir. Ahora es una clase aparte en #modo-lectura,
// totalmente independiente del tema general (ver styles.css).
document.getElementById('alternar-calido').addEventListener('click', async (evento) => {
  const activo = !document.getElementById('modo-lectura').classList.contains('calido');
  conTransicionCircular(evento.clientX, evento.clientY, () => {
    document.getElementById('modo-lectura').classList.toggle('calido', activo);
  });
  document.getElementById('alternar-calido').classList.toggle('guardado', activo);
  await window.api.guardarConfiguracion({ modoCalidoLectura: activo });
});

// --- Ver por fuente ---
//
// Grid de tarjetas, una por cada sitio en config/fuentes.json (vía
// obtenerFuentes), coloreada con el mismo color de identidad que ya usan
// las noticias y la barra lateral del modo lectura (--source-color). Al
// tocar una, fuenteActiva pasa a mandar sobre las pestañas de categoría.
async function pintarGridFuentes() {
  const contenedor = document.getElementById('grid-fuentes');
  contenedor.innerHTML = '';

  const fuentes = await window.api.obtenerFuentes();

  fuentes.forEach((fuente) => {
    const articulosDeFuente = articulosCache.filter((a) => a.fuente === fuente.nombre);
    // El favicon sale del enlace de un artículo real (ej. xataka.com), no
    // de la URL del feed (ej. feeds.weblogssl.com) — casi nunca son el
    // mismo dominio.
    const enlaceParaFavicon = articulosDeFuente[0] ? articulosDeFuente[0].enlace : fuente.url;

    const tarjeta = document.createElement('button');
    tarjeta.className = 'tarjeta-fuente-filtro';
    tarjeta.style.setProperty('--source-color', fuente.color || 'var(--accent)');
    tarjeta.innerHTML = `
      <img class="favicon-tarjeta-fuente" src="${urlFavicon(enlaceParaFavicon)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <span class="nombre-tarjeta-fuente">${escaparHtml(fuente.nombre)}</span>
      <span class="cantidad-tarjeta-fuente">${articulosDeFuente.length} noticias</span>
    `;
    tarjeta.addEventListener('click', async () => {
      fuenteActiva = fuente.nombre;
      noticiasVisibles = NOTICIAS_POR_PAGINA;
      pintarPestanas();
      pintarListaDesdeCache();
      await cerrarCapaModal('capa-fuentes', 'contenido-fuentes');
    });
    contenedor.appendChild(tarjeta);
  });
}

document.getElementById('abrir-fuentes').addEventListener('click', () => {
  pintarGridFuentes();
  abrirCapaModal('capa-fuentes', 'contenido-fuentes');
});
document.getElementById('cerrar-fuentes').addEventListener('click', () => {
  cerrarCapaModal('capa-fuentes', 'contenido-fuentes');
});
document.getElementById('capa-fuentes').addEventListener('click', (evento) => {
  if (evento.target.id === 'capa-fuentes') cerrarCapaModal('capa-fuentes', 'contenido-fuentes');
});

// --- Panel de Guardados ---

async function pintarGuardados() {
  guardadosCache = await window.api.obtenerGuardados();
  const contenedor = document.getElementById('lista-guardados');
  contenedor.innerHTML = '';

  if (guardadosCache.length === 0) {
    contenedor.innerHTML = '<p class="estado">No tienes noticias guardadas.</p>';
    return;
  }

  guardadosCache.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'item-guardado';
    div.innerHTML = `
      ${item.imagen ? `<img class="miniatura-guardado" src="${escaparHtml(item.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <div class="info-guardado">
        <span class="titulo-guardado">${escaparHtml(item.titulo)}</span>
        <span class="fuente-guardado">${escaparHtml(item.fuente)}</span>
      </div>
      <button class="boton-eliminar-guardado" title="Quitar">✕</button>
    `;

    div.addEventListener('click', async (evento) => {
      if (evento.target.closest('.boton-eliminar-guardado')) return;
      await cerrarCapaModal('capa-guardados', 'contenido-guardados');
      abrirModoLectura(item.enlace);
    });

    div.querySelector('.boton-eliminar-guardado').addEventListener('click', async (evento) => {
      evento.stopPropagation();
      guardadosCache = await window.api.eliminarGuardado(item.enlace);
      pintarGuardados();
      if (item.enlace === enlaceActual) actualizarBotonGuardarArticulo();
    });

    contenedor.appendChild(div);
  });
}

document.getElementById('abrir-guardados').addEventListener('click', () => {
  pintarGuardados();
  abrirCapaModal('capa-guardados', 'contenido-guardados');
});
document.getElementById('cerrar-guardados').addEventListener('click', () => {
  cerrarCapaModal('capa-guardados', 'contenido-guardados');
});
document.getElementById('capa-guardados').addEventListener('click', (evento) => {
  if (evento.target.id === 'capa-guardados') cerrarCapaModal('capa-guardados', 'contenido-guardados');
});

// --- Ayuda de atajos de teclado ---

function mostrarAyudaAtajos() {
  const capa = document.getElementById('capa-ayuda-atajos');
  if (capa.classList.contains('oculto')) {
    abrirCapaModal('capa-ayuda-atajos', 'contenido-ayuda-atajos');
  } else {
    cerrarCapaModal('capa-ayuda-atajos', 'contenido-ayuda-atajos');
  }
}

document.getElementById('cerrar-ayuda-atajos').addEventListener('click', () => {
  cerrarCapaModal('capa-ayuda-atajos', 'contenido-ayuda-atajos');
});
document.getElementById('capa-ayuda-atajos').addEventListener('click', (evento) => {
  if (evento.target.id === 'capa-ayuda-atajos') cerrarCapaModal('capa-ayuda-atajos', 'contenido-ayuda-atajos');
});

// Colapsar/expandir la barra lateral de artículos.
document.getElementById('alternar-barra').addEventListener('click', () => {
  const barra = document.getElementById('barra-lateral');
  const boton = document.getElementById('alternar-barra');
  barra.classList.toggle('colapsada');
  boton.textContent = barra.classList.contains('colapsada') ? '⟩' : '⟨';
});

// Intercepta los enlaces DENTRO de un artículo (los que trae el propio
// texto de la noticia, no los de nuestra interfaz). Si van a un sitio que
// ya conocemos por el feed, se abren en modo lectura. Si no, al navegador.
document.getElementById('lectura-contenido').addEventListener('click', (evento) => {
  const enlace = evento.target.closest('a');
  if (!enlace || !enlace.href) return;

  evento.preventDefault();

  if (esFuentePropia(enlace.href)) {
    abrirModoLectura(enlace.href);
  } else {
    window.api.abrirExterno(enlace.href);
  }
});

// Oculta el encabezado al bajar, lo muestra al subir — igual que la barra
// de direcciones de un navegador en celular. Un margen de 10px evita que
// tiemble por pequeños movimientos accidentales del scroll.
document.getElementById('area-scroll').addEventListener('scroll', (evento) => {
  const encabezado = document.getElementById('encabezado-articulo');
  const scrollActual = evento.target.scrollTop;
  const diferencia = scrollActual - ultimoScrollTop;

  if (scrollActual > 40 && diferencia > 10) {
    encabezado.classList.add('oculto-scroll'); // bajando
  } else if (diferencia < -10 || scrollActual <= 0) {
    encabezado.classList.remove('oculto-scroll'); // subiendo
  }

  ultimoScrollTop = scrollActual;
});

// --- Píldora de acción rápida (aparece al seleccionar texto en el artículo) ---
//
// A diferencia de lo que asume un mini-menú "genérico" de selección, acá el
// scroll real del artículo ocurre DENTRO de #area-scroll, no en la ventana
// completa — por eso la píldora usa position: fixed (ver styles.css) y las
// coordenadas de getBoundingClientRect() sirven tal cual, sin sumarles el
// scroll de la página.
const pildoraSeleccion = document.getElementById('pildora-seleccion');

function ocultarPildoraSeleccion() {
  pildoraSeleccion.classList.remove('visible');
}

function posicionarPildoraSeleccion(rect) {
  const anchoPildora = pildoraSeleccion.offsetWidth || 108;
  let izquierda = rect.left + rect.width / 2 - anchoPildora / 2;
  izquierda = Math.max(8, Math.min(izquierda, window.innerWidth - anchoPildora - 8));

  // Encima del texto por defecto; si no cabe (selección muy arriba en la
  // pantalla), aparece debajo en su lugar.
  let arriba = rect.top - 44;
  if (arriba < 8) arriba = rect.bottom + 10;

  pildoraSeleccion.style.left = `${izquierda}px`;
  pildoraSeleccion.style.top = `${arriba}px`;
  pildoraSeleccion.classList.add('visible');
}

document.getElementById('lectura-contenido').addEventListener('mouseup', () => {
  const seleccion = window.getSelection();
  const texto = seleccion.toString().trim();

  if (!texto || seleccion.rangeCount === 0) {
    ocultarPildoraSeleccion();
    return;
  }

  textoSeleccionActual = texto;
  posicionarPildoraSeleccion(seleccion.getRangeAt(0).getBoundingClientRect());
});

// Evita que el mousedown sobre un botón de la píldora le quite el resaltado
// a la selección de texto antes de que el clic llegue a alcanzar su acción.
pildoraSeleccion.addEventListener('mousedown', (evento) => evento.preventDefault());

// Clic fuera de la píldora (en cualquier parte de la app) la cierra.
document.addEventListener('mousedown', (evento) => {
  if (!pildoraSeleccion.contains(evento.target)) ocultarPildoraSeleccion();
});

// Igual que el mini-menú de selección de Edge: se oculta al hacer scroll
// en vez de recalcular su posición en cada frame.
document.getElementById('area-scroll').addEventListener('scroll', ocultarPildoraSeleccion);

document.getElementById('pildora-copiar').addEventListener('click', async () => {
  if (!textoSeleccionActual) return;

  await navigator.clipboard.writeText(textoSeleccionActual);

  const boton = document.getElementById('pildora-copiar');
  const contenidoOriginal = boton.innerHTML;
  boton.innerHTML = '✅';
  setTimeout(() => { boton.innerHTML = contenidoOriginal; }, 1200);

  ocultarPildoraSeleccion();
});

// "IA": abre un panel acoplado al borde derecho de la ventana (ver
// src/panel-ia.js) con una búsqueda de Google en Modo IA para el texto
// seleccionado. Es la página real de Google sin recortar ni reformatear —
// solo vive dentro de nuestra ventana en vez de abrir un navegador aparte.
document.getElementById('pildora-ia').addEventListener('click', () => {
  if (!textoSeleccionActual) return;

  const consulta = textoSeleccionActual.slice(0, 300);
  window.api.buscarConIA(consulta);
  document.getElementById('boton-cerrar-panel-ia').classList.add('visible');
  ocultarPildoraSeleccion();
});

document.getElementById('boton-cerrar-panel-ia').addEventListener('click', () => {
  window.api.cerrarPanelIA();
  document.getElementById('boton-cerrar-panel-ia').classList.remove('visible');
});

document.getElementById('pildora-traducir').addEventListener('click', () => {
  console.log('Texto para traducir:', textoSeleccionActual);
});

// --- Calendario ---

let modalCalendarioAbierto = false; // si está abierto, se repinta junto con el widget chico

// Fecha -> "2026-09-09", usando los componentes locales (no UTC), para
// que no se recorra un día por la zona horaria.
function claveFecha(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// "variante" decide cómo se muestran los recordatorios dentro de la celda:
// 'compacta' (el widget chico) solo pone un puntito de color; 'grande'
// (el calendario expandido) muestra una píldora con el inicio del texto.
function crearCeldaDia(fecha, esOtroMes, variante) {
  const div = document.createElement('div');
  div.className = 'dia-calendario';
  if (variante === 'grande') div.classList.add('dia-calendario-grande');
  if (esOtroMes) div.classList.add('otro-mes');
  if (claveFecha(fecha) === claveFecha(new Date())) div.classList.add('hoy');
  if (claveFecha(fecha) === claveFecha(diaSeleccionado)) div.classList.add('seleccionado');

  const numero = document.createElement('span');
  numero.className = 'numero-dia';
  numero.textContent = fecha.getDate();
  div.appendChild(numero);

  const recordatoriosDia = recordatoriosCache[claveFecha(fecha)] || [];
  if (recordatoriosDia.length > 0) {
    if (variante === 'grande') {
      const pildoras = document.createElement('div');
      pildoras.className = 'pildoras-recordatorio';
      recordatoriosDia.slice(0, 2).forEach((r) => {
        const pildora = document.createElement('span');
        pildora.className = 'pildora-recordatorio';
        pildora.style.background = r.color;
        pildora.textContent = r.texto.length > 9 ? `${r.texto.slice(0, 9)}…` : r.texto;
        pildoras.appendChild(pildora);
      });
      div.appendChild(pildoras);
    } else {
      const puntos = document.createElement('div');
      puntos.className = 'puntos-recordatorio';
      recordatoriosDia.slice(0, 3).forEach((r) => {
        const punto = document.createElement('span');
        punto.className = 'punto-recordatorio';
        punto.style.background = r.color;
        puntos.appendChild(punto);
      });
      div.appendChild(puntos);
    }
  }

  div.addEventListener('click', () => {
    diaSeleccionado = fecha;
    if (esOtroMes) mesVisible = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    actualizarCalendarioCompleto();
  });

  return div;
}

function pintarCalendarioEn(idTitulo, idGrid, variante) {
  document.getElementById(idTitulo).textContent = mesVisible.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric'
  });

  const grid = document.getElementById(idGrid);
  grid.innerHTML = '';

  const primerDiaMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  const ultimoDiaMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0);
  const diaSemanaInicio = primerDiaMes.getDay(); // 0 = domingo

  for (let i = diaSemanaInicio; i > 0; i--) {
    const fecha = new Date(primerDiaMes);
    fecha.setDate(fecha.getDate() - i);
    grid.appendChild(crearCeldaDia(fecha, true, variante));
  }

  for (let d = 1; d <= ultimoDiaMes.getDate(); d++) {
    grid.appendChild(crearCeldaDia(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), d), false, variante));
  }

  const celdasUsadas = diaSemanaInicio + ultimoDiaMes.getDate();
  const celdasFaltantes = (7 - (celdasUsadas % 7)) % 7;
  for (let i = 1; i <= celdasFaltantes; i++) {
    const fecha = new Date(ultimoDiaMes);
    fecha.setDate(fecha.getDate() + i);
    grid.appendChild(crearCeldaDia(fecha, true, variante));
  }
}

function pintarRecordatoriosDiaEn(idTitulo, idLista) {
  document.getElementById(idTitulo).textContent = diaSeleccionado.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const contenedor = document.getElementById(idLista);
  contenedor.innerHTML = '';

  const items = recordatoriosCache[claveFecha(diaSeleccionado)] || [];

  if (items.length === 0) {
    contenedor.innerHTML = '<p class="estado">Sin recordatorios.</p>';
    return;
  }

  items.forEach((recordatorio) => {
    const item = document.createElement('div');
    item.className = 'item-recordatorio';
    const horaHtml = recordatorio.hora ? `<span class="hora-recordatorio">${escaparHtml(recordatorio.hora)}</span>` : '';
    item.innerHTML = `
      <span class="barra-color-recordatorio" style="background: ${escaparHtml(recordatorio.color)}"></span>
      ${horaHtml}
      <span class="texto-recordatorio">${escaparHtml(recordatorio.texto)}</span>
      <button class="boton-eliminar-recordatorio" title="Eliminar">✕</button>
    `;

    item.querySelector('.boton-eliminar-recordatorio').addEventListener('click', async () => {
      recordatoriosCache = await window.api.eliminarRecordatorio({
        fecha: claveFecha(diaSeleccionado),
        id: recordatorio.id
      });
      actualizarCalendarioCompleto();
    });

    contenedor.appendChild(item);
  });
}

// Repinta el widget chico siempre, y el modal expandido solo si está
// abierto — así ambos quedan sincronizados con el mismo estado
// (mesVisible, diaSeleccionado, recordatoriosCache) sin duplicarlo.
function actualizarCalendarioCompleto() {
  pintarCalendarioEn('titulo-mes', 'grid-calendario', 'compacta');
  pintarRecordatoriosDiaEn('titulo-dia-seleccionado', 'lista-recordatorios');

  if (modalCalendarioAbierto) {
    pintarCalendarioEn('titulo-mes-grande', 'grid-calendario-grande', 'grande');
    pintarRecordatoriosDiaEn('titulo-dia-seleccionado-grande', 'lista-recordatorios-grande');
  }
}

// El color elegido se guarda como atributo del propio contenedor de
// swatches — así el widget chico y el del modal pueden tener cada uno su
// selección, sin necesitar una variable aparte por cada uno.
function pintarSelectorColores(idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  contenedor.innerHTML = '';
  contenedor.dataset.colorSeleccionado = COLORES_RECORDATORIO[0];

  COLORES_RECORDATORIO.forEach((color, indice) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `swatch-color ${indice === 0 ? 'activo' : ''}`;
    boton.style.background = color;
    boton.title = color;

    boton.addEventListener('click', () => {
      contenedor.dataset.colorSeleccionado = color;
      contenedor.querySelectorAll('.swatch-color').forEach((s) => s.classList.remove('activo'));
      boton.classList.add('activo');
    });

    contenedor.appendChild(boton);
  });
}

// "sufijo" es '' para el widget chico o '-grande' para el modal — así una
// sola función sirve para los dos formularios de "nuevo recordatorio".
async function agregarRecordatorioNuevo(sufijo) {
  const input = document.getElementById(`input-recordatorio${sufijo}`);
  const texto = input.value.trim();
  if (!texto) return;

  const inputHora = document.getElementById(`input-hora-recordatorio${sufijo}`);
  const hora = inputHora && inputHora.value ? inputHora.value : null;

  const color = document.getElementById(`colores-recordatorio${sufijo}`).dataset.colorSeleccionado;

  recordatoriosCache = await window.api.agregarRecordatorio({
    fecha: claveFecha(diaSeleccionado),
    texto,
    color,
    hora
  });

  input.value = '';
  if (inputHora) inputHora.value = '';
  document.getElementById(`form-recordatorio${sufijo}`).classList.add('colapsado'); // se vuelve a esconder tras agregar
  actualizarCalendarioCompleto();
}

// --- Animación compartida para los modales (Configuración y Calendario
// expandido) — fundido + escala, misma curva que el resto de la app.
function abrirCapaModal(idCapa, idContenido) {
  const contenido = document.getElementById(idContenido);
  document.getElementById(idCapa).classList.remove('oculto');
  contenido.classList.remove('salida-modal');
  contenido.classList.add('entrada-modal');
}

async function cerrarCapaModal(idCapa, idContenido) {
  const contenido = document.getElementById(idContenido);
  contenido.classList.remove('entrada-modal');
  contenido.classList.add('salida-modal');
  await esperar(150);
  contenido.classList.remove('salida-modal');
  document.getElementById(idCapa).classList.add('oculto');
}

function abrirCalendarioExpandido() {
  modalCalendarioAbierto = true;
  abrirCapaModal('capa-calendario-expandido', 'modal-calendario-grande');
  actualizarCalendarioCompleto();
}

async function cerrarCalendarioExpandido() {
  modalCalendarioAbierto = false;
  await cerrarCapaModal('capa-calendario-expandido', 'modal-calendario-grande');
}

document.getElementById('mes-anterior').addEventListener('click', () => {
  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1);
  actualizarCalendarioCompleto();
});
document.getElementById('mes-siguiente').addEventListener('click', () => {
  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
  actualizarCalendarioCompleto();
});
document.getElementById('agregar-recordatorio').addEventListener('click', () => agregarRecordatorioNuevo(''));
document.getElementById('input-recordatorio').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') agregarRecordatorioNuevo('');
});
document.getElementById('abrir-form-recordatorio').addEventListener('click', () => {
  document.getElementById('form-recordatorio').classList.toggle('colapsado');
});

document.getElementById('expandir-calendario').addEventListener('click', abrirCalendarioExpandido);
document.getElementById('cerrar-calendario-expandido').addEventListener('click', cerrarCalendarioExpandido);
document.getElementById('capa-calendario-expandido').addEventListener('click', (evento) => {
  if (evento.target.id === 'capa-calendario-expandido') cerrarCalendarioExpandido(); // clic fuera del modal, en el fondo oscuro
});
document.getElementById('mes-anterior-grande').addEventListener('click', () => {
  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1);
  actualizarCalendarioCompleto();
});
document.getElementById('mes-siguiente-grande').addEventListener('click', () => {
  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
  actualizarCalendarioCompleto();
});
document.getElementById('agregar-recordatorio-grande').addEventListener('click', () => agregarRecordatorioNuevo('-grande'));
document.getElementById('input-recordatorio-grande').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') agregarRecordatorioNuevo('-grande');
});
document.getElementById('abrir-form-recordatorio-grande').addEventListener('click', () => {
  document.getElementById('form-recordatorio-grande').classList.toggle('colapsado');
});

// --- Panel de configuración ---

// El catálogo completo de Chía como chips seleccionables — la elegida
// queda en esta variable hasta que se guarde de verdad (mismo patrón que
// el resto del formulario: nada se persiste hasta tocar "Guardar cambios").
let caraChiaSeleccionadaEnFormulario = 'relajado';

function pintarSelectorCarasChia(seleccionActual) {
  caraChiaSeleccionadaEnFormulario = seleccionActual;
  const contenedor = document.getElementById('selector-caras-chia');
  contenedor.innerHTML = '';

  Object.entries(EXPRESIONES_CHIA).forEach(([id, expresion]) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `opcion-cara-chia ${id === caraChiaSeleccionadaEnFormulario ? 'seleccionada' : ''}`;
    boton.textContent = expresion.cara;
    boton.title = expresion.nombre;
    boton.addEventListener('click', () => pintarSelectorCarasChia(id));
    contenedor.appendChild(boton);
  });
}

function poblarFormularioConfiguracion(config) {
  document.getElementById('input-nombre').value = config.nombre;
  document.getElementById('input-tema').value = config.tema || 'claro';
  document.getElementById('input-modo-calido-lectura').checked = Boolean(config.modoCalidoLectura);
  document.getElementById('input-ciudad').value = config.ciudad || '';
  document.getElementById('input-noticias-pagina').value = String(config.noticiasPorPagina);
  document.getElementById('input-unidad-temperatura').value = config.unidadTemperatura || 'celsius';
  document.getElementById('input-formato-hora').value = config.formato24h ? '24' : '12';
  document.getElementById('input-iniciar-con-windows').checked = config.iniciarConWindows !== false;
  pintarSelectorCarasChia(config.caraChiaPredeterminada || 'relajado');
}

// Todo lo que debe verse reflejado DE INMEDIATO en el resto de la app,
// sin esperar a cerrar Configuración ni reiniciar — lo usan tanto
// "Guardar cambios" como "Restablecer predeterminados".
function aplicarConfigEnVivo(config, evento) {
  cambiarTema(config.tema, evento.clientX, evento.clientY);
  actualizarIconoTema(config.tema);
  document.getElementById('modo-lectura').classList.toggle('calido', Boolean(config.modoCalidoLectura));
  document.getElementById('alternar-calido').classList.toggle('guardado', Boolean(config.modoCalidoLectura));

  NOTICIAS_POR_PAGINA = config.noticiasPorPagina;
  noticiasVisibles = NOTICIAS_POR_PAGINA;

  caraChiaPredeterminada = config.caraChiaPredeterminada || 'relajado';
  mostrarExpresionChia(caraChiaPredeterminada);
}

// Menú de secciones (izquierda) — muestra una sección a la vez.
function mostrarSeccionConfiguracion(id) {
  document.querySelectorAll('.item-menu-configuracion').forEach((boton) => {
    boton.classList.toggle('activo', boton.dataset.seccion === id);
  });
  document.querySelectorAll('.seccion-configuracion').forEach((seccion) => {
    seccion.classList.toggle('oculto', seccion.dataset.seccion !== id);
  });
  document.querySelector('.contenido-seccion-configuracion').scrollTop = 0;
}

document.querySelectorAll('.item-menu-configuracion').forEach((boton) => {
  boton.addEventListener('click', () => mostrarSeccionConfiguracion(boton.dataset.seccion));
});

async function abrirConfiguracion() {
  const config = await window.api.obtenerConfiguracion();
  poblarFormularioConfiguracion(config);
  mostrarSeccionConfiguracion('perfil');
  pintarListaFuentes();
  abrirCapaModal('panel-configuracion', 'contenido-configuracion');
}

async function cerrarConfiguracion() {
  await cerrarCapaModal('panel-configuracion', 'contenido-configuracion');
}

async function guardarCambiosConfiguracion(evento) {
  const nombre = document.getElementById('input-nombre').value.trim() || 'Usuario';
  const tema = document.getElementById('input-tema').value;
  const modoCalidoLectura = document.getElementById('input-modo-calido-lectura').checked;
  const ciudadEscrita = document.getElementById('input-ciudad').value.trim();
  const noticiasPorPagina = Number(document.getElementById('input-noticias-pagina').value);
  const unidadTemperatura = document.getElementById('input-unidad-temperatura').value;
  const formato24h = document.getElementById('input-formato-hora').value === '24';

  const cambios = {
    nombre, tema, modoCalidoLectura, noticiasPorPagina,
    unidadTemperatura, formato24h,
    iniciarConWindows: document.getElementById('input-iniciar-con-windows').checked,
    caraChiaPredeterminada: caraChiaSeleccionadaEnFormulario
  };

  if (ciudadEscrita) {
    const encontrada = await window.api.buscarCiudad(ciudadEscrita);
    if (encontrada) {
      cambios.ciudad = encontrada.ciudad;
      cambios.latitud = encontrada.latitud;
      cambios.longitud = encontrada.longitud;
    } else {
      alert(`No se encontró "${ciudadEscrita}". El clima se queda con la ubicación anterior.`);
    }
  }

  const nuevaConfig = await window.api.guardarConfiguracion(cambios);
  aplicarConfigEnVivo(nuevaConfig, evento);

  await cerrarConfiguracion();
  await pintarSaludo(); // para que el nombre/formato de hora nuevos se vean de inmediato
  pintarListaDesdeCache();
  pintarClima(); // por si la ciudad o la unidad cambiaron
}

document.getElementById('restablecer-configuracion').addEventListener('click', async (evento) => {
  const confirmado = confirm(
    '¿Restablecer todos los ajustes de Configuración a sus valores de fábrica? ' +
    'Tus noticias leídas, guardadas, recordatorios y fuentes no se tocan — solo esta pantalla.'
  );
  if (!confirmado) return;

  const config = await window.api.restablecerConfiguracion();
  poblarFormularioConfiguracion(config);
  aplicarConfigEnVivo(config, evento);

  await pintarSaludo();
  pintarListaDesdeCache();
  pintarClima();
});

async function restablecerEstadoLectura() {
  const confirmado = window.confirm('¿Desmarcar todas las noticias leídas? Esta acción no se puede deshacer.');
  if (!confirmado) return;

  leidosCache = await window.api.restablecerLeidos();
  pintarListaDesdeCache();
}

// --- Mis fuentes de noticias (dentro de Configuración) ---

async function pintarListaFuentes() {
  const fuentes = await window.api.obtenerFuentes();
  const contenedor = document.getElementById('lista-fuentes');
  contenedor.innerHTML = '';

  fuentes.forEach((fuente) => {
    // Mismo truco que pintarGridFuentes: el favicon real sale del enlace
    // de un artículo de esta fuente (ej. xataka.com), no de la URL del
    // feed (ej. feeds.weblogssl.com) — casi nunca son el mismo dominio.
    const articuloDeFuente = articulosCache.find((a) => a.fuente === fuente.nombre);
    const enlaceParaFavicon = articuloDeFuente ? articuloDeFuente.enlace : fuente.url;

    const item = document.createElement('div');
    item.className = `item-fuente ${fuente.activa === false ? 'inactiva' : ''}`;
    item.style.setProperty('--source-color', fuente.color || 'var(--accent)');
    item.innerHTML = `
      <button class="boton-eliminar-fuente" title="Eliminar">✕</button>
      <div class="fila-superior-fuente">
        <img class="favicon-item-fuente" src="${urlFavicon(enlaceParaFavicon)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <span class="nombre-item-fuente">${escaparHtml(fuente.nombre)}</span>
      </div>
      <div class="fila-inferior-fuente">
        <span class="categoria-item-fuente">${escaparHtml(fuente.categoria)}</span>
        <span class="interruptor" title="Encender/apagar esta fuente">
          <input type="checkbox" class="interruptor-fuente" ${fuente.activa === false ? '' : 'checked'} />
          <span class="interruptor-riel"></span>
        </span>
      </div>
    `;

    item.querySelector('.interruptor-fuente').addEventListener('change', async () => {
      await window.api.alternarFuenteActiva(fuente.url);
      item.classList.toggle('inactiva');
      pintarNoticias(); // refleja de inmediato si la fuente entra o sale de la lista
    });

    item.querySelector('.boton-eliminar-fuente').addEventListener('click', async () => {
      await window.api.eliminarFuente(fuente.url);
      pintarListaFuentes();
      pintarNoticias(); // la lista de noticias ya no debe incluir esta fuente
    });

    contenedor.appendChild(item);
  });
}

async function guardarNuevaFuente() {
  const nombre = document.getElementById('input-nombre-fuente').value.trim();
  const url = document.getElementById('input-url-fuente').value.trim();
  const categoria = document.getElementById('input-categoria-fuente').value.trim() || 'General';
  const color = document.getElementById('input-color-fuente').value;

  if (!nombre || !url) return;

  await window.api.agregarFuente({ nombre, url, categoria, color });

  document.getElementById('input-nombre-fuente').value = '';
  document.getElementById('input-url-fuente').value = '';
  document.getElementById('input-categoria-fuente').value = '';
  document.getElementById('form-fuente').classList.add('colapsado');

  pintarListaFuentes();
  pintarNoticias(); // descarga ya la fuente nueva, para que aparezca de inmediato
}

document.getElementById('abrir-configuracion').addEventListener('click', abrirConfiguracion);
document.getElementById('cerrar-configuracion').addEventListener('click', cerrarConfiguracion);
document.getElementById('guardar-configuracion').addEventListener('click', guardarCambiosConfiguracion);
document.getElementById('restablecer-leidos').addEventListener('click', restablecerEstadoLectura);
document.getElementById('abrir-form-fuente').addEventListener('click', () => {
  document.getElementById('form-fuente').classList.toggle('colapsado');
});
document.getElementById('guardar-nueva-fuente').addEventListener('click', guardarNuevaFuente);

// --- Comentarios (Configuración > Comentarios) ---
//
// Nada se envía desde la app: los botones solo abren una página en el
// navegador del usuario, donde él decide qué escribir y si lo manda.
// URL_FORMULARIO_COMENTARIOS se llena cuando exista el formulario
// (Google Forms o Tally); mientras esté vacía, el botón queda oculto.
const URL_FORMULARIO_COMENTARIOS = 'https://tally.so/r/A7k5Ye';
const URL_GITHUB_ISSUES = 'https://github.com/Sepulveda710/simple-welcome/issues/new';

// Prellena el cuerpo del issue con la versión — GitHub lo muestra completo
// antes de enviar, así que el usuario ve y puede borrar lo que quiera.
function urlComentariosGithub(version) {
  const cuerpo = `Versión de Simple Welcome: ${version}\n\n(Escribe aquí tu comentario o describe el error)`;
  return `${URL_GITHUB_ISSUES}?body=${encodeURIComponent(cuerpo)}`;
}

if (URL_FORMULARIO_COMENTARIOS) {
  document.getElementById('abrir-formulario-comentarios').classList.remove('oculto');
}
document.getElementById('abrir-formulario-comentarios').addEventListener('click', () => {
  window.api.abrirExterno(URL_FORMULARIO_COMENTARIOS);
});
document.getElementById('abrir-issues-github').addEventListener('click', async () => {
  window.api.abrirExterno(urlComentariosGithub(await window.api.obtenerVersionApp()));
});


// --- Atajos de teclado ---
// Todo vive en un solo listener para que sea fácil ver de un vistazo qué
// atajos existen y en qué orden se evalúan.
document.addEventListener('keydown', (evento) => {
  const enCampoTexto = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

  // Esc: cierra la primera ventana emergente que encuentre abierta (solo
  // puede haber una a la vez en la práctica), o si no hay ninguna y estás
  // escribiendo en un campo, le quita el foco.
  if (evento.key === 'Escape') {
    if (!document.getElementById('capa-calendario-expandido').classList.contains('oculto')) {
      cerrarCalendarioExpandido();
    } else if (!document.getElementById('panel-configuracion').classList.contains('oculto')) {
      cerrarConfiguracion();
    } else if (!document.getElementById('capa-guardados').classList.contains('oculto')) {
      cerrarCapaModal('capa-guardados', 'contenido-guardados');
    } else if (!document.getElementById('capa-fuentes').classList.contains('oculto')) {
      cerrarCapaModal('capa-fuentes', 'contenido-fuentes');
    } else if (!document.getElementById('capa-ayuda-atajos').classList.contains('oculto')) {
      cerrarCapaModal('capa-ayuda-atajos', 'contenido-ayuda-atajos');
    } else if (enCampoTexto) {
      document.activeElement.blur();
    }
    return;
  }

  // "?" muestra la ayuda — nunca mientras se está escribiendo.
  if (evento.key === '?' && !enCampoTexto) {
    evento.preventDefault();
    mostrarAyudaAtajos();
    return;
  }

  // El resto de los atajos no debe dispararse mientras el usuario escribe
  // en un campo de texto (recordatorios, fuentes, ciudad, etc.)
  if (enCampoTexto) return;

  const enModoLectura = !document.getElementById('modo-lectura').classList.contains('oculto');

  // Volver al inicio desde el modo lectura.
  if (enModoLectura && (evento.key === 'Backspace' || (evento.altKey && evento.key === 'ArrowLeft'))) {
    evento.preventDefault();
    cerrarModoLectura();
    return;
  }

  // Ctrl+1..9: salta a la pestaña en esa posición — se calcula solo
  // porque las pestañas son dinámicas (crecen conforme agregas categorías).
  if (evento.ctrlKey && /^[1-9]$/.test(evento.key)) {
    evento.preventDefault();
    const pestanas = document.querySelectorAll('.pestana');
    const indice = Number(evento.key) - 1;
    if (pestanas[indice]) pestanas[indice].click();
    return;
  }

  // Ctrl+N: abre el calendario, expande el formulario colapsado y recién
  // entonces enfoca el campo (si no, enfocarías un campo invisible).
  if (evento.ctrlKey && evento.key.toLowerCase() === 'n') {
    evento.preventDefault();
    abrirCalendarioExpandido();
    document.getElementById('form-recordatorio-grande').classList.remove('colapsado');
    setTimeout(() => document.getElementById('input-recordatorio-grande').focus(), 210);
    return;
  }

  // Ctrl+R / F5: refresca las noticias sin recargar toda la ventana. El
  // menú de Electron ya no tiene "Recargar" asignado (ver main.js), así
  // que este es el único que responde a estas teclas.
  if ((evento.ctrlKey && evento.key.toLowerCase() === 'r') || evento.key === 'F5') {
    evento.preventDefault();
    pintarNoticias();
    return;
  }

  // Ctrl+,: abre Configuración.
  if (evento.ctrlKey && evento.key === ',') {
    evento.preventDefault();
    abrirConfiguracion();
    return;
  }

  // J/K: siguiente/anterior artículo, solo tiene sentido en modo lectura.
  if (enModoLectura && evento.key.toLowerCase() === 'j') {
    document.getElementById('articulo-siguiente').click();
    return;
  }
  if (enModoLectura && evento.key.toLowerCase() === 'k') {
    document.getElementById('articulo-anterior').click();
    return;
  }

  // G: guardar el artículo actual. C: compartir (copiar enlace).
  if (enModoLectura && evento.key.toLowerCase() === 'g') {
    alternarGuardarArticuloActual();
    return;
  }
  if (enModoLectura && evento.key.toLowerCase() === 'c') {
    document.getElementById('compartir-articulo').click();
    return;
  }

  // Inicio: regresa el calendario a hoy.
  if (evento.key === 'Home') {
    mesVisible = new Date();
    diaSeleccionado = new Date();
    actualizarCalendarioCompleto();
    return;
  }

  // M: marca/desmarca como leída la tarjeta de noticia que tiene el
  // mouse encima en ese momento (se rastrea con mouseenter/mouseleave
  // en cada tarjeta, dentro de crearTarjetaNoticia).
  if (evento.key.toLowerCase() === 'm' && tarjetaBajoElMouse) {
    tarjetaBajoElMouse.querySelector('.boton-marcar').click();
  }
});

// --- Arranque ---

async function iniciar() {
  // Cargamos la configuración guardada antes de pintar nada, para que
  // "noticias por página" y el tema ya tengan el valor correcto desde el inicio.
  const config = await window.api.obtenerConfiguracion();
  NOTICIAS_POR_PAGINA = config.noticiasPorPagina;
  noticiasVisibles = NOTICIAS_POR_PAGINA;
  caraChiaPredeterminada = config.caraChiaPredeterminada || 'relajado';
  document.documentElement.dataset.tema = config.tema || 'claro';
  actualizarIconoTema(config.tema || 'claro');
  document.getElementById('modo-lectura').classList.toggle('calido', Boolean(config.modoCalidoLectura));
  document.getElementById('alternar-calido').classList.toggle('guardado', Boolean(config.modoCalidoLectura));

  guardadosCache = await window.api.obtenerGuardados();

  recordatoriosCache = await window.api.obtenerRecordatorios();
  pintarSelectorColores('colores-recordatorio');
  pintarSelectorColores('colores-recordatorio-grande');
  actualizarCalendarioCompleto();

  pintarSaludo();
  pintarNoticias();
  pintarClima();
  pintarCitaDelDia();
  pintarVersionApp();

  mostrarExpresionChia(caraChiaPredeterminada);
  programarParpadeoChia();
  actualizarEstadoConexion(); // por si la app abre sin internet desde el arranque
}

iniciar();
