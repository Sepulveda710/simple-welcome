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

// --- Compartir listas de fuentes (exportar/importar) ---

// Solo estos 4 campos son "compartibles" — a propósito NO incluye
// "activa": quien reciba el archivo decide si la quiere encendida o
// apagada, no hereda el estado que tenía en la PC de quien la compartió.
function exportarFuentes() {
  return obtenerFuentes().map(({ nombre, url, categoria, color }) => ({ nombre, url, categoria, color }));
}

// Lee el contenido crudo de un archivo de fuentes (ya como texto, no como
// ruta — quien llama decide si viene de un diálogo o de un doble clic) y
// separa lo reconocible en "nuevas" (por agregar) vs. ya existentes por
// URL — la interfaz solo deja elegir entre las nuevas. Nunca lanza: un
// archivo mal formado o vacío es un resultado { ok:false }, no una
// excepción cruzando IPC.
function prepararImportacion(contenidoCrudo) {
  let lista;
  try {
    lista = JSON.parse(contenidoCrudo);
  } catch {
    return { ok: false, error: 'El archivo no es una lista de fuentes válida.' };
  }
  if (!Array.isArray(lista)) return { ok: false, error: 'El archivo no es una lista de fuentes válida.' };

  const reconocidas = lista.filter((f) => f && typeof f.nombre === 'string' && typeof f.url === 'string');
  if (reconocidas.length === 0) return { ok: false, error: 'El archivo no tiene fuentes reconocibles.' };

  // Por si el propio archivo trae la misma URL dos veces — se queda con
  // la primera aparición antes de comparar contra lo que ya tienes.
  const vistas = new Set();
  const sinRepetirEnElArchivo = reconocidas.filter((f) => {
    const url = String(f.url).trim();
    if (vistas.has(url)) return false;
    vistas.add(url);
    return true;
  });

  const existentes = new Set(obtenerFuentes().map((f) => f.url));
  const candidatas = sinRepetirEnElArchivo.map((f) => normalizarFuente({ categoria: 'General', ...f }));
  const nuevas = candidatas.filter((f) => !existentes.has(f.url));

  return { ok: true, nuevas, repetidas: candidatas.length - nuevas.length };
}

// Agrega las fuentes que el usuario eligió en el diálogo de importación
// (ya vienen filtradas de duplicadas por prepararImportacion). Valida
// cada una por su cuenta y sigue con las demás si una falla, en vez de
// perder toda la selección por un solo dato mal escrito.
function importarFuentes(seleccionadas) {
  const fuentes = obtenerFuentes();
  const urlsEnEstaTanda = new Set(fuentes.map((f) => f.url));
  let agregadas = 0;
  const errores = [];

  seleccionadas.forEach((candidata) => {
    if (urlsEnEstaTanda.has(candidata.url)) return; // ya la agregó una candidata anterior de esta misma tanda
    const error = validarFuente(candidata);
    if (error) {
      errores.push(`${candidata.nombre}: ${error}`);
      return;
    }
    fuentes.push(normalizarFuente({ activa: true, ...candidata }));
    urlsEnEstaTanda.add(candidata.url);
    agregadas += 1;
  });

  guardar(fuentes);
  return { ok: true, agregadas, errores, fuentes };
}

module.exports = {
  obtenerFuentes,
  agregarFuente,
  editarFuente,
  eliminarFuente,
  alternarFuenteActiva,
  exportarFuentes,
  prepararImportacion,
  importarFuentes
};
