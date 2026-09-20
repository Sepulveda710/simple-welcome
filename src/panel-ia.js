// Módulo: panel-ia
// Responsabilidad única: mostrar/ocultar el panel lateral acoplado al borde
// derecho de la ventana, que carga una búsqueda de Google (Modo IA) para el
// texto seleccionado en modo lectura.
//
// Es una WebContentsView aparte pegada a la ventana principal, no un iframe
// ni HTML de nuestra página — por eso vive en su propio módulo: main.js solo
// necesita abrirPanelIA/cerrarPanelIA, sin saber cómo está armado por dentro.
// Ver también: config del botón "IA" (🪄) en renderer/renderer.js, y el
// botón "Cerrar búsqueda" en renderer/index.html (ese sí es HTML normal,
// porque el panel en sí no puede tener botones nuestros encima).

const { WebContentsView } = require('electron');

const ANCHO_PANEL = 420; // similar al ancho del panel lateral de Copilot en Edge

let vista = null;
let ventanaActual = null;

function calcularLimites(ventana) {
  const [ancho, alto] = ventana.getContentSize();
  return { x: ancho - ANCHO_PANEL, y: 0, width: ANCHO_PANEL, height: alto };
}

// Se llama en cada resize de la ventana (ver main.js) — si el panel no está
// abierto no hace nada, así que es seguro llamarla siempre sin condicionales.
function reposicionarPanelIA(ventana) {
  if (vista && ventanaActual === ventana) {
    vista.setBounds(calcularLimites(ventana));
  }
}

function abrirPanelIA(ventana, consulta) {
  ventanaActual = ventana;

  if (!vista) {
    vista = new WebContentsView();
    ventana.contentView.addChildView(vista);
  }

  vista.setBounds(calcularLimites(ventana));

  // udm=50 pide la pestaña "Modo IA" de Google. Si la cuenta/región del
  // usuario no la tiene habilitada, Google simplemente muestra la búsqueda
  // normal — no hay forma de forzarlo desde afuera, y no se raspa ni se
  // reformatea nada de su contenido: se ve la página tal cual la muestran.
  const url = `https://www.google.com/search?q=${encodeURIComponent(consulta)}&udm=50`;
  vista.webContents.loadURL(url);
}

function cerrarPanelIA() {
  if (vista && ventanaActual) {
    ventanaActual.contentView.removeChildView(vista);
    vista.webContents.close();
    vista = null;
  }
}

module.exports = { abrirPanelIA, cerrarPanelIA, reposicionarPanelIA };
