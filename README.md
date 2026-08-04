# Potzo — Sitio web para negocio de belleza

Sitio web de una página (HTML, CSS y JavaScript puro, sin dependencias ni
build step) para un salón de belleza o negocio similar, con:

- Presentación del negocio (inicio, servicios, sobre nosotros, galería)
- **Agenda tu cita**: formulario que arma un mensaje con nombre, servicio,
  fecha, hora y notas, y lo envía directo a WhatsApp (`wa.me`) para
  confirmar la reserva
- Botón para **añadir la cita a Google Calendar** con la fecha, hora y
  duración del servicio elegido
- Botón flotante de WhatsApp y enlaces a **redes sociales**
  (Instagram, Facebook, TikTok)
- Mapa embebido con la ubicación del negocio
- Diseño responsive (adaptado a celular, tablet y escritorio)

## Cómo personalizarlo

Toda la información del negocio vive en **un solo archivo**:
[`js/config.js`](js/config.js). Ahí puedes editar sin tocar el resto del
código:

- Nombre del negocio y frase (`name`, `tagline`)
- Número de WhatsApp (`whatsappNumber`, formato internacional solo dígitos)
- Teléfono y correo (`phoneDisplay`, `email`)
- Dirección y mapa de Google Maps (`address`, `mapEmbedUrl`)
- Horario de atención (`hours`)
- Redes sociales (`social.instagram`, `social.facebook`, `social.tiktok`)
- Lista de servicios con precio y duración (`services`)

Para obtener el `mapEmbedUrl`: en Google Maps busca tu negocio o dirección,
haz clic en "Compartir" → "Insertar un mapa" y copia la URL que aparece en
`src="..."`.

Las fotos de la galería (sección `#galeria` en `index.html`) están como
bloques de color de ejemplo — reemplázalas por imágenes reales guardando
tus fotos en la carpeta `assets/` y ajustando el CSS (`css/style.css`,
clases `.gallery-item`) para usar `background-image` con tus archivos.

## Cómo verlo localmente

No necesita instalación. Basta con abrir `index.html` en el navegador, o
levantar un servidor simple:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Cómo publicarlo

Es un sitio 100% estático, así que se puede desplegar gratis en:

- **GitHub Pages**: Settings → Pages → Deploy from branch → selecciona esta
  rama y la carpeta raíz.
- **Netlify / Vercel**: arrastra la carpeta del proyecto o conecta el
  repositorio; no requiere configuración de build.

## Estructura del proyecto

```
index.html        Estructura del sitio
css/style.css      Estilos
js/config.js       Datos del negocio (edita aquí)
js/script.js        Lógica: render dinámico, formulario, WhatsApp y Calendar
assets/             Carpeta para tus imágenes reales
```
