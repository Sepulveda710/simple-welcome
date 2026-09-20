// Módulo: gestion-fuentes
// Responsabilidad única: leer y modificar la lista de fuentes de noticias.
// lector-rss.js usa este mismo módulo para leer las fuentes — así no hay
// dos lugares distintos tocando ese archivo (mismo patrón que configuracion.js).

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Igual que en configuracion.js: antes vivía en config/fuentes.json junto
// al código, así que un instalador que actualiza la app lo borraba en
// cada actualización. migrarSiHaceFalta() copia (no mueve) lo que hubiera
// ahí la primera vez que corre esta versión.
const RUTA_VIEJA = path.join(__dirname, '..', 'config', 'fuentes.json');

function rutaArchivo() {
  return path.join(app.getPath('userData'), 'fuentes.json');
}

function migrarSiHaceFalta() {
  const nueva = rutaArchivo();
  if (fs.existsSync(nueva)) return;
  try {
    fs.writeFileSync(nueva, fs.readFileSync(RUTA_VIEJA, 'utf-8'));
  } catch {
    // No había fuentes viejas que migrar — instalación nueva, arranca vacía.
  }
}

function obtenerFuentes() {
  migrarSiHaceFalta();
  try {
    const fuentes = JSON.parse(fs.readFileSync(rutaArchivo(), 'utf-8'));
    // "activa" es nueva — las fuentes guardadas antes de este cambio no la
    // tienen en el archivo todavía, así que se asume true (el
    // comportamiento de siempre) hasta que alguien la apague a propósito.
    return fuentes.map((fuente) => ({ activa: true, ...fuente }));
  } catch {
    return [];
  }
}

function guardar(fuentes) {
  fs.writeFileSync(rutaArchivo(), JSON.stringify(fuentes, null, 2));
}

// Devuelve un mensaje de error en español (para mostrar tal cual en la
// interfaz) o null si la fuente es válida. "urlOriginal" es la URL que
// tenía la fuente antes de editarla — para no contar como repetida a la
// propia fuente que se está editando.
function validarFuente(fuente, urlOriginal = null) {
  if (!String(fuente.nombre || '').trim()) return 'Escribe un nombre.';

  let esWeb = false;
  try {
    esWeb = ['http:', 'https:'].includes(new URL(String(fuente.url || '').trim()).protocol);
  } catch {
    // URL mal escrita — se queda en false
  }
  if (!esWeb) return 'La URL del RSS debe empezar con http:// o https://';

  const url = String(fuente.url).trim();
  const repetida = obtenerFuentes().some((f) => f.url === url && f.url !== urlOriginal);
  if (repetida) return 'Ya tienes una fuente con esa URL.';

  return null;
}

// Limpia espacios y aplica el valor por defecto de la categoría.
function normalizarFuente(fuente) {
  return {
    ...fuente,
    nombre: String(fuente.nombre).trim(),
    url: String(fuente.url).trim(),
    categoria: String(fuente.categoria || '').trim() || 'General'
  };
}

// Las tres devuelven { ok: true, fuentes } o { ok: false, error } — un
// "throw" cruzando IPC llegaría a la interfaz envuelto en un mensaje
// técnico ("Error invoking remote method…") en vez del texto claro.
function agregarFuente(fuente) {
  const error = validarFuente(fuente);
  if (error) return { ok: false, error };

  const fuentes = obtenerFuentes();
  fuentes.push(normalizarFuente(fuente));
  guardar(fuentes);
  return { ok: true, fuentes };
}

// Cambia nombre/URL/categoría/color de una fuente ya guardada. Se
// identifica por su URL ORIGINAL (por eso la URL misma se puede corregir).
// Conserva el resto de sus campos, como "activa".
function editarFuente(urlOriginal, cambios) {
  const fuentes = obtenerFuentes();
  const indice = fuentes.findIndex((f) => f.url === urlOriginal);
  if (indice === -1) return { ok: false, error: 'No se encontró la fuente (¿se borró?).' };

  const propuesta = { ...fuentes[indice], ...cambios };
  const error = validarFuente(propuesta, urlOriginal);
  if (error) return { ok: false, error };

  fuentes[indice] = normalizarFuente(propuesta);
  guardar(fuentes);
  return { ok: true, fuentes };
}

// Se identifica por la URL del feed porque es lo único que de verdad es
// único entre fuentes (dos medios distintos podrían compartir nombre).
function eliminarFuente(url) {
  const fuentes = obtenerFuentes().filter((f) => f.url !== url);
  guardar(fuentes);
  return fuentes;
}

// Apaga/prende una fuente sin borrarla — a diferencia de eliminarFuente,
// esto conserva su color/categoría/URL para cuando se vuelva a prender.
// lector-rss.js es quien de verdad la ignora al pedir noticias.
function alternarFuenteActiva(url) {
  const fuentes = obtenerFuentes();
  const fuente = fuentes.find((f) => f.url === url);
  if (fuente) fuente.activa = !fuente.activa;
  guardar(fuentes);
  return fuentes;
}

module.exports = { obtenerFuentes, agregarFuente, editarFuente, eliminarFuente, alternarFuenteActiva };
