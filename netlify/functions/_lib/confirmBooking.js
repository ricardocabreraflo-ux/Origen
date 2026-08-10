// Lógica compartida para pasar una cita a "confirmed": la usan la
// confirmación manual de la administradora (confirm-booking.js), la
// confirmación automática por pago con tarjeta (mp-webhook.js), y la
// reactivación de una cita vencida cuyo depósito sí llegó
// (reactivate-booking.js) — para no duplicar la sincronización con
// Google Calendar ni los avisos de lealtad.

const { createCalendarEvent } = require("./googleCalendar");
const { loadConfig } = require("./config");
const { getLoyaltyStatus, last10 } = require("./loyalty");
const { notifyClient } = require("./notify");

class ConfirmBookingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Mejor esfuerzo: si falla Google Calendar o el aviso de lealtad, la cita
// ya quedó confirmada en la base de datos de todas formas — un problema
// aquí no debe deshacer la confirmación real.
async function runPostConfirmSideEffects(supabase, updated) {
  try {
    const calendarEvent = await createCalendarEvent(updated);
    await supabase.from("bookings").update({ calendar_event_id: calendarEvent.id }).eq("id", updated.id);
    updated.calendar_event_id = calendarEvent.id;
  } catch (calendarErr) {
    console.error("No se pudo crear el evento de Google Calendar", calendarErr);
  }

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
}

async function confirmBookingById(supabase, id, extraFields = {}) {
  const { data: booking, error: fetchError } = await supabase.from("bookings").select("*").eq("id", id).single();
  if (fetchError || !booking) throw new ConfirmBookingError("not_found", "No se encontró la cita.");

  if (booking.status === "confirmed") {
    return { booking, alreadyConfirmed: true };
  }
  if (booking.status !== "pending") {
    throw new ConfirmBookingError("invalid_status", `No se puede confirmar: estado actual "${booking.status}".`);
  }
  if (new Date(booking.expires_at).getTime() < Date.now()) {
    await supabase.from("bookings").update({ status: "expired" }).eq("id", id);
    throw new ConfirmBookingError("expired", "El plazo de 30 minutos ya venció y el horario se liberó.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString(), ...extraFields })
    .eq("id", id)
    .eq("status", "pending") // evita condiciones de carrera con dos confirmaciones a la vez
    .select()
    .single();

  if (updateError || !updated) {
    throw new ConfirmBookingError("conflict", "La cita cambió de estado, actualiza la página.");
  }

  await runPostConfirmSideEffects(supabase, updated);
  return { booking: updated, alreadyConfirmed: false };
}

// Para cuando el horario se venció por no entrar a tiempo al panel, pero
// el depósito sí llegó y la administradora quiere reactivarla. Como el
// horario pudo haber quedado libre mientras estaba vencida, la restricción
// de traslapes de Postgres (bookings_no_overlap) es la que de verdad
// decide si todavía se puede reactivar o si alguien más ya lo tomó.
async function reactivateExpiredBooking(supabase, id) {
  const { data: booking, error: fetchError } = await supabase.from("bookings").select("*").eq("id", id).single();
  if (fetchError || !booking) throw new ConfirmBookingError("not_found", "No se encontró la cita.");

  if (booking.status === "confirmed") {
    return { booking, alreadyConfirmed: true };
  }
  if (booking.status !== "expired") {
    throw new ConfirmBookingError("invalid_status", `Solo se pueden reactivar citas vencidas (estado actual: "${booking.status}").`);
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "expired")
    .select()
    .single();

  if (updateError || !updated) {
    if (updateError && (updateError.code === "23505" || updateError.code === "23P01")) {
      throw new ConfirmBookingError("conflict", "Ese horario ya se ocupó con otra cita mientras estaba vencida — ya no se puede reactivar.");
    }
    throw new ConfirmBookingError("conflict", "La cita cambió de estado, actualiza la página.");
  }

  await runPostConfirmSideEffects(supabase, updated);
  return { booking: updated, alreadyConfirmed: false };
}

module.exports = { confirmBookingById, reactivateExpiredBooking, ConfirmBookingError };
