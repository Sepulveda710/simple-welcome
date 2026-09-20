// Módulo: cita
// Responsabilidad única: traer la cita del día (la que "dice" Chía, ver
// #tarjeta-chia en index.html) desde FraseDelDia.
//
// Por qué una API y no una lista escrita a mano: atribuirle una frase a
// una persona real sin haberla verificado es un riesgo real de
// desinformación — mejor usar un servicio que ya cura y verifica sus citas.
//
// Nota: se cambió de ZenQuotes a FraseDelDia porque ZenQuotes solo da
// citas en inglés. FraseDelDia es un proyecto pequeño de un solo
// mantenedor (sin SLA ni garantía de que siga en pie) — si algún día deja
// de responder, esta función ya está pensada para devolver null sin tumbar
// nada más: el widget de Chía simplemente no muestra cita ese día.
//
// Contrato de salida: { texto, autor } — o null si el servicio falla.

const TIEMPO_LIMITE_MS = 8000;

async function obtenerCitaDelDia() {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  try {
    const respuesta = await fetch('https://frasedeldia.azurewebsites.net/api/phrase', { signal: controlador.signal });
    if (!respuesta.ok) throw new Error(`FraseDelDia respondió ${respuesta.status}`);

    const datos = await respuesta.json();
    if (!datos || !datos.phrase) return null;

    return { texto: datos.phrase, autor: (datos.author || '').trim() };
  } catch (error) {
    console.warn(`No se pudo obtener la cita del día: ${error.message}`);
    return null; // sin conexión o el servicio falló — el widget simplemente no aparece
  } finally {
    clearTimeout(temporizador);
  }
}

module.exports = { obtenerCitaDelDia };
