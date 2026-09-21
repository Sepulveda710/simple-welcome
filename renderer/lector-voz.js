// Lectura en voz alta del artículo abierto en modo lectura.
//
// Dos capas a propósito:
//   1. MotorVozWindows: solo sabe decir UN texto con una voz. Hoy usa las
//      voces de Windows (speechSynthesis, gratis y sin internet). Si algún
//      día se prueba Piper u otra voz más natural, se escribe otro motor con
//      la misma forma (voces / hablar / pausar / reanudar / detener) y el
//      resto no se toca.
//   2. LectorVoz: decide qué párrafo toca, avanza al siguiente, pausa y
//      salta. No toca el DOM: avisa de cada cambio con un callback y
//      renderer.js se encarga de resaltar el párrafo y pintar el reproductor.

const MotorVozWindows = {
  // Se usa la misma referencia hasta que el motor termina el enunciado:
  // Chromium puede recolectar el objeto a media frase si nadie lo guarda,
  // y entonces nunca avisa que terminó (la lectura se quedaría trabada).
  _enunciadoActual: null,

  voces() {
    return window.speechSynthesis.getVoices();
  },

  // es-MX primero, luego el resto del español. Vacío si el sistema no
  // tiene ninguna voz en español instalada.
  vocesEnEspanol() {
    return this.voces()
      .filter((voz) => voz.lang.toLowerCase().startsWith('es'))
      .sort((a, b) => Number(b.lang === 'es-MX') - Number(a.lang === 'es-MX'));
  },

  // Lo que en la app se llama "1× (normal)" equivale a 1.5 en la escala del
  // motor de Windows: su 1.0 real suena muy lento para escuchar noticias
  // (decisión de diseño, pedida por Abel tras probarlo). Vive aquí y no en
  // la interfaz porque "normal" depende de cada voz/motor — Piper, por
  // ejemplo, tendrá su propia calibración.
  VELOCIDAD_NORMAL: 1.5,

  hablar(texto, { vozNombre, velocidad, alTerminar, alError }) {
    const enunciado = new SpeechSynthesisUtterance(texto);
    const espanolas = this.vocesEnEspanol();
    // Si la voz elegida ya no existe (otra PC, voz desinstalada), cae a la
    // primera en español en vez de fallar.
    const voz = espanolas.find((v) => v.name === vozNombre) || espanolas[0];
    if (voz) enunciado.voice = voz;
    enunciado.lang = voz ? voz.lang : 'es-MX';
    enunciado.rate = velocidad * this.VELOCIDAD_NORMAL;
    enunciado.onend = alTerminar;
    enunciado.onerror = alError;
    this._enunciadoActual = enunciado;
    window.speechSynthesis.speak(enunciado);
  },

  pausar() { window.speechSynthesis.pause(); },
  reanudar() { window.speechSynthesis.resume(); },
  detener() {
    window.speechSynthesis.cancel();
    this._enunciadoActual = null;
  }
};

// Bloques de texto que se leen, en orden: primero el título, luego los
// párrafos, subtítulos, listas y citas del artículo. Si un bloque contiene
// a otros (una cita con párrafos dentro), se salta el contenedor y se leen
// los de adentro — si no, se leería el mismo texto dos veces.
function bloquesLegibles(tituloEl, contenidoEl) {
  const bloques = [];
  const limpiar = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const tieneLetras = (texto) => /\p{L}/u.test(texto);

  const titulo = limpiar(tituloEl);
  if (tieneLetras(titulo)) bloques.push({ el: null, texto: titulo });

  const selector = 'p, h2, h3, h4, li, blockquote';
  contenidoEl.querySelectorAll(selector).forEach((el) => {
    if (el.querySelector(selector)) return;
    const texto = limpiar(el);
    if (tieneLetras(texto)) bloques.push({ el, texto });
  });
  return bloques;
}

const LectorVoz = (() => {
  const motor = MotorVozWindows;
  const MAX_ERRORES_SEGUIDOS = 3;

  let bloques = [];
  let indice = 0;
  // 'inactivo' (sin reproductor) | 'leyendo' | 'pausado' | 'detenido'
  // (reproductor visible, voz parada y de vuelta al inicio, listo para ▶)
  let estado = 'inactivo';
  // Cada vez que se cancela o se salta, sube este número. Los avisos del
  // motor (onend/onerror) de un enunciado viejo llegan tarde y se ignoran
  // comparando su número — sin esto, cancelar un párrafo dispararía "ya
  // terminó" y la lectura saltaría sola al siguiente.
  let generacion = 0;
  let erroresSeguidos = 0;
  let opciones = { vozNombre: '', velocidad: 1 };
  let alCambiar = () => {};
  let alTerminarArticulo = () => {};

  function avisar() {
    alCambiar({ estado, indice, total: bloques.length, bloque: bloques[indice] || null });
  }

  function hablarActual() {
    const gen = ++generacion;
    avisar();
    motor.hablar(bloques[indice].texto, {
      vozNombre: opciones.vozNombre,
      velocidad: opciones.velocidad,
      alTerminar: () => {
        if (gen !== generacion) return;
        erroresSeguidos = 0;
        avanzar();
      },
      // Un error real (la voz falló): se salta ese bloque para no quedar
      // atascado, pero si fallan varios seguidos se detiene todo.
      alError: () => {
        if (gen !== generacion) return;
        erroresSeguidos += 1;
        if (erroresSeguidos >= MAX_ERRORES_SEGUIDOS) cerrar();
        else avanzar();
      }
    });
  }

  function avanzar() {
    if (indice + 1 < bloques.length) {
      indice += 1;
      hablarActual();
    } else {
      cerrar();
      alTerminarArticulo();
    }
  }

  // Para la voz y vuelve al inicio, pero deja el reproductor visible.
  function parar() {
    if (estado === 'inactivo') return;
    generacion += 1;
    motor.detener();
    estado = 'detenido';
    indice = 0;
    erroresSeguidos = 0;
    avisar();
  }

  // Para la voz y quita el reproductor (olvida el artículo).
  function cerrar() {
    generacion += 1;
    motor.detener();
    estado = 'inactivo';
    bloques = [];
    indice = 0;
    erroresSeguidos = 0;
    avisar();
  }

  // Corta lo que suena y vuelve a hablar el bloque actual (o el nuevo
  // índice) — lo usan saltar y cambiar de velocidad/voz a media lectura.
  function reiniciarEn(nuevoIndice) {
    generacion += 1;
    motor.detener();
    indice = nuevoIndice;
    estado = 'leyendo';
    hablarActual();
  }

  return {
    iniciar(nuevosBloques) {
      cerrar();
      if (!nuevosBloques.length) return;
      bloques = nuevosBloques;
      estado = 'leyendo';
      hablarActual();
    },

    alternarPausa() {
      if (estado === 'leyendo') {
        motor.pausar();
        estado = 'pausado';
        avisar();
      } else if (estado === 'pausado') {
        motor.reanudar();
        estado = 'leyendo';
        avisar();
      } else if (estado === 'detenido') {
        reiniciarEn(0); // ▶ tras Detener: empieza de nuevo desde el título
      }
    },

    // delta: -1 = bloque anterior, +1 = siguiente. Se queda en los extremos.
    saltar(delta) {
      if (estado === 'inactivo') return;
      const destino = Math.min(Math.max(indice + delta, 0), bloques.length - 1);
      reiniciarEn(destino);
    },

    parar,
    cerrar,

    fijarOpciones(nuevas) {
      const cambio = nuevas.vozNombre !== opciones.vozNombre || nuevas.velocidad !== opciones.velocidad;
      opciones = { ...opciones, ...nuevas };
      // Si estaba leyendo, el cambio se nota al instante en vez de esperar
      // al siguiente párrafo. Detenido no habla, así que no se reinicia.
      if (cambio && (estado === 'leyendo' || estado === 'pausado')) reiniciarEn(indice);
    },

    alCambiar(funcion) { alCambiar = funcion; },
    alTerminarArticulo(funcion) { alTerminarArticulo = funcion; },
    get estado() { return estado; }
  };
})();
