// Módulo: modo-lectura
// Responsabilidad única: dado un enlace, descargar el HTML y extraer solo
// el texto del artículo (sin anuncios, menús, banners).
//
// Contrato de salida: { titulo, textoHtml, sitio }

const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const createDOMPurify = require('dompurify');

// Caché en memoria para la sesión actual: si el usuario navega entre
// artículos (Anterior/Siguiente, o la barra lateral) y regresa a uno que
// ya abrió, no hace falta volver a descargarlo ni volver a extraer el
// texto — eso es trabajo repetido que no cambia el resultado. Acotada a
// un máximo de entradas (no solo por cantidad de artículos, sino porque
// cada una guarda el HTML completo ya limpio) — sin un tope, una sesión
// larga leyendo muchas noticias en un mismo día iría creciendo el uso de
// memoria sin límite. Map conserva el orden de inserción, así que el más
// viejo es siempre el primero — no hace falta nada más elaborado que eso
// para una limpieza tipo FIFO.
const cacheArticulos = new Map();
const MAX_ARTICULOS_EN_CACHE = 60;

function guardarEnCache(enlace, resultado) {
  if (cacheArticulos.size >= MAX_ARTICULOS_EN_CACHE) {
    cacheArticulos.delete(cacheArticulos.keys().next().value);
  }
  cacheArticulos.set(enlace, resultado);
}

const TIEMPO_LIMITE_MS = 10000; // 10 segundos

async function descargarHtml(enlace) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  try {
    const respuesta = await fetch(enlace, {
      headers: { 'User-Agent': 'Mozilla/5.0 (AppBienvenida)' },
      signal: controlador.signal
    });

    if (!respuesta.ok) {
      throw new Error(`No se pudo descargar el artículo (${respuesta.status})`);
    }

    return await respuesta.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('El sitio tardó demasiado en responder');
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

async function extraerArticulo(enlace, forzar = false) {
  if (!forzar && cacheArticulos.has(enlace)) {
    return cacheArticulos.get(enlace);
  }

  const html = await descargarHtml(enlace);
  const dom = new JSDOM(html, { url: enlace });

  const articulo = new Readability(dom.window.document).parse();

  if (!articulo) {
    throw new Error('No se pudo extraer el contenido de este artículo');
  }

  // Readability quita menús/anuncios, pero NO es un sanitizador de
  // seguridad — no promete quitar cosas como onerror="" en un <img> o un
  // href="javascript:...". Este HTML sigue viniendo de un sitio externo
  // cualquiera (cualquier feed que Abel agregue en Configuración > Mis
  // fuentes), y renderer.js lo mete directo con innerHTML para conservar
  // el formato del artículo — así que la limpieza de verdad tiene que
  // pasar aquí, antes de que cruce a la interfaz. Se reusa el mismo
  // "window" de jsdom que ya se creó arriba, no hace falta uno nuevo.
  const DOMPurify = createDOMPurify(dom.window);
  const textoSeguro = DOMPurify.sanitize(articulo.content);

  const resultado = {
    titulo: articulo.title,
    textoHtml: textoSeguro,
    sitio: articulo.siteName || new URL(enlace).hostname
  };

  guardarEnCache(enlace, resultado);
  return resultado;
}

module.exports = { extraerArticulo };
