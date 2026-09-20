// Utilidad de desarrollo, no parte de la app en sí: convierte
// assets/icono.svg a PNG (necesario porque BrowserWindow no acepta SVG
// directo como ícono). Se corre a mano cuando el ícono cambia:
//
//   node_modules\.bin\electron scripts\generar-icono.js
//
// Usa la propia Electron para dibujar el SVG en una ventana oculta y
// capturar el resultado — no hace falta ninguna librería extra de imágenes.

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const TAMANO = 256;

app.disableHardwareAcceleration(); // evita errores del proceso de GPU al capturar en este entorno

app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icono.svg'), 'utf-8');
  const html = `data:text/html,<style>*{margin:0}html,body{overflow:hidden;width:100%;height:100%}svg{display:block}</style>${encodeURIComponent(svg)}`;

  const ventana = new BrowserWindow({
    width: TAMANO,
    height: TAMANO,
    show: false,
    transparent: true
  });

  await ventana.loadURL(html);
  await new Promise((r) => setTimeout(r, 300)); // deja que termine de pintar antes de capturar
  const imagen = await ventana.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'icono.png'), imagen.toPNG());

  console.log('Ícono generado en assets/icono.png');
  app.quit();
});
