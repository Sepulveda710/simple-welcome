// Módulo: ventana-estado
// Responsabilidad única: recordar el tamaño y posición de la ventana.
// No sabe nada de noticias, saludo, ni modo lectura.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const TAMANO_POR_DEFECTO = { width: 480, height: 720 };

function rutaArchivo() {
  return path.join(app.getPath('userData'), 'ventana-estado.json');
}

function obtenerEstadoVentana() {
  try {
    const contenido = fs.readFileSync(rutaArchivo(), 'utf-8');
    return { ...TAMANO_POR_DEFECTO, ...JSON.parse(contenido) };
  } catch {
    return TAMANO_POR_DEFECTO;
  }
}

function guardarEstadoVentana(bounds) {
  fs.writeFileSync(rutaArchivo(), JSON.stringify(bounds));
}

module.exports = { obtenerEstadoVentana, guardarEstadoVentana };
