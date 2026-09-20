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

function agregarFuente(fuente) {
  const fuentes = obtenerFuentes();
  fuentes.push(fuente);
  guardar(fuentes);
  return fuentes;
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

module.exports = { obtenerFuentes, agregarFuente, eliminarFuente, alternarFuenteActiva };
