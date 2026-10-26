# Historial de cambios

El número de versión se ve al fondo del menú del panel (Citas, Clientas, Lealtad, Reportes, Finanzas, Configuración, Promos, Sorteos). Vive en `data/version.json`.

Cómo se numera (MAYOR.MENOR.CHICO):
- **Chico** (1.0.0 → 1.0.1): correcciones, textos, ajustes de estilo, cosas puntuales.
- **Mediano** (1.0.1 → 1.1.0): una función nueva o un cambio de comportamiento en una parte del sitio.
- **Grande** (1.4.2 → 2.0.0): rediseños importantes o cambios que tocan varias partes del sistema a la vez.

## 1.5.0 — 2026-10-26
Nuevo: en Promos ya puedes marcar a qué servicios aplica una campaña (ej. "solo Korean Lash Lifting") — si no marcas ninguno, sigue aplicando a cualquier servicio, como antes. Si alguien intenta usar el código en un servicio distinto, se lo dice al momento de escribirlo y la reserva lo rechaza aunque lo intente de todas formas.

## 1.4.3 — 2026-10-26
Corrección en la promoción en pareja: la política ahora dice claramente "si tu amiga no llega, se cobra el precio completo" (antes decía algo más confuso); el resumen de la cita ya muestra el anticipo combinado de la promoción (antes seguía mostrando el anticipo normal del servicio); y al borrar el código, los campos y el anticipo vuelven a la normalidad (antes se quedaban pegados).

## 1.4.2 — 2026-10-26
Corrección: en la promoción en pareja, el selector de horario de la amiga dejaba elegir un horario pegado justo después del de la primera clienta, sin dejar los 30 minutos de colchón de limpieza entre citas — eso hacía que, al enviar, la reserva fallara igual. Ahora el selector ya excluye esos horarios desde el inicio.

## 1.4.1 — 2026-10-26
Ajuste a la promoción en pareja: la amiga ahora elige su propio horario (con el de justo después ya sugerido) en vez de asignárselo automático, y se agregó una política visible al detectar el código: si una de las dos no asiste, se pierde el precio de promoción — quien sí va paga su servicio completo, y quien falte cubre el costo de la promoción perdida.

## 1.4.0 — 2026-10-26
Nuevo: promociones "en pareja" (ej. "trae a tu amiga"). En Promos hay un nuevo checkbox "Requiere agendar en pareja" + un anticipo combinado opcional — cuando una clienta usa uno de estos códigos al reservar, el formulario le pide también los datos de su amiga y crea las dos citas juntas (horarios seguidos), con el anticipo repartido entre ambas. El código ya no se puede usar si solo reserva una persona.

## 1.3.0 — 2026-10-26
Nuevo: en Citas ahora se ve una etiqueta 🏷️ con el código de promoción cuando una cita usó uno (y cuánto descuento aplica) — antes el código se guardaba pero no se veía en ningún lado del panel, así que no había forma de saber a simple vista qué citas lo usaron.

## 1.2.2 — 2026-10-21
Corrección: cuando la sesión del panel expiraba al crear una cita manual (Citas → Crear cita), el error mostraba el mensaje genérico "No se pudo crear la cita" en vez de avisar que había que volver a iniciar sesión.

## 1.2.1 — 2026-10-20
Ajuste visual: los posts de Instagram destacados ahora se ven en carrusel horizontal (se deslizan con el dedo) en vez de apilarse uno debajo del otro.

## 1.2.0 — 2026-10-20
Nuevo: "Antes y después" y "Posts de Instagram" ahora se administran desde Configuración (como la Galería de fotos) en vez de desde el editor de contenido — sube las fotos de antes/después directamente y pega el enlace de un post para destacarlo, sin tener que buscar el campo en un formulario largo.

## 1.1.2 — 2026-10-09
Ajuste de texto: cuando un día está bloqueado por completo (Citas → Bloqueos de horario), ya no se le dice "cerrado" a la clienta — ahora el mensaje es "Ya no hay horarios disponibles este día", para que se vea como un día muy solicitado e invite a anotarse en la lista de espera.

## 1.1.1 — 2026-10-09
Corrección: el "Motivo" privado de un bloqueo de horario (Citas → Bloqueos de horario) se estaba mostrando tal cual a las clientas en la página de reservas cuando ese día no tenía horarios — ahora se queda solo en el panel y la clienta ve un mensaje genérico.

## 1.1.0 — 2026-10-01
- Protección anti-spam en el formulario de reservas: campo trampa invisible + límite de 5 reservas por IP cada 15 minutos.
- Datos estructurados (schema.org) en la página principal para que Google entienda mejor el negocio en búsquedas locales (Maps, "cejas cerca de mí", etc.).

## 1.0.1 — 2026-09-25
Corrección: el número de versión no se veía en celular porque estaba oculto siempre en el riel angosto — ahora se ve al abrir el menú (igual que el resto de las etiquetas).

## 1.0.0 — 2026-09-25
Primera versión con número visible en el panel. A partir de aquí se numeran los cambios que sigan.
