# Origen Brows & Hair Studio — Sitio web y sistema de citas

Sitio web para Origen Brows & Hair Studio con un sistema real de reservas:
las clientas apartan su horario con un anticipo por transferencia, y el
horario queda bloqueado en definitiva en cuanto tú confirmas el depósito.

## Qué incluye

- Landing page editorial (servicios, sobre nosotros, galería, políticas,
  testimonios, preguntas frecuentes, contacto)
- **Agenda tu cita** en 4 pasos: servicio → fecha y horario → datos →
  confirmación
- **Duración real por servicio** + 15 minutos de colchón de limpieza entre
  citas; la disponibilidad se calcula sola y nunca se traslapan dos citas
- **Anticipo por transferencia**: al reservar, el horario queda apartado
  por 30 minutos mientras se confirma el depósito
- **Cero doble-reservas**: incluso si dos personas reservan el mismo
  horario al mismo tiempo, la base de datos solo deja pasar una
- **Panel de citas** (`/admin/citas.html`) para ver, confirmar o cancelar
  reservas
- **Panel de contenido** (`/admin/`) para editar servicios, precios, fotos,
  horario, políticas, etc. sin tocar código
- Botón flotante de WhatsApp, redes sociales, mapa embebido
- Diseño responsive, con animaciones y transiciones cuidadas

## Cómo está construido

- **Frontend**: HTML, CSS y JavaScript puro (sin frameworks ni build step)
- **Backend**: [Netlify Functions](https://docs.netlify.com/functions/overview/)
  (serverless) en `netlify/functions/`
- **Base de datos**: [Supabase](https://supabase.com) (Postgres) — guarda
  las citas y evita duplicados a nivel de base de datos, no solo en el
  navegador
- **Pagos**: por ahora, transferencia electrónica manual (tú confirmas el
  depósito desde el panel de citas). Se puede agregar una pasarela de pago
  automática (Mercado Pago, Stripe, etc.) más adelante sin rehacer el
  sistema — solo agregaría un paso de verificación automática donde hoy
  hay confirmación manual.

## Configuración inicial (una sola vez)

### 1. Crear el proyecto en Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto
   nuevo (plan gratuito).
2. Ve a **SQL Editor → New query**, pega todo el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**. Esto crea
   la tabla de citas con la protección anti-doble-reserva.
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → será `SUPABASE_URL`
   - **service_role key** (la secreta, no la `anon`) → será
     `SUPABASE_SERVICE_ROLE_KEY`

### 2. Publicar el sitio en Netlify

1. Entra a [netlify.com](https://www.netlify.com) e importa este
   repositorio de GitHub como un nuevo sitio. Deja "Build command" vacío y
   "Publish directory" en `.` (Netlify detecta las functions solo, por el
   archivo `netlify.toml`).
2. En **Site configuration → Environment variables**, agrega:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Vuelve a desplegar el sitio (Deploys → Trigger deploy) para que tome las
   variables nuevas.

### 3. Activar los paneles de administración

Ambos paneles (`/admin` de contenido y `/admin/citas.html` de reservas)
usan el mismo inicio de sesión:

1. **Site configuration → Identity → Enable Identity**.
2. **Identity → Registration** → elige "Invite only".
3. **Identity → Services** → activa **Git Gateway** (esto es lo que le
   permite al panel de contenido guardar cambios como commits).
4. Pestaña **Identity** del sitio → **Invite users** → agrégate con tu
   correo, revisa tu bandeja y crea tu contraseña.
5. Ya puedes entrar a `https://tu-sitio.netlify.app/admin/` (contenido) y
   `https://tu-sitio.netlify.app/admin/citas.html` (reservas).

### 4. Completar tus datos bancarios

Edita en [`data/config.json`](data/config.json) (o desde el panel de
contenido) la sección `bankTransfer` con tu banco, titular y CLABE reales
— por ahora dice "Pendiente por definir".

## Cómo personalizarlo

Toda la información del negocio vive en [`data/config.json`](data/config.json):
nombre, logo, fundadora, horario, redes sociales, servicios y sus
anticipos, políticas, preguntas frecuentes, testimonios y datos bancarios.
Edítalo directamente o desde el panel `/admin/`.

Para obtener el `mapEmbedUrl`: en Google Maps busca tu dirección, clic en
"Compartir" → "Insertar un mapa" y copia la URL de `src="..."`.

Las imágenes reales del negocio están en [`assets/`](assets/).

## Cómo verlo localmente

Este sitio ya no es 100% estático (necesita las Netlify Functions para
calcular disponibilidad y crear reservas), así que para probarlo completo
localmente se usa la CLI de Netlify:

```bash
npm install
npm install -g netlify-cli   # una sola vez
netlify dev
# abre la URL que te muestre (normalmente http://localhost:8888)
```

`netlify dev` necesita las mismas variables de entorno que en producción
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — puedes ponerlas en un
archivo `.env` en la raíz del proyecto (no se sube al repositorio) o
vincular el sitio con `netlify link` para que las tome de Netlify.

Si solo quieres ver el diseño (sin probar la reserva real), basta con:

```bash
python3 -m http.server 8000
# abre http://localhost:8000 — la página carga, pero "Agenda tu cita" no
# podrá calcular disponibilidad porque no hay funciones corriendo
```

## Cómo publicarlo

Requiere Netlify (o un proveedor que soporte Netlify Functions) por el
backend de reservas — ver [Configuración inicial](#configuración-inicial-una-sola-vez)
arriba. GitHub Pages o un hosting puramente estático ya no alcanzan, porque
la disponibilidad y las reservas dependen de las funciones y de Supabase.

## Estructura del proyecto

```
index.html                  Estructura del sitio
css/style.css                 Estilos
js/script.js                   Carga data/config.json, render dinámico,
                                flujo de reserva por pasos, FAQ, animaciones
data/config.json               Todo el contenido del negocio
admin/index.html, config.yml   Panel de contenido (Decap CMS)
admin/citas.html                Panel de citas (ver/confirmar/cancelar)
assets/                         Imágenes reales del negocio

netlify/functions/
  availability.js               Calcula horarios libres de una fecha
  create-booking.js              Crea una reserva pendiente (anti-doble-reserva)
  confirm-booking.js             [admin] confirma el depósito recibido
  cancel-booking.js              [admin] cancela una reserva
  list-bookings.js               [admin] lista las reservas
  _lib/                          Código compartido (Supabase, horarios, etc.)

supabase/schema.sql             Esquema de base de datos (correr una sola vez)
netlify.toml                    Configuración de Netlify (rutas /api/*)
```
