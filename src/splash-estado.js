// Módulo: splash-estado
// Responsabilidad única: recordar si la animación de bienvenida (Chía +
// "Bienvenido, {nombre}") ya se mostró hoy, para no repetirla en cada
// apertura de la app el mismo día — Abel la quiere una vez por día, no
// una vez por apertura.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function rutaArchivo() {
  return path.join(app.getPath('userData'), 'splash-estado.json');
}

function hoyComoTexto() {
  const ahora = new Date();
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

// true la primera vez que se llama en un día calendario dado; false en
// cualquier llamada siguiente el mismo día. Marca el día como visto de
// una vez — no hace falta una función aparte para eso, nada llama esto
// sin la intención de mostrar el splash si la respuesta es true.
function debeMostrarSplashHoy() {
  const hoy = hoyComoTexto();
  let ultimoDia = null;
  try {
    ultimoDia = JSON.parse(fs.readFileSync(rutaArchivo(), 'utf-8')).ultimoDia;
  } catch {
    // Sin archivo todavía (primera vez que se abre la app) — sí se muestra.
  }

  if (ultimoDia === hoy) return false;

  fs.writeFileSync(rutaArchivo(), JSON.stringify({ ultimoDia: hoy }));
  return true;
}

module.exports = { debeMostrarSplashHoy };
