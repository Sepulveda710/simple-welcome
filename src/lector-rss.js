// Módulo: lector-rss
// Responsabilidad única: leer config/fuentes.json y devolver artículos con una forma FIJA.
// Contrato de salida (esto es lo importante para que nada se rompa):
//   { titulo, fuente, categoria, fecha, enlace, imagen, colorFuente }
//   "imagen" y "colorFuente" pueden ser null si esa fuente no los trae/define.
//
// Si agregas o quitas una fuente en config/fuentes.json, este módulo no necesita cambios.

const Parser = require('rss-parser');
const { obtenerFuentes } = require('./gestion-fuentes');

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
async function leerFuente(fuente, limite) {
  try {
    const feed = await parser.parseURL(fuente.url);
    return feed.items.slice(0, limite).map((item) => normalizarArticulo(item, fuente));
  } catch (error) {
    console.warn(`No se pudo leer "${fuente.nombre}": ${error.message}`);
    return [];
  }
}

// El límite subió de 5 a 20: no significa que RSS tenga "más páginas" de
// artículos viejos (los feeds solo dan lo más reciente) — es simplemente
// para tener un fondo más grande de artículos ya descargados, y así el
// botón "Cargar más" de la interfaz pueda revelar más sin volver a tocar
// la red cada vez.
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
