const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireAdmin(context);
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

  try {
    const supabase = getServiceClient();

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", payload.id)
      .single();

    if (fetchError || !booking) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    if (booking.status === "confirmed") {
      return { statusCode: 200, body: JSON.stringify({ booking, note: "Ya estaba confirmada." }) };
    }

    if (booking.status !== "pending") {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "invalid_status", message: `No se puede confirmar: estado actual "${booking.status}".` }),
      };
    }

    if (new Date(booking.expires_at).getTime() < Date.now()) {
      await supabase.from("bookings").update({ status: "expired" }).eq("id", payload.id);
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "expired", message: "El plazo de 30 minutos ya venció y el horario se liberó." }),
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", payload.id)
      .eq("status", "pending") // evita condiciones de carrera con dos confirmaciones a la vez
      .select()
      .single();

    if (updateError || !updated) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "conflict", message: "La cita cambió de estado, actualiza la página." }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ booking: updated }) };
  } catch (err) {
    console.error("confirm-booking error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
