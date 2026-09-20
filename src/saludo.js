// Módulo: saludo
// Responsabilidad única: construir el texto de bienvenida.
// No importa nada de rss-reader ni de la interfaz — si algo cambia ahí, esto sigue funcionando igual.

const { obtenerConfiguracion } = require('./configuracion');

function obtenerSaludoPorHora(hora) {
  if (hora < 5) return 'Hola'; // de 12:00 a.m. a 4:59 a.m. — "Buenos días" no aplica todavía
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function generarSaludo() {
  const { nombre, formato24h } = obtenerConfiguracion();
  const ahora = new Date();

  const fecha = ahora.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const horaTexto = ahora.toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !formato24h
  });

  const saludoPorHora = obtenerSaludoPorHora(ahora.getHours());

  return {
    nombre,
    fecha,
    horaTexto,
    mensaje: `${saludoPorHora}, ${nombre}. Bienvenido.`
  };
}

module.exports = { generarSaludo };
