// Módulo: lector-rss
// Responsabilidad única: leer config/fuentes.json y devolver artículos con una forma FIJA.
// Contrato de salida (esto es lo importante para que nada se rompa):
//   { titulo, fuente, categoria, fecha, enlace, imagen, colorFuente }
//   "imagen" y "colorFuente" pueden ser null si esa fuente no los trae/define.
//   Campos opcionales, solo de fuentes que no son RSS normal (ver fuente-profeco.js):
//   "detalle" (texto extra junto a la fuente) y "externo: true" (el enlace
//   es un PDF u otro archivo que se abre fuera de la app, no en modo lectura).
//
// Si agregas o quitas una fuente en config/fuentes.json, este módulo no necesita cambios.

const Parser = require('rss-parser');
const { obtenerFuentes } = require('./gestion-fuentes');
const { esFuenteProfeco, leerRevistaProfeco } = require('./fuente-profeco');

// Tiempo límite: si un feed no responde en 8 segundos, se da por fallido
// y se sigue con los demás — sin esto, un solo sitio lento podía dejar
// la lista completa de noticias "cargando" indefinidamente.
//
// customFields: RSS-parser solo trae de fábrica los campos estándar
// (title, link, etc). Las imágenes casi siempre vienen en etiquetas
// adicionales de RSS (media:thumbnail, media:content) que hay que pedir
// explícitamente para que las incluya en el resultado.
const parser = new Parser({
  timeout: 8000,
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail']
    ]
  }
});

// Busca una imagen para el artículo probando, en orden, los lugares más
// comunes donde los feeds la esconden. Si no encuentra nada, devuelve
// null — y el resto de la app ya sabe mostrar la tarjeta sin imagen.
function extraerImagen(item) {
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
    return item.mediaThumbnail.$.url;
  }

  if (item.mediaContent) {
    const lista = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
    const conUrl = lista.find((m) => m.$ && m.$.url);
    if (conUrl) return conUrl.$.url;
  }

  // Último recurso: buscar la primera <img> dentro del HTML del contenido.
  const html = item['content:encoded'] || item.content || '';
  const coincidencia = /<img[^>]+src="([^">]+)"/i.exec(html);
  if (coincidencia) return coincidencia[1];

  return null;
}

// Normaliza un item de RSS (que puede venir en formatos distintos según el medio)
// a nuestro contrato fijo. Esto es lo que hace que el resto de la app no le
// importe de qué fuente vino cada noticia.
function normalizarArticulo(item, fuente) {
  return {
    titulo: item.title || '(sin título)',
    fuente: fuente.nombre,
    categoria: fuente.categoria,
    fecha: item.isoDate || item.pubDate || null,
    enlace: item.link,
    imagen: extraerImagen(item),
    colorFuente: fuente.color || null
  };
}

// Lee UNA fuente. Si falla, no lanza el error hacia arriba — lo captura aquí
// mismo y devuelve una lista vacía, para que las demás fuentes no se vean afectadas.
// Muchos feeds (todo WordPress, por ejemplo El CEO) entregan solo sus
// últimas 10 notas por página aunque el sitio tenga más — con medios que
// publican seguido eso son apenas unas horas. WordPress acepta "?paged=2",
// "?paged=3"… para pedir las siguientes; los feeds que no lo soportan
// simplemente ignoran el parámetro y devuelven la misma página, lo cual
// se detecta porque no aporta enlaces nuevos y ahí se deja de pedir.
const MINIMO_PARA_PEDIR_MAS_PAGINAS = 10; // un feed con menos de esto probablemente ya entregó todo lo que tiene
const MAX_PAGINAS_EXTRA = 2;

function urlDePagina(urlFeed, pagina) {
  const url = new URL(urlFeed);
  url.searchParams.set('paged', String(pagina));
  return url.toString();
}

async function leerPaginasAdicionales(fuente, itemsIniciales, limite) {
  const vistos = new Set(itemsIniciales.map((item) => item.link));
  const items = [...itemsIniciales];

  for (let pagina = 2; pagina < 2 + MAX_PAGINAS_EXTRA && items.length < limite; pagina += 1) {
    try {
      const feed = await parser.parseURL(urlDePagina(fuente.url, pagina));
      const nuevos = feed.items.filter((item) => item.link && !vistos.has(item.link));
      if (nuevos.length === 0) break;
      nuevos.forEach((item) => vistos.add(item.link));
      items.push(...nuevos);
    } catch {
      break; // la primera página ya está a salvo; no vale la pena perderla por esta
    }
  }

  return items;
}

async function leerFuente(fuente, limite) {
  if (esFuenteProfeco(fuente.url)) return leerRevistaProfeco(fuente, limite);

  try {
    const feed = await parser.parseURL(fuente.url);
    let items = feed.items;
    if (items.length >= MINIMO_PARA_PEDIR_MAS_PAGINAS && items.length < limite) {
      items = await leerPaginasAdicionales(fuente, items, limite);
    }
    return items.slice(0, limite).map((item) => normalizarArticulo(item, fuente));
  } catch (error) {
    console.warn(`No se pudo leer "${fuente.nombre}": ${error.message}`);
    return [];
  }
}

// El límite subió de 5 a 20: es para tener un fondo más grande de
// artículos ya descargados, y así el botón "Cargar más" de la interfaz
// pueda revelar más sin volver a tocar la red cada vez. Los feeds que
// entregan solo 10 por página se completan pidiendo la siguiente (ver
// leerPaginasAdicionales arriba).
async function obtenerNoticias(limitePorFuente = 20) {
  const fuentes = obtenerFuentes().filter((fuente) => fuente.activa !== false);

  // Promise.allSettled en vez de Promise.all: si una fuente tarda o falla,
  // las demás igual se resuelven. Nada detiene a nada.
  const resultados = await Promise.allSettled(
    fuentes.map((fuente) => leerFuente(fuente, limitePorFuente))
  );

  const articulos = resultados
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // Más recientes primero
  articulos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return articulos;
}

module.exports = { obtenerNoticias };
