// Para citas que la administradora agenda directamente (clienta que llama
// o llega en persona en vez de reservar desde el sitio). A diferencia de
// create-booking.js (público), aquí:
//   - si paymentMethod es "cash", la cita queda CONFIRMADA de una vez
//     (ya se cobró en persona) y se sincroniza con Google Calendar igual
//     que cualquier confirmación.
//   - si paymentMethod es "transfer", la cita queda "pending" igual que
//     una reserva normal, y se le manda a la CLIENTA una plantilla de
//     WhatsApp pidiéndole su comprobante de depósito.
const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");
const { slotsForDate, isTodayOrFuture, isWithinBookingWindow } = require("./_lib/slots");
const { generateReservationCode } = require("./_lib/reservationCode");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");
const { getLoyaltyStatus } = require("./_lib/loyalty");
const { runPostConfirmSideEffects } = require("./_lib/confirmBooking");
const { parsePriceAmount } = require("./_lib/money");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

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
    return badRequest("JSON inválido.");
  }

  const { serviceId, date, startTime, customerName, customerPhone, notes, paymentMethod } = payload;

  if (!serviceId || typeof serviceId !== "string") return badRequest("Falta el servicio.");
  if (!date || !DATE_RE.test(date)) return badRequest("Fecha inválida.");
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return badRequest("Horario inválido.");
  if (!customerName || !customerName.trim()) return badRequest("Falta el nombre.");
  if (!customerPhone || !customerPhone.trim()) return badRequest("Falta el teléfono.");
  if (!isTodayOrFuture(date)) return badRequest("La fecha debe ser hoy o una fecha futura.");
  if (paymentMethod !== "cash" && paymentMethod !== "transfer") {
    return badRequest("La forma de pago debe ser 'cash' o 'transfer'.");
  }

  try {
    const config = await loadConfig();

    const service = (config.services || []).find((s) => s.id === serviceId);
    if (!service) return badRequest("El servicio seleccionado no existe.");

    const holdMinutes = (config.booking && config.booking.holdMinutes) || 30;
    const maxAdvanceMonths = (config.booking && config.booking.maxAdvanceMonths) || 2;

    if (!isWithinBookingWindow(date, maxAdvanceMonths)) {
      return badRequest(`Solo se puede reservar con hasta ${maxAdvanceMonths} meses de anticipación.`);
    }

    const grid = slotsForDate(date, config.businessHours, service.duration, config.closedDates);
    const slot = grid.find((s) => s.startTime === startTime);
    if (!slot) return badRequest("Ese horario no está dentro del horario de atención.");

    const supabase = getServiceClient();

    await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("booking_date", date)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const isCash = paymentMethod === "cash";
    const now = new Date();
    const loyaltyStatus = await getLoyaltyStatus(supabase, config.loyalty, customerPhone);

    const row = {
      reservation_code: generateReservationCode(date),
      service_id: service.id,
      service_name: service.name,
      price_label: service.price,
      deposit_amount: service.depositAmount,
      total_amount: parsePriceAmount(service.price),
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      notes: (notes || "").trim() || null,
      booking_date: date,
      start_time: `${slot.startTime}:00`,
      end_time: `${slot.endTime}:00`,
      status: isCash ? "confirmed" : "pending",
      expires_at: new Date(now.getTime() + holdMinutes * 60000).toISOString(),
      confirmed_at: isCash ? now.toISOString() : null,
      payment_method: isCash ? "cash" : "bank_transfer",
      reward_redemption: loyaltyStatus.hasReward,
    };

    const { data, error } = await supabase.from("bookings").insert(row).select().single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION || error.code === EXCLUSION_VIOLATION) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "slot_taken", message: "Ese horario ya está ocupado por otra cita." }),
        };
      }
      throw error;
    }

    // Si ya se cobró en efectivo, corre lo mismo que cualquier
    // confirmación (Google Calendar + avisos de lealtad).
    if (isCash) {
      try {
        await runPostConfirmSideEffects(supabase, data);
      } catch (sideEffectErr) {
        console.error("No se pudieron correr los efectos de confirmación", sideEffectErr);
      }
    }

    // Mejor esfuerzo: avisarle a la CLIENTA por WhatsApp. Requiere Meta
    // configurado y la plantilla correspondiente aprobada — si aún no
    // está listo, la cita de todas formas ya quedó creada en el sistema.
    try {
      if (isCash) {
        await sendWhatsAppTemplate(data.customer_phone, "confirmacion_cita_pagada_origen", "es_MX", [
          {
            type: "body",
            parameters: [
              { type: "text", text: data.customer_name },
              { type: "text", text: data.service_name },
              { type: "text", text: data.booking_date },
              { type: "text", text: data.start_time.slice(0, 5) },
            ],
          },
        ]);
      } else {
        await sendWhatsAppTemplate(data.customer_phone, "confirmacion_cita_manual_origen", "es_MX", [
          {
            type: "body",
            parameters: [
              { type: "text", text: data.customer_name },
              { type: "text", text: data.service_name },
              { type: "text", text: data.booking_date },
              { type: "text", text: data.start_time.slice(0, 5) },
              { type: "text", text: `$${data.deposit_amount} MXN` },
            ],
          },
        ]);
      }
    } catch (notifyErr) {
      console.error("No se pudo avisar por WhatsApp a la clienta", notifyErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ booking: data }),
    };
  } catch (err) {
    console.error("admin-create-booking error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "No se pudo crear la reserva, intenta de nuevo." }),
    };
  }
};
