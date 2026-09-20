# Simple Welcome

Una app de bienvenida para Windows: al encender tu computadora te saluda,
te muestra el clima, tu calendario y las noticias de **tus** fuentes, y te
deja leerlas sin ruido. Incluye a Chía, la mascota.

## Por qué existe

Antes yo entraba seguido a las páginas de noticias que me interesaban. Con
el tiempo las redes sociales se volvieron el filtro de todo lo que leo, y
dejé de visitar esas páginas. Extrañaba el hábito: sentarme con un café o
una comida y ponerme al día — saber qué se hizo, qué se planea, qué se
rumora — directo de las fuentes que elijo, no de lo que un algoritmo decide
ponerme enfrente.

Por eso la app abre sola al iniciar Windows: es el momento natural para
ponerse al día, al empezar el día o al prepararse para dormir. (Se puede
apagar en Configuración.) Y si no quieres sentarte a leer, abres una
noticia y la dejas de fondo mientras haces otra cosa.

Las fuentes por defecto son de tecnología y economía. No hay política ni
deportes a propósito — pero cada quien agrega las que quiera, y las que sean
de calidad.

## Instalar

Descarga el instalador de la última versión en
[Releases](https://github.com/Sepulveda710/simple-welcome/releases). La app se
actualiza sola después. (El instalador aún no está firmado, así que Windows
muestra "Windows protegió su PC": elige "Más información" → "Ejecutar de
todas formas".)

## Correrla para desarrollar

```bash
npm install
npm start
```

## Estructura

```
main.js         → arranca la ventana, actualizaciones e inicio con Windows
preload.js      → puente seguro entre la app y la interfaz
src/            → un módulo por responsabilidad (RSS, modo lectura, clima…)
renderer/       → interfaz (HTML/CSS/JS planos, sin build)
```

Los datos del usuario (nombre, fuentes, leídos, guardados) viven en
`%APPDATA%\simple-welcome`, no en la carpeta de la app, para que
actualizar nunca los borre.
