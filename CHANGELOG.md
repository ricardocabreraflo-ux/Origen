# Historial de cambios

El número de versión se ve al fondo del menú del panel (Citas, Clientas, Lealtad, Reportes, Finanzas, Configuración, Promos, Sorteos). Vive en `data/version.json`.

Cómo se numera (MAYOR.MENOR.CHICO):
- **Chico** (1.0.0 → 1.0.1): correcciones, textos, ajustes de estilo, cosas puntuales.
- **Mediano** (1.0.1 → 1.1.0): una función nueva o un cambio de comportamiento en una parte del sitio.
- **Grande** (1.4.2 → 2.0.0): rediseños importantes o cambios que tocan varias partes del sistema a la vez.

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
