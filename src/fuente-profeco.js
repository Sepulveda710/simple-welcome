// Módulo: fuente-profeco
// Responsabilidad única: leer la Revista del Consumidor (Profeco) y devolver
// sus artículos con el mismo contrato que lector-rss.js.
//
// Esta revista NO tiene RSS: su sitio es una aplicación de JavaScript que
// lee una API pública de la Biblioteca del Consumidor (sin llave), y cada
// artículo es un PDF de la edición del mes. Por eso no cabe en el lector de
// RSS normal y tiene su propio módulo. lector-rss.js lo elige solo cuando
// la URL de la fuente es de Profeco (ver esFuenteProfeco), así que se agrega
// desde Configuración > Fuentes como cualquier otra: con la URL de la revista.
//
// La API no está documentada y puede cambiar sin aviso: si falla, esto
// devuelve [] (como cualquier feed caído) y las demás fuentes siguen.

const BASE = 'https://bibliotecadelconsumidor.profeco.gob.mx';
const TIEMPO_LIMITE_MS = 8000;

// Reconoce las direcciones que puede pegar Abel: el sitio de la revista o
// la propia API. Se compara el dominio exacto (no un "contiene"), para que
// una URL cualquiera con "profeco" en el texto no se trate como revista.
function esFuenteProfeco(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'revistadelconsumidor.profeco.gob.mx' || hostname === 'bibliotecadelconsumidor.profeco.gob.mx';
  } catch {
    return false;
  }
}

// "2026-08-31 17:43:35" (hora de México, sin zona) → ISO con zona. México
// ya no usa horario de verano, así que -06:00 es fijo.
function aFechaIso(texto) {
  const fecha = new Date(`${String(texto).replace(' ', 'T')}-06:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

// Solo se muestra la edición más reciente: salen ~18 artículos juntos una
// vez al mes, y mezclar números viejos llenaría la lista de repetidos.
async function leerRevistaProfeco(fuente, limite) {
  try {
    const respuesta = await fetch(`${BASE}/api/revista`, { signal: AbortSignal.timeout(TIEMPO_LIMITE_MS) });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const json = await respuesta.json();

    const ediciones = Array.isArray(json.data) ? json.data : [];
    const reciente = [...ediciones].sort((a, b) => (b.anio - a.anio) || (b.id_mes - a.id_mes))[0];
    if (!reciente || !Array.isArray(reciente.sumario)) return [];

    const portada = reciente.portada ? `${BASE}${reciente.portada}` : null;
    return reciente.sumario
      .filter((seccion) => seccion.tema && seccion.seccion_pdf)
      .slice(0, limite)
      .map((seccion) => ({
        titulo: seccion.tema,
        fuente: fuente.nombre,
        categoria: fuente.categoria,
        fecha: aFechaIso(seccion.fecha_actualizacion),
        enlace: `${BASE}${seccion.seccion_pdf}`,
        imagen: portada,
        colorFuente: fuente.color || null,
        detalle: seccion.seccion || null, // ej. "Guía de consumo" — se muestra junto al nombre de la fuente
        externo: true // es un PDF: no pasa por el modo lectura, se abre fuera de la app
      }));
  } catch (error) {
    console.warn(`No se pudo leer "${fuente.nombre}": ${error.message}`);
    return [];
  }
}

module.exports = { esFuenteProfeco, leerRevistaProfeco };
