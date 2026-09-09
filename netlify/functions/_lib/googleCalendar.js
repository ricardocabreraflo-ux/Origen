const { JWT } = require("google-auth-library");

// Cuenta de servicio con acceso de escritura solo al calendario que
// compartiste con ella (GOOGLE_CALENDAR_ID). Nunca toca el resto de tu
// cuenta de Google.
function getAuthClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error("Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_KEY");
  }
  const credentials = JSON.parse(keyJson);
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function requireCalendarId() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("Falta la variable de entorno GOOGLE_CALENDAR_ID");
  }
  return calendarId;
}

function bookingEventBody(booking) {
  const startTime = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);
  return {
    summary: `${booking.service_name} · ${booking.customer_name}`,
    description: [
      `Código de reserva: ${booking.reservation_code}`,
      `Teléfono: ${booking.customer_phone}`,
      `Anticipo: $${booking.deposit_amount} MXN`,
      booking.notes ? `Notas: ${booking.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: `${booking.booking_date}T${startTime}:00`, timeZone: "America/Mexico_City" },
    end: { dateTime: `${booking.booking_date}T${endTime}:00`, timeZone: "America/Mexico_City" },
  };
}

async function createCalendarEvent(booking) {
  const calendarId = requireCalendarId();
  const client = getAuthClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(bookingEventBody(booking)),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Calendar respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Actualiza un evento ya existente (por ejemplo, cuando la administradora
// edita fecha/hora/servicio/datos de una cita que ya estaba sincronizada).
async function updateCalendarEvent(eventId, booking) {
  const calendarId = requireCalendarId();
  const client = getAuthClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(bookingEventBody(booking)),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Calendar respondió ${res.status} al actualizar el evento: ${await res.text()}`);
  }
  return res.json();
}

async function deleteCalendarEvent(eventId) {
  const calendarId = requireCalendarId();
  const client = getAuthClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  // 410/404 significa que el evento ya no existe (por ejemplo, lo borraron
  // a mano en Google Calendar) — no es un error real para nuestro flujo.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar respondió ${res.status} al borrar el evento`);
  }
}

// Crea el evento de un bloqueo de horario que la dueña armó desde el panel
// (día completo o solo un rango de horas), para que también se vea
// bloqueado en su Google Calendar real.
async function createBlockEvent(block) {
  const calendarId = requireCalendarId();
  const client = getAuthClient();
  const { token } = await client.getAccessToken();

  const summary = block.label ? `🚫 Cerrado — ${block.label}` : "🚫 Cerrado";
  const isFullDay = !block.start_time || !block.end_time;

  const body = {
    summary,
    description: "Bloqueo creado desde el panel de Citas de Origen Brows.",
  };

  if (isFullDay) {
    const nextDay = new Date(`${block.block_date}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);
    body.start = { date: block.block_date };
    body.end = { date: nextDayStr };
  } else {
    body.start = { dateTime: `${block.block_date}T${block.start_time}:00`, timeZone: "America/Mexico_City" };
    body.end = { dateTime: `${block.block_date}T${block.end_time}:00`, timeZone: "America/Mexico_City" };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Calendar respondió ${res.status} al crear el bloqueo: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, createBlockEvent };
