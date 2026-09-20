const { contextBridge, ipcRenderer } = require('electron');

// La interfaz (renderer/renderer.js) solo puede llamar las funciones que
// se exponen aquí abajo, cada una atada a un canal IPC concreto — no
// tiene acceso directo a Node ni al sistema de archivos, así que si algo
// sale mal (o se cuela algo) en la interfaz, no compromete el resto de la
// app. Si agregas una función a `window.api`, agrégala también en la
// lista de abajo: no hay wildcard ni "pasar el canal como string" —
// contextBridge solo expone lo que se nombra explícitamente aquí.
contextBridge.exposeInMainWorld('api', {
  obtenerSaludo: () => ipcRenderer.invoke('obtener-saludo'),
  obtenerNoticias: () => ipcRenderer.invoke('obtener-noticias'),
  leerArticulo: (enlace, forzar) => ipcRenderer.invoke('leer-articulo', enlace, forzar),
  obtenerColorDominante: (urlImagen) => ipcRenderer.invoke('obtener-color-dominante', urlImagen),
  debeMostrarSplash: () => ipcRenderer.invoke('debe-mostrar-splash'),
  obtenerLeidos: () => ipcRenderer.invoke('obtener-leidos'),
  marcarLeido: (enlace) => ipcRenderer.invoke('marcar-leido', enlace),
  alternarLeido: (enlace) => ipcRenderer.invoke('alternar-leido', enlace),
  restablecerLeidos: () => ipcRenderer.invoke('restablecer-leidos'),
  obtenerConfiguracion: () => ipcRenderer.invoke('obtener-configuracion'),
  guardarConfiguracion: (cambios) => ipcRenderer.invoke('guardar-configuracion', cambios),
  obtenerRecordatorios: () => ipcRenderer.invoke('obtener-recordatorios'),
  agregarRecordatorio: (datos) => ipcRenderer.invoke('agregar-recordatorio', datos),
  eliminarRecordatorio: (datos) => ipcRenderer.invoke('eliminar-recordatorio', datos),
  obtenerClima: () => ipcRenderer.invoke('obtener-clima'),
  buscarCiudad: (nombre) => ipcRenderer.invoke('buscar-ciudad', nombre),
  obtenerCita: () => ipcRenderer.invoke('obtener-cita'),
  obtenerFuentes: () => ipcRenderer.invoke('obtener-fuentes'),
  agregarFuente: (fuente) => ipcRenderer.invoke('agregar-fuente', fuente),
  eliminarFuente: (url) => ipcRenderer.invoke('eliminar-fuente', url),
  alternarFuenteActiva: (url) => ipcRenderer.invoke('alternar-fuente-activa', url),
  restablecerConfiguracion: () => ipcRenderer.invoke('restablecer-configuracion'),
  obtenerVersionApp: () => ipcRenderer.invoke('obtener-version-app'),
  obtenerGuardados: () => ipcRenderer.invoke('obtener-guardados'),
  guardarArticulo: (articulo) => ipcRenderer.invoke('guardar-articulo', articulo),
  eliminarGuardado: (enlace) => ipcRenderer.invoke('eliminar-guardado', enlace),
  abrirExterno: (enlace) => ipcRenderer.invoke('abrir-externo', enlace),
  buscarConIA: (consulta) => ipcRenderer.invoke('buscar-con-ia', consulta),
  cerrarPanelIA: () => ipcRenderer.invoke('cerrar-panel-ia')
});
