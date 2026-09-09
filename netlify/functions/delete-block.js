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
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id del bloqueo." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: deleted, error } = await supabase.from("schedule_blocks").delete().eq("id", payload.id).select().single();

    if (error || !deleted) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    if (deleted.calendar_event_id) {
      try {
        await deleteCalendarEvent(deleted.calendar_event_id);
      } catch (calendarErr) {
        console.error("No se pudo borrar el evento de Google Calendar del bloqueo", calendarErr);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  } catch (err) {
    console.error("delete-block error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
