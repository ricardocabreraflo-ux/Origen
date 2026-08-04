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

async function createCalendarEvent(booking) {
  const calendarId = requireCalendarId();
  const client = getAuthClient();
  const { token } = await client.getAccessToken();

  const startTime = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Calendar respondió ${res.status}: ${await res.text()}`);
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

module.exports = { createCalendarEvent, deleteCalendarEvent };
