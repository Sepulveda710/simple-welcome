const { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Fija el nombre interno (y con él, dónde vive %APPDATA%\<esto>, la
// carpeta de todos tus datos) SIN depender de "productName" en package.json
// ni del empaquetador — así, aunque el instalador o el ícono de Windows
// muestren "Lumina" (el nombre visible desde la versión 6.0; antes decía
// "Simple Welcome"), la carpeta de datos real sigue siendo la misma de
// siempre y no "se pierde" nada al actualizar. Tiene que llamarse ANTES
// que cualquier módulo pida app.getPath('userData') (configuracion.js,
// estado-lectura.js, etc.). NO renombrar esto a 'lumina' — es justo el
// candado que evita que un cambio de marca mueva los datos de Abel.
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
const { obtenerFuentes, agregarFuente, editarFuente, eliminarFuente, alternarFuenteActiva, exportarFuentes, prepararImportacion, importarFuentes } = require('./src/gestion-fuentes');
const { obtenerGuardados, guardarArticulo, eliminarGuardado } = require('./src/guardados');
const { abrirPanelIA, cerrarPanelIA, reposicionarPanelIA } = require('./src/panel-ia');

// Sin esto, Ctrl+R y F5 quedan atados al "Recargar" del menú por defecto
// de Electron (aunque esté oculto por autoHideMenuBar, sigue activo) — eso
// recargaría toda la ventana en vez de solo refrescar las noticias, que es
// lo que hace nuestro propio atajo en el renderer.
Menu.setApplicationMenu(null);

let ventanaPrincipal = null; // referencia para los handlers de IPC del panel-ia, más abajo

// --- Buscar actualizaciones desde la interfaz (Configuración > Acerca de) ---
// autoUpdater es un singleton de electron-updater: estos listeners quedan
// puestos para SIEMPRE, sin importar si lo disparó el chequeo silencioso
// del arranque (ver app.isPackaged más abajo) o el botón manual — así la
// interfaz refleja en vivo cualquiera de los dos caminos con el mismo código.
function enviarEstadoActualizacion(datos) {
  if (ventanaPrincipal) ventanaPrincipal.webContents.send('estado-actualizacion', datos);
}
autoUpdater.on('checking-for-update', () => enviarEstadoActualizacion({ estado: 'buscando' }));
autoUpdater.on('update-not-available', () => enviarEstadoActualizacion({ estado: 'al-dia' }));
autoUpdater.on('update-available', (info) => enviarEstadoActualizacion({ estado: 'disponible', version: info.version }));
autoUpdater.on('download-progress', (progreso) => enviarEstadoActualizacion({ estado: 'descargando', porcentaje: Math.round(progreso.percent) }));
autoUpdater.on('update-downloaded', (info) => enviarEstadoActualizacion({ estado: 'lista', version: info.version }));
autoUpdater.on('error', (error) => enviarEstadoActualizacion({ estado: 'error', mensaje: error.message }));

// Extensión propia para compartir listas de fuentes (ver package.json →
// build.fileAssociations): el archivo es JSON plano (mismo formato que
// devuelve exportarFuentes en gestion-fuentes.js), pero con su propia
// extensión para que Windows lo asocie con Lumina y lo abra con doble
// clic en vez de con el editor de texto por defecto.
const EXTENSION_FUENTES = 'fuenteslumina';

function leerArchivoFuentes(ruta) {
  try {
    return prepararImportacion(fs.readFileSync(ruta, 'utf-8'));
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo.' };
  }
}

// Saca de un argv (de process.argv al arrancar, o del que llega a
// 'second-instance') la ruta a un archivo de fuentes, si la trae. Windows
// pasa el archivo con el que se hizo doble clic como argumento suelto; se
// filtra por extensión (no por posición) porque en "npm start" el propio
// "." de electron también aparece en argv.
function extraerRutaDeFuentes(argv) {
  return argv.find((arg) => arg.toLowerCase().endsWith('.' + EXTENSION_FUENTES)) || null;
}

// Si hay un archivo detectado, le manda el resultado ya validado a la
// interfaz para que abra el diálogo de importación — funciona tanto si la
// ventana ya terminó de cargar (Lumina ya estaba abierta) como si acaba
// de arrancar (espera a 'did-finish-load' antes de mandarlo).
function manejarArchivoDeFuentes(ruta) {
  if (!ruta || !ventanaPrincipal) return;
  const resultado = leerArchivoFuentes(ruta);
  const enviar = () => ventanaPrincipal.webContents.send('fuentes-detectadas-por-archivo', resultado);
  if (ventanaPrincipal.webContents.isLoading()) {
    ventanaPrincipal.webContents.once('did-finish-load', enviar);
  } else {
    enviar();
  }
}

// Si Windows abre un SEGUNDO .fuenteslumina mientras Lumina ya está
// corriendo, no debe abrir una ventana nueva — debe avisarle a la que ya
// existe (y traerla al frente). Sin este candado, cada doble clic en un
// archivo mientras la app está abierta abriría una instancia aparte.
const bloqueoInstanciaUnica = app.requestSingleInstanceLock();
if (!bloqueoInstanciaUnica) {
  app.quit();
}

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

// Compartir listas de fuentes: exportar guarda un archivo con extensión
// propia (ver EXTENSION_FUENTES arriba); importar lo lee y lo valida sin
// agregar nada todavía (prepararImportacion), la interfaz decide qué
// entra de verdad con "confirmar-importacion-fuentes" — mismo patrón de
// "no agregar hasta que el usuario elija" que el doble clic en un
// archivo (ver manejarArchivoDeFuentes arriba).
ipcMain.handle('exportar-fuentes', async () => {
  if (!ventanaPrincipal) return { ok: false };
  const { canceled, filePath } = await dialog.showSaveDialog(ventanaPrincipal, {
    title: 'Exportar mis fuentes de noticias',
    defaultPath: 'mis-fuentes-lumina.' + EXTENSION_FUENTES,
    filters: [{ name: 'Lista de fuentes de Lumina', extensions: [EXTENSION_FUENTES] }]
  });
  if (canceled || !filePath) return { ok: false, cancelado: true };
  try {
    fs.writeFileSync(filePath, JSON.stringify(exportarFuentes(), null, 2));
    return { ok: true, ruta: filePath };
  } catch {
    return { ok: false, error: 'No se pudo guardar el archivo.' };
  }
});
ipcMain.handle('importar-fuentes-desde-dialogo', async () => {
  if (!ventanaPrincipal) return { ok: false };
  const { canceled, filePaths } = await dialog.showOpenDialog(ventanaPrincipal, {
    title: 'Importar fuentes de noticias',
    filters: [{ name: 'Lista de fuentes de Lumina', extensions: [EXTENSION_FUENTES, 'json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths[0]) return { ok: false, cancelado: true };
  return leerArchivoFuentes(filePaths[0]);
});
ipcMain.handle('confirmar-importacion-fuentes', (_evento, seleccionadas) => importarFuentes(seleccionadas));
ipcMain.handle('restablecer-configuracion', () => {
  const resultado = restablecerConfiguracion();
  aplicarInicioConWindows(resultado.iniciarConWindows);
  return resultado;
});
ipcMain.handle('obtener-version-app', () => app.getVersion());

// Igual que el chequeo automático de app.isPackaged al arrancar (más abajo):
// corriendo con "npm start" no hay ninguna versión "instalada" contra la
// cual comparar, así que ni se intenta — devuelve un error claro para que
// el botón lo muestre en vez de fallar en silencio o tronar en la consola.
ipcMain.handle('buscar-actualizaciones', () => {
  if (!app.isPackaged) return { ok: false, error: 'Buscar actualizaciones solo funciona en la versión instalada.' };
  autoUpdater.checkForUpdates();
  return { ok: true };
});
ipcMain.handle('instalar-actualizacion', () => autoUpdater.quitAndInstall());
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

if (bloqueoInstanciaUnica) {
  // Un doble clic en un .fuenteslumina mientras Lumina ya está abierta
  // llega aquí en vez de abrir una ventana nueva (ver el candado arriba).
  app.on('second-instance', (_evento, argv) => {
    if (ventanaPrincipal) {
      if (ventanaPrincipal.isMinimized()) ventanaPrincipal.restore();
      ventanaPrincipal.focus();
    }
    manejarArchivoDeFuentes(extraerRutaDeFuentes(argv));
  });

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

    // Si Lumina arrancó porque alguien hizo doble clic en un .fuenteslumina
    // (la app no estaba corriendo todavía), el archivo llega en el propio
    // process.argv de este primer arranque en vez de por 'second-instance'.
    manejarArchivoDeFuentes(extraerRutaDeFuentes(process.argv));

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
}
