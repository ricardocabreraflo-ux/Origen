# Origen Brows & Hair Studio — Sitio web

Sitio web de una página (HTML, CSS y JavaScript puro, sin dependencias ni
build step) para Origen Brows & Hair Studio, con:

- Presentación del negocio (inicio, servicios, sobre nosotros, galería)
- **Agenda tu cita**: formulario que arma un mensaje con nombre, servicio,
  fecha, hora y notas, y lo envía directo a WhatsApp (`wa.me`) para
  confirmar la reserva
- Botón para **añadir la cita a Google Calendar** con la fecha, hora y
  duración del servicio elegido
- Botón flotante de WhatsApp y enlaces a **redes sociales**
  (Instagram, Facebook, TikTok)
- Mapa embebido con la ubicación del negocio
- **Panel de administración** (`/admin`) para editar el contenido sin tocar
  código — ver más abajo
- Diseño responsive (adaptado a celular, tablet y escritorio)

## Cómo personalizarlo

Toda la información del negocio vive en **un solo archivo de datos**:
[`data/config.json`](data/config.json). Puedes editarlo directamente, o
mejor aún, usar el [panel de administración](#panel-de-administración) para
no tener que tocar código nunca.

Ahí se controla:

- Nombre del negocio y frase principal (`name`, `tagline`)
- Logo (`logoImage`, `logoText`, `logoSub`)
- Fundadora y cita de marca (`founder`, `brandQuote`)
- Barra de aviso de apertura/promoción (`opening`)
- Número de WhatsApp (`whatsappNumber`, formato internacional solo dígitos)
- Teléfono y correo (`phoneDisplay`, `email`)
- Dirección y mapa de Google Maps (`address`, `mapEmbedUrl`)
- Horario de atención (`hours`)
- Redes sociales (`social.instagram`, `social.facebook`, `social.tiktok`)
- Foto de la sección "Sobre nosotros" y galería (`aboutImage`, `galleryImages`)
- Lista de servicios con precio y duración (`services`)

Para obtener el `mapEmbedUrl`: en Google Maps busca tu negocio o dirección,
haz clic en "Compartir" → "Insertar un mapa" y copia la URL que aparece en
`src="..."`.

Las imágenes reales del negocio (logo, foto de la fundadora, galería) están
en la carpeta [`assets/`](assets/).

## Panel de administración

El sitio incluye un panel en `/admin` (basado en [Decap CMS](https://decapcms.org),
gratuito y de código abierto) para editar servicios, precios, fotos,
horario, redes sociales, etc. desde un formulario — sin necesidad de saber
programar. Cada cambio que guardes ahí se convierte automáticamente en un
commit a este repositorio y actualiza la página publicada.

Para activarlo, el sitio debe estar publicado en **Netlify** (tiene un plan
gratuito más que suficiente para este sitio):

1. Entra a [netlify.com](https://www.netlify.com) e importa este repositorio
   de GitHub como un nuevo sitio (no requiere configuración de build: deja
   "Build command" vacío y "Publish directory" en `.`).
2. En el panel del sitio en Netlify: **Site configuration → Identity → Enable Identity**.
3. En **Identity → Registration**, elige "Invite only" (para que solo tú
   puedas entrar a editar).
4. En **Identity → Services**, activa **Git Gateway**.
5. En la pestaña **Identity** del sitio, usa **Invite users** y agrégate a
   ti mismo con tu correo.
6. Revisa tu correo, acepta la invitación y crea tu contraseña.
7. Entra a `https://tu-sitio.netlify.app/admin/`, inicia sesión, y edita el
   contenido desde ahí. Al guardar, la página se actualiza sola en un par
   de minutos.

Mientras tanto (o si prefieres no usar Netlify), siempre puedes editar
[`data/config.json`](data/config.json) directamente y subir el cambio.

## Cómo verlo localmente

No necesita instalación. Basta con levantar un servidor simple (abrir
`index.html` directo con doble clic no funciona porque el sitio carga los
datos con `fetch`, que requiere http:// en vez de file://):

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Cómo publicarlo

Es un sitio 100% estático, así que se puede desplegar gratis en:

- **Netlify** (recomendado): permite además activar el panel de
  administración, ver la sección de arriba.
- **GitHub Pages**: Settings → Pages → Deploy from branch → selecciona esta
  rama y la carpeta raíz. (El panel `/admin` no funcionará aquí sin
  configurar tu propio backend de autenticación.)
- **Vercel**: arrastra la carpeta del proyecto o conecta el repositorio; no
  requiere configuración de build.

## Estructura del proyecto

```
index.html          Estructura del sitio
css/style.css        Estilos
js/script.js          Lógica: carga data/config.json, render dinámico,
                       formulario, WhatsApp y Calendar
data/config.json      Todo el contenido del negocio (edítalo aquí o desde /admin)
admin/                Panel de administración (Decap CMS)
assets/                Imágenes reales del negocio
```
