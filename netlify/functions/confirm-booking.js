const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");
const { createCalendarEvent } = require("./_lib/googleCalendar");
const { loadConfig } = require("./_lib/config");
const { getLoyaltyStatus, last10 } = require("./_lib/loyalty");
const { notifyClient } = require("./_lib/notify");

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

    // Mejor esfuerzo: si falla Google Calendar, la cita ya quedó confirmada
    // en la base de datos de todas formas — no bloqueamos la confirmación
    // real por un problema del calendario.
    try {
      const calendarEvent = await createCalendarEvent(updated);
      await supabase.from("bookings").update({ calendar_event_id: calendarEvent.id }).eq("id", updated.id);
      updated.calendar_event_id = calendarEvent.id;
    } catch (calendarErr) {
      console.error("No se pudo crear el evento de Google Calendar", calendarErr);
    }

    // Mejor esfuerzo: revisa el estado de lealtad después de confirmar esta
    // visita y avisa a la clienta si es su primera cita o si acaba de
    // ganar su recompensa. Un fallo aquí no debe afectar la confirmación.
    try {
      const config = await loadConfig();
      const status = await getLoyaltyStatus(supabase, config.loyalty, updated.customer_phone);

      const { data: pref } = await supabase
        .from("client_preferences")
        .select("email, notify_channel")
        .eq("phone", last10(updated.customer_phone))
        .maybeSingle();

      if (status.visits === 1) {
        await notifyClient(pref, updated.customer_phone, {
          whatsappTemplate: "bienvenida_lealtad_origen",
          whatsappParams: [{ type: "text", text: updated.customer_name }],
          emailSubject: "¡Bienvenida al programa de lealtad de Origen!",
          emailHtml: `<p>Hola ${updated.customer_name}, esta es tu primera cita confirmada — a partir de ahora acumulas visitas para tu descuento de lealtad. Cada ${status.cycleSize} visitas confirmadas ganas ${status.discountPercent}% de descuento en tu siguiente cita.</p>`,
        });
      } else if (status.hasReward) {
        await notifyClient(pref, updated.customer_phone, {
          whatsappTemplate: "recompensa_lealtad_origen",
          whatsappParams: [
            { type: "text", text: updated.customer_name },
            { type: "text", text: String(status.discountPercent) },
          ],
          emailSubject: "¡Ganaste tu descuento de lealtad!",
          emailHtml: `<p>Hola ${updated.customer_name}, ¡completaste ${status.visits} visitas confirmadas! Tienes ${status.discountPercent}% de descuento disponible en tu próxima cita.</p>`,
        });
      }
    } catch (loyaltyErr) {
      console.error("No se pudo procesar el aviso de lealtad", loyaltyErr);
    }

    return { statusCode: 200, body: JSON.stringify({ booking: updated }) };
  } catch (err) {
    console.error("confirm-booking error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
