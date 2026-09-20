// Módulo: estado-lectura
// Responsabilidad única: recordar qué artículos ya se leyeron.
// Se guarda en la carpeta de datos de la app (no en config/), porque esto
// no es algo que el usuario edite a mano — es estado que la app misma gestiona.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function rutaArchivo() {
  return path.join(app.getPath('userData'), 'estado-lectura.json');
}

function cargar() {
  try {
    const contenido = fs.readFileSync(rutaArchivo(), 'utf-8');
    return new Set(JSON.parse(contenido));
  } catch {
    return new Set(); // primera vez que corre la app, o archivo corrupto: empieza vacío
  }
}

function guardar(conjunto) {
  fs.writeFileSync(rutaArchivo(), JSON.stringify([...conjunto]));
}

function obtenerLeidos() {
  return [...cargar()];
}

function marcarComoLeido(enlace) {
  const leidos = cargar();
  leidos.add(enlace);
  guardar(leidos);
  return [...leidos];
}

function alternarLeido(enlace) {
  const leidos = cargar();
  if (leidos.has(enlace)) {
    leidos.delete(enlace);
  } else {
    leidos.add(enlace);
  }
  guardar(leidos);
  return [...leidos];
}

function restablecerLeidos() {
  guardar(new Set());
  return [];
}

module.exports = { obtenerLeidos, marcarComoLeido, alternarLeido, restablecerLeidos };
