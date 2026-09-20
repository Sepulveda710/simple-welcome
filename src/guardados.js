// Módulo: guardados
// Responsabilidad única: guardar artículos "para después" y depurar solos
// los que ya llevan más de 7 días — esa depuración solo puede revisarse
// cuando la app está abierta (no hay forma de que corra con la app cerrada).
//
// Contrato de cada artículo guardado: { enlace, titulo, fuente, imagen,
// categoria, fechaGuardado }

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

function rutaArchivo() {
  return path.join(app.getPath('userData'), 'guardados.json');
}

function cargar() {
  try {
    return JSON.parse(fs.readFileSync(rutaArchivo(), 'utf-8'));
  } catch {
    return [];
  }
}

function guardarEnDisco(lista) {
  fs.writeFileSync(rutaArchivo(), JSON.stringify(lista));
}

function depurar(lista) {
  const ahora = Date.now();
  return lista.filter((item) => ahora - item.fechaGuardado < SIETE_DIAS_MS);
}

function obtenerGuardados() {
  const original = cargar();
  const lista = depurar(original);
  // Solo reescribe el archivo si la depuración de verdad quitó algo — esto
  // se llama cada vez que se abre el panel de Guardados, así que sin este
  // chequeo se reescribiría el archivo entero en disco en cada apertura
  // aunque no hubiera nada que depurar.
  if (lista.length !== original.length) guardarEnDisco(lista);
  return lista;
}

function guardarArticulo(articulo) {
  const lista = depurar(cargar());
  if (!lista.some((item) => item.enlace === articulo.enlace)) {
    lista.push({ ...articulo, fechaGuardado: Date.now() });
  }
  guardarEnDisco(lista);
  return lista;
}

function eliminarGuardado(enlace) {
  const lista = cargar().filter((item) => item.enlace !== enlace);
  guardarEnDisco(lista);
  return lista;
}

module.exports = { obtenerGuardados, guardarArticulo, eliminarGuardado };
