const { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Fija el nombre interno (y con él, dónde vive %APPDATA%\<esto>, la
// carpeta de todos tus datos) SIN depender de "productName" en package.json
// ni del empaquetador — así, si el día de mañana el instalador o el ícono
// de Windows muestran "Simple Welcome" con mayúsculas y espacio, la
// carpeta de datos real sigue siendo la misma de siempre y no "se pierde"
// nada al actualizar. Tiene que llamarse ANTES que cualquier módulo pida
// app.getPath('userData') (configuracion.js, estado-lectura.js, etc.).
app.setName('simple-welcome');

const { generarSaludo } = require('./src/saludo');
const { obtenerNoticias } = require('./src/lector-rss');
const { extraerArticulo } = require('./src/modo-lectura');
const { obtenerColorDominante } = require('./src/color-articulo');
const { debeMostrarSplashHoy } = require('./src/splash-estado');
const { obtenerLeidos, marcarComoLeido, alternarLeido, restablecerLeidos } = require('./src/estado-lectura');
const { obtenerEstadoVentana, guardarEstadoVentana } = require('./src/ventana-estado');
const { obtenerConfiguracion, guardarConfiguracion, restablecerConfiguracion } = require('./src/configuracion');
const { obtenerRecordatorios, agregarRecordatorio, eliminarRecordatorio } = require('./src/recordatorios');
const { obtenerClima, buscarCiudad } = require('./src/clima');
const { obtenerCitaDelDia } = require('./src/cita');
const { obtenerFuentes, agregarFuente, editarFuente, eliminarFuente, alternarFuenteActiva } = require('./src/gestion-fuentes');
const { obtenerGuardados, guardarArticulo, eliminarGuardado } = require('./src/guardados');
const { abrirPanelIA, cerrarPanelIA, reposicionarPanelIA } = require('./src/panel-ia');

// Sin esto, Ctrl+R y F5 quedan atados al "Recargar" del menú por defecto
// de Electron (aunque esté oculto por autoHideMenuBar, sigue activo) — eso
// recargaría toda la ventana en vez de solo refrescar las noticias, que es
// lo que hace nuestro propio atajo en el renderer.
Menu.setApplicationMenu(null);

let ventanaPrincipal = null; // referencia para los handlers de IPC del panel-ia, más abajo

// Registra (o quita) la app para abrir sola al iniciar sesión en Windows.
// Solo en la versión instalada: corriendo con "npm start" esto registraría
// el electron.exe suelto de node_modules como programa de inicio, que no es
// la app y se quedaría ahí aunque la desinstales. Por eso el mismo guard
// que el actualizador (app.isPackaged).
function aplicarInicioConWindows(activo) {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: Boolean(activo) });
}

function crearVentana() {
  const estadoGuardado = obtenerEstadoVentana();

  const ventana = new BrowserWindow({
    ...estadoGuardado,
    minWidth: 700, // suficiente para que el calendario y las noticias quepan sin verse rotos
    minHeight: 560,
    autoHideMenuBar: true,
    show: false, // nace oculta — evita el destello en blanco antes de que cargue el contenido
    icon: path.join(__dirname, 'assets', 'icono.png'), // ver assets/icono.svg y scripts/generar-icono.js
    backgroundMaterial: 'mica', // efecto nativo de Windows 11; requiere Electron ≥38 (ver package.json) para no romper el redimensionado
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ventanaPrincipal = ventana;

  ventana.once('ready-to-show', () => {
    ventana.show();
  });

  // Guarda el tamaño/posición cada vez que cambian, con un pequeño retraso
  // para no escribir en disco en cada pixel que se mueve la ventana.
  let temporizador = null;
  const guardarConRetraso = () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      guardarEstadoVentana(ventana.getBounds());
    }, 300);
  };

  ventana.on('resize', guardarConRetraso);
  ventana.on('resize', () => reposicionarPanelIA(ventana));
  ventana.on('move', guardarConRetraso);

  // Endurecimiento: 'will-navigate' solo se dispara para navegación que
  // arranca LA PÁGINA (un link, window.location) — nunca para nuestros
  // propios ventana.loadFile()/loadURL() del proceso principal, así que
  // bloquearla siempre aquí no rompe nada propio. La interfaz nunca
  // necesita navegar de verdad (los enlaces de un artículo se interceptan
  // en renderer.js y van a modo lectura o a shell.openExternal) — esto es
  // la red de seguridad por si un artículo externo trajera un <script>
  // que se nos escapó de la sanitización (ver src/modo-lectura.js): sin
  // esto, podría mandar la ventana principal a cargar contenido remoto
  // con nuestro preload.js (y su window.api) todavía puesto encima.
  ventana.webContents.on('will-navigate', (evento) => evento.preventDefault());
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  ventana.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// Cada canal IPC llama a UN módulo. Si mañana cambias cómo se leen las
// noticias, esta línea no se toca — solo cambia lector-rss.js.
ipcMain.handle('obtener-saludo', () => generarSaludo());
ipcMain.handle('obtener-noticias', () => obtenerNoticias());
ipcMain.handle('leer-articulo', (_evento, enlace, forzar) => extraerArticulo(enlace, forzar));
ipcMain.handle('obtener-color-dominante', (_evento, urlImagen) => obtenerColorDominante(urlImagen));
ipcMain.handle('debe-mostrar-splash', () => debeMostrarSplashHoy());
ipcMain.handle('obtener-leidos', () => obtenerLeidos());
ipcMain.handle('marcar-leido', (_evento, enlace) => marcarComoLeido(enlace));
ipcMain.handle('alternar-leido', (_evento, enlace) => alternarLeido(enlace));
ipcMain.handle('restablecer-leidos', () => restablecerLeidos());
ipcMain.handle('obtener-configuracion', () => obtenerConfiguracion());
ipcMain.handle('guardar-configuracion', (_evento, cambios) => {
  const resultado = guardarConfiguracion(cambios);
  if (cambios.tema) {
    nativeTheme.themeSource = cambios.tema === 'oscuro' ? 'dark' : 'light';
  }
  if (cambios.iniciarConWindows !== undefined) {
    aplicarInicioConWindows(cambios.iniciarConWindows);
  }
  return resultado;
});
ipcMain.handle('obtener-recordatorios', () => obtenerRecordatorios());
ipcMain.handle('agregar-recordatorio', (_evento, { fecha, texto, color, hora }) => agregarRecordatorio(fecha, texto, color, hora));
ipcMain.handle('eliminar-recordatorio', (_evento, { fecha, id }) => eliminarRecordatorio(fecha, id));
ipcMain.handle('obtener-clima', () => obtenerClima());
ipcMain.handle('buscar-ciudad', (_evento, nombre) => buscarCiudad(nombre));
ipcMain.handle('obtener-cita', () => obtenerCitaDelDia());
ipcMain.handle('obtener-fuentes', () => obtenerFuentes());
ipcMain.handle('agregar-fuente', (_evento, fuente) => agregarFuente(fuente));
ipcMain.handle('editar-fuente', (_evento, urlOriginal, cambios) => editarFuente(urlOriginal, cambios));
ipcMain.handle('eliminar-fuente', (_evento, url) => eliminarFuente(url));
ipcMain.handle('alternar-fuente-activa', (_evento, url) => alternarFuenteActiva(url));
ipcMain.handle('restablecer-configuracion', () => {
  const resultado = restablecerConfiguracion();
  aplicarInicioConWindows(resultado.iniciarConWindows);
  return resultado;
});
ipcMain.handle('obtener-version-app', () => app.getVersion());
ipcMain.handle('obtener-guardados', () => obtenerGuardados());
ipcMain.handle('guardar-articulo', (_evento, articulo) => guardarArticulo(articulo));
ipcMain.handle('eliminar-guardado', (_evento, enlace) => eliminarGuardado(enlace));

// Usa el navegador predeterminado que tengas configurado en Windows
// (Edge, Chrome, el que sea) — no forzamos ninguno en particular.
// Antes de mandarlo al shell del sistema, se valida que sea http(s): un
// enlace puede venir de un <a href> dentro del HTML de un artículo
// externo, así que en teoría podría traer un esquema raro (file:, o un
// protocolo de otro programa instalado) — shell.openExternal se lo
// pasaría tal cual al sistema operativo para "abrirlo".
function esEnlaceWebSeguro(enlace) {
  try {
    return ['http:', 'https:'].includes(new URL(enlace).protocol);
  } catch {
    return false;
  }
}

ipcMain.handle('abrir-externo', (_evento, enlace) => {
  if (esEnlaceWebSeguro(enlace)) shell.openExternal(enlace);
});

ipcMain.handle('buscar-con-ia', (_evento, consulta) => {
  if (ventanaPrincipal) abrirPanelIA(ventanaPrincipal, consulta);
});
ipcMain.handle('cerrar-panel-ia', () => cerrarPanelIA());

app.whenReady().then(() => {
  // El Mica nativo también tiene variante clara/oscura — se sincroniza con
  // el tema guardado ANTES de crear la ventana, para que no haya un
  // parpadeo del tema equivocado al abrir la app. Se mueve aquí (antes
  // vivía arriba, a nivel de módulo) porque obtenerConfiguracion() ahora
  // usa app.getPath('userData'), que solo debe llamarse una vez la app
  // está lista.
  const configInicial = obtenerConfiguracion();
  nativeTheme.themeSource = configInicial.tema === 'oscuro' ? 'dark' : 'light';

  // Se re-aplica en cada arranque (no solo al guardar) para que se
  // mantenga bien tras una actualización o si Windows perdió el registro.
  aplicarInicioConWindows(configInicial.iniciarConWindows);

  crearVentana();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });

  // app.isPackaged es false corriendo con "npm start" — electron-updater
  // no tiene de dónde descargar una versión "instalada" en ese caso y solo
  // llenaría la consola de errores, así que ni se intenta. Fuera de eso,
  // revisa GitHub Releases al abrir la app; si hay una versión nueva, la
  // descarga sola en segundo plano y muestra el aviso nativo de Windows
  // cuando ya está lista — se instala la próxima vez que cierres la app,
  // sin pedir nada manual y sin tocar userData (ver "build.publish" en
  // package.json para dónde busca esa versión nueva).
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
