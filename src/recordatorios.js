// Módulo: recordatorios
// Responsabilidad única: guardar y leer recordatorios locales por fecha.
//
// Estructura guardada: { "2026-09-09": [ { id, texto, color } ], ... }
//
// Nota para el futuro: si más adelante se conecta un calendario real
// (Google/Outlook), este módulo se reemplaza o se combina con uno nuevo
// que traiga eventos de esa cuenta — pero la interfaz (renderer.js) solo
// necesita una lista de { texto, color } por fecha, así que no debería
// hacer falta rehacer la parte visual del calendario, solo el origen de
// los datos.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function rutaArchivo() {
  return path.join(app.getPath('userData'), 'recordatorios.json');
}

function cargar() {
  try {
    return JSON.parse(fs.readFileSync(rutaArchivo(), 'utf-8'));
  } catch {
    return {};
  }
}

function guardar(datos) {
  fs.writeFileSync(rutaArchivo(), JSON.stringify(datos));
}

function obtenerRecordatorios() {
  return cargar();
}

function agregarRecordatorio(fecha, texto, color, hora = null) {
  const datos = cargar();
  if (!datos[fecha]) datos[fecha] = [];

  datos[fecha].push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    texto,
    color,
    hora
  });

  guardar(datos);
  return datos;
}

function eliminarRecordatorio(fecha, id) {
  const datos = cargar();
  if (datos[fecha]) {
    datos[fecha] = datos[fecha].filter((r) => r.id !== id);
    if (datos[fecha].length === 0) delete datos[fecha];
  }
  guardar(datos);
  return datos;
}

module.exports = { obtenerRecordatorios, agregarRecordatorio, eliminarRecordatorio };
