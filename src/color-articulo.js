// Módulo: color-articulo
// Responsabilidad única: dada la URL de la miniatura de un artículo,
// calcular un color representativo ("dominante") para usarlo como tinte
// de fondo en el modo lectura.
//
// Corre en el proceso principal a propósito: leer los píxeles de una
// imagen externa desde un <canvas> en el renderer choca con CORS (la
// mayoría de los CDNs de noticias no mandan encabezados
// Access-Control-Allow-Origin, así que el canvas queda "tainted" y
// getImageData tira SecurityError). nativeImage no tiene esa
// restricción — es solo una descarga + decodificado, igual que
// modo-lectura.js hace con el HTML del artículo.

const { nativeImage } = require('electron');

const TIEMPO_LIMITE_MS = 8000;
const LADO_MUESTREO = 24; // reduce la imagen a 24x24 antes de analizar píxeles — de sobra para un color de fondo

const cacheColores = new Map();

async function descargarImagen(url) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
  try {
    const respuesta = await fetch(url, { signal: controlador.signal });
    if (!respuesta.ok) throw new Error(`No se pudo descargar la imagen (${respuesta.status})`);
    return Buffer.from(await respuesta.arrayBuffer());
  } finally {
    clearTimeout(temporizador);
  }
}

function rgbAHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    default: h = (r - g) / d + 4;
  }
  return [h / 6, s, l];
}

function hslARgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  ];
}

function aHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// Promedia el tono (hue) solo de los píxeles con algo de saturación y ni
// muy oscuros ni muy claros — así ignora cielo, asfalto y fondos neutros,
// y se queda con lo que de verdad "destaca" en la foto (el auto amarillo,
// no el cielo azul detrás). La saturación y luz finales quedan fijas en
// un rango pensado para tinte de fondo (ni apagado, ni tan intenso que
// pelee con el texto encima). Si la foto es casi toda gris, no hay
// píxeles que pasen el filtro y cae sola al promedio simple — sale un
// tinte neutro, sin necesitar un caso especial para eso.
function calcularColorDominante(buffer) {
  const imagen = nativeImage.createFromBuffer(buffer);
  if (imagen.isEmpty()) throw new Error('No se pudo decodificar la imagen');

  const miniatura = imagen.resize({ width: LADO_MUESTREO, height: LADO_MUESTREO, quality: 'good' });
  const bitmap = miniatura.toBitmap(); // BGRA por píxel, en ese orden en todas las plataformas

  let senoH = 0, cosenoH = 0, sumaS = 0, pixelesVividos = 0;
  let sumaR = 0, sumaG = 0, sumaB = 0, totalPixeles = 0;

  for (let i = 0; i + 3 < bitmap.length; i += 4) {
    const b = bitmap[i], g = bitmap[i + 1], r = bitmap[i + 2];
    totalPixeles++;
    sumaR += r; sumaG += g; sumaB += b;

    const [h, s, l] = rgbAHsl(r, g, b);
    if (s > 0.15 && l > 0.12 && l < 0.92) {
      senoH += Math.sin(h * 2 * Math.PI);
      cosenoH += Math.cos(h * 2 * Math.PI);
      sumaS += s;
      pixelesVividos++;
    }
  }

  if (totalPixeles === 0) throw new Error('Imagen sin píxeles');

  if (pixelesVividos > totalPixeles * 0.05) {
    const hPromedio = (Math.atan2(senoH / pixelesVividos, cosenoH / pixelesVividos) / (2 * Math.PI) + 1) % 1;
    const sPromedio = Math.min(sumaS / pixelesVividos, 0.6);
    return aHex(hslARgb(hPromedio, sPromedio, 0.55));
  }

  return aHex([sumaR / totalPixeles, sumaG / totalPixeles, sumaB / totalPixeles]);
}

async function obtenerColorDominante(url) {
  if (!url) return null;
  if (cacheColores.has(url)) return cacheColores.get(url);

  try {
    const buffer = await descargarImagen(url);
    const color = calcularColorDominante(buffer);
    cacheColores.set(url, color);
    return color;
  } catch {
    // Si la imagen falla o no se puede analizar, simplemente no hay tinte
    // — el modo lectura se ve como siempre (Mica neutral). No es un
    // estado que valga la pena reportar como error al usuario.
    return null;
  }
}

module.exports = { obtenerColorDominante };
