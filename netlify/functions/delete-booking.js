// Borra una cita PERMANENTEMENTE de la base de datos (a diferencia de
// cancel-booking.js, que solo cambia el estado a "cancelled" y conserva el
// registro). Pensado para errores de captura, no para cancelaciones
// normales — por eso el panel pide confirmación explícita antes de llamar
// este endpoint.
const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");
const { deleteCalendarEvent } = require("./_lib/googleCalendar");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireSectionWrite(context, "citas");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request" }) };
  }
  if (!payload.id) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id de la cita." }) };
  }

  const requiredPin = process.env.DELETE_PIN;
  if (!requiredPin) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "Falta configurar DELETE_PIN en Netlify para poder eliminar citas." }),
    };
  }
  if (payload.pin !== requiredPin) {
    return { statusCode: 403, body: JSON.stringify({ error: "invalid_pin", message: "PIN incorrecto. No se eliminó la cita." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: deleted, error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", payload.id)
      .select()
      .single();

    if (error || !deleted) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    if (deleted.calendar_event_id) {
      try {
        await deleteCalendarEvent(deleted.calendar_event_id);
      } catch (calendarErr) {
        console.error("No se pudo borrar el evento de Google Calendar", calendarErr);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: true, booking: deleted }) };
  } catch (err) {
    console.error("delete-booking error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
