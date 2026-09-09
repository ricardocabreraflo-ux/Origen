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
      body: JSON.stringify({ error: "server_error", message: "Falta configurar DELETE_PIN en Netlify para poder cancelar citas." }),
    };
  }
  if (payload.pin !== requiredPin) {
    return { statusCode: 403, body: JSON.stringify({ error: "invalid_pin", message: "PIN incorrecto. No se canceló la cita." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: updated, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", payload.id)
      .in("status", ["pending", "confirmed"])
      .select()
      .single();

    if (error || !updated) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found_or_already_final" }) };
    }

    // Mejor esfuerzo: la cancelación en la base de datos ya quedó hecha,
    // así que un fallo aquí no debe impedir la respuesta.
    if (updated.calendar_event_id) {
      try {
        await deleteCalendarEvent(updated.calendar_event_id);
      } catch (calendarErr) {
        console.error("No se pudo borrar el evento de Google Calendar", calendarErr);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ booking: updated }) };
  } catch (err) {
    console.error("cancel-booking error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
