// Módulo: clima
// Responsabilidad única: traer la temperatura y el ícono actuales para la
// ubicación guardada en config/usuario.json. Usa Open-Meteo porque es
// gratuito y no pide llave de API.
//
// Contrato de salida: { temperatura, icono, ubicacion } — o null si no
// hay ubicación configurada todavía.

const { obtenerConfiguracion } = require('./configuracion');

const TIEMPO_LIMITE_MS = 8000;

// Traduce el código de clima de Open-Meteo (estándar WMO) a un ícono
// simple. Es una traducción aproximada a propósito — no hace falta un
// mapeo exhaustivo de los ~30 códigos posibles para un widget pequeño.
function iconoParaCodigo(codigo, esDeDia) {
  if (codigo === 0) return esDeDia ? '☀️' : '🌙';
  if ([1, 2, 3].includes(codigo)) return esDeDia ? '⛅' : '☁️';
  if ([45, 48].includes(codigo)) return '🌫️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return '❄️';
  if ([95, 96, 99].includes(codigo)) return '⛈️';
  return '☁️';
}

async function obtenerClima() {
  const { latitud, longitud, ciudad, unidadTemperatura } = obtenerConfiguracion();
  if (latitud == null || longitud == null) return null;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  try {
    const esFahrenheit = unidadTemperatura === 'fahrenheit';
    const parametroUnidad = esFahrenheit ? '&temperature_unit=fahrenheit' : '';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current=temperature_2m,weather_code,is_day&timezone=auto${parametroUnidad}`;
    const respuesta = await fetch(url, { signal: controlador.signal });
    if (!respuesta.ok) throw new Error(`Open-Meteo respondió ${respuesta.status}`);

    const datos = await respuesta.json();

    return {
      temperatura: Math.round(datos.current.temperature_2m),
      unidad: esFahrenheit ? 'F' : 'C',
      icono: iconoParaCodigo(datos.current.weather_code, datos.current.is_day === 1),
      ubicacion: ciudad
    };
  } finally {
    clearTimeout(temporizador);
  }
}

async function buscarCiudad(nombre) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nombre)}&count=1&language=es`;
    const respuesta = await fetch(url, { signal: controlador.signal });
    if (!respuesta.ok) throw new Error(`Geocodificación respondió ${respuesta.status}`);

    const datos = await respuesta.json();
    const resultado = datos.results && datos.results[0];
    if (!resultado) return null;

    const partes = [resultado.name, resultado.admin1, resultado.country].filter(Boolean);
    return { ciudad: partes.join(', '), latitud: resultado.latitude, longitud: resultado.longitude };
  } finally {
    clearTimeout(temporizador);
  }
}

module.exports = { obtenerClima, buscarCiudad };
