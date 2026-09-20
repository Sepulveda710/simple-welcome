# Simple Welcome

_Beta 4.0_ — app de bienvenida al iniciar Windows: saludo personalizado,
hora, clima, calendario con recordatorios, Chía (la mascota), noticias por
RSS con modo lectura, y un panel de búsqueda con IA integrado.

## Cómo correrlo

```bash
npm install
npm start
```

> **Si ya tenías la app instalada de antes:** esta versión actualizó Electron
> (necesario para que el efecto Mica no rompa el redimensionado de la
> ventana). Borra la carpeta `node_modules` y el archivo
> `package-lock.json`, y vuelve a correr `npm install` — si no, puede que
> siga usando la versión vieja que ya tenías descargada.

## Cómo agregar o quitar una fuente de noticias

Abre `config/fuentes.json` y agrega o borra un bloque como este:

```json
{
  "nombre": "Nombre del medio",
  "url": "https://ejemplo.com/feed",
  "categoria": "Tecnología"
}
```

No necesitas tocar ningún otro archivo. Si el feed falla o no existe,
esa fuente simplemente no aparece — el resto de la app sigue funcionando.

## Cómo cambiar tu nombre

Edita `config/usuario.json`.

## Estructura del proyecto

```
main.js              → arranca la ventana y conecta los módulos
preload.js            → puente seguro entre la app y la interfaz
config/
  fuentes.json        → medios de noticias (editable)
  usuario.json        → tu nombre y preferencias
src/
  saludo.js           → arma el mensaje de bienvenida
  lector-rss.js        → lee los feeds y normaliza los artículos
  modo-lectura.js      → extrae el texto limpio de un artículo
renderer/
  index.html          → estructura de la pantalla
  styles.css          → estilos (base plana por ahora)
  renderer.js          → pinta los datos en pantalla
```

Cada módulo en `src/` hace una sola cosa y no depende de cómo están hechos
los demás. Por ejemplo, si mañana cambias todo el diseño de la interfaz,
`lector-rss.js` y `modo-lectura.js` no se tocan ni se rompen.

## Siguiente etapa (pendiente)

- Iniciar automáticamente con Windows (acceso directo en la carpeta de inicio).
- Estética Fluent (Mica/Acrylic, iconos Segoe Fluent, transiciones suaves).
