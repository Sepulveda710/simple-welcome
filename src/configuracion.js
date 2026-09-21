// Módulo: configuracion
// Responsabilidad única: leer y guardar la configuración del usuario.
// saludo.js y el panel de Configuración de la interfaz usan este mismo
// módulo — así no hay dos lugares distintos leyendo/escribiendo ese archivo.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Antes vivía en config/usuario.json, junto al código de la app — mal
// lugar para algo que el usuario edita: un instalador que actualiza la
// app reemplaza esa carpeta entera, borrando la configuración en cada
// actualización. Ahora vive en la carpeta de datos de Windows, igual que
// estado-lectura.js/guardados.js/etc. migrarSiHaceFalta() copia (no
// mueve) lo que hubiera en la ubicación vieja la primera vez que corre
// esta versión, para no perder lo que Abel ya tenía configurado.
const RUTA_VIEJA = path.join(__dirname, '..', 'config', 'usuario.json');

const VALORES_POR_DEFECTO = {
  nombre: 'Usuario',
  articulosPorFuente: 5,
  noticiasPorPagina: 20,
  ciudad: '',
  latitud: null,
  longitud: null,
  tema: 'claro', // 'claro' | 'oscuro' — el tema general de la app
  modoCalidoLectura: false, // independiente del tema: solo colorea el panel de lectura (ver renderer.js)
  formato24h: false, // false = 12h (con a. m./p. m.), true = 24h — ver saludo.js
  unidadTemperatura: 'celsius', // 'celsius' | 'fahrenheit' — ver clima.js
  caraChiaPredeterminada: 'relajado', // id de EXPRESIONES_CHIA — la cara "de reposo" (los estados contextuales como "triste" la siguen pisando temporalmente)
  iniciarConWindows: true, // abrir la app sola al iniciar sesión en Windows — ver aplicarInicioConWindows en main.js (solo aplica en la versión instalada)
  vozNombre: '', // nombre exacto de la voz de Windows para leer noticias ('' = la primera en español) — ver renderer/lector-voz.js
  vozVelocidad: 1, // 0.8 a 2 — velocidad de la lectura en voz alta
  vozSiguienteAuto: false, // al terminar una noticia en voz alta, seguir con la siguiente de la lista
  mostrarSaludoInicio: true // splash de bienvenida al arrancar (ver src/splash-estado.js) — apagar esto lo salta sin importar si hoy ya tocaba o no
};

function rutaArchivo() {
  return path.join(app.getPath('userData'), 'usuario.json');
}

function migrarSiHaceFalta() {
  const nueva = rutaArchivo();
  if (fs.existsSync(nueva)) return; // ya migrado (o instalación nueva que ya guardó aquí)
  try {
    fs.writeFileSync(nueva, fs.readFileSync(RUTA_VIEJA, 'utf-8'));
  } catch {
    // No había config vieja que migrar — instalación nueva, arranca en blanco.
  }
}

function obtenerConfiguracion() {
  migrarSiHaceFalta();
  try {
    const contenido = fs.readFileSync(rutaArchivo(), 'utf-8');
    return { ...VALORES_POR_DEFECTO, ...JSON.parse(contenido) };
  } catch {
    return VALORES_POR_DEFECTO;
  }
}

function guardarConfiguracion(cambios) {
  const actual = obtenerConfiguracion();
  const nueva = { ...actual, ...cambios };
  fs.writeFileSync(rutaArchivo(), JSON.stringify(nueva, null, 2));
  return nueva;
}

// A diferencia de guardarConfiguracion(), esto NO mezcla con lo que había
// antes — reemplaza todo por los valores de fábrica. Es lo que dispara el
// botón "Restablecer predeterminados" del panel de Configuración.
function restablecerConfiguracion() {
  fs.writeFileSync(rutaArchivo(), JSON.stringify(VALORES_POR_DEFECTO, null, 2));
  return VALORES_POR_DEFECTO;
}

module.exports = { obtenerConfiguracion, guardarConfiguracion, restablecerConfiguracion };
