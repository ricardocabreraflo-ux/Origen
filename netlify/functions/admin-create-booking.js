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
const { requireSectionWrite } = require("./_lib/requireAdmin");
const { slotsForDate, isTodayOrFuture, isWithinBookingWindow, toMinutes, toHHMM, rangesOverlap } = require("./_lib/slots");
const { generateReservationCode } = require("./_lib/reservationCode");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");
const { getLoyaltyStatus } = require("./_lib/loyalty");
const { runPostConfirmSideEffects } = require("./_lib/confirmBooking");
const { parsePriceAmount } = require("./_lib/money");
const { getBlocksForDate } = require("./_lib/scheduleBlocks");
const { getOpeningForDate } = require("./_lib/scheduleOpenings");

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
    requireSectionWrite(context, "citas");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("JSON inválido.");
  }

  const {
    serviceId,
    date,
    startTime,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    paymentMethod,
    directEntry,
    totalAmount,
    durationMinutes,
    notifyLoyalty,
  } = payload;

  if (!serviceId || typeof serviceId !== "string") return badRequest("Falta el servicio.");
  if (!date || !DATE_RE.test(date)) return badRequest("Fecha inválida.");
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return badRequest("Horario inválido.");
  if (!customerName || !customerName.trim()) return badRequest("Falta el nombre.");
  if (!customerPhone || !customerPhone.trim()) return badRequest("Falta el teléfono.");
  const isPast = !isTodayOrFuture(date);
  // Solo el registro de "cita directa" puede llevar fecha pasada — es
  // para anotar citas que ya pasaron y no se habían capturado, no para
  // crear reservas nuevas con hold/depósito pendiente en el pasado.
  if (isPast && !directEntry) return badRequest("La fecha debe ser hoy o una fecha futura.");
  if (paymentMethod !== "cash" && paymentMethod !== "card" && paymentMethod !== "transfer") {
    return badRequest("La forma de pago debe ser 'cash', 'card' o 'transfer'.");
  }
  if (directEntry && totalAmount !== undefined && (!Number.isFinite(Number(totalAmount)) || Number(totalAmount) < 0)) {
    return badRequest("El monto debe ser un número mayor o igual a 0.");
  }
  if (directEntry && durationMinutes !== undefined && (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) <= 0)) {
    return badRequest("La duración debe ser un número de minutos mayor a 0.");
  }

  try {
    const config = await loadConfig();

    const service = (config.services || []).find((s) => s.id === serviceId);
    if (!service) return badRequest("El servicio seleccionado no existe.");

    const holdMinutes = (config.booking && config.booking.holdMinutes) || 30;
    const maxAdvanceMonths = (config.booking && config.booking.maxAdvanceMonths) || 2;

    if (!isPast && !isWithinBookingWindow(date, maxAdvanceMonths)) {
      return badRequest(`Solo se puede reservar con hasta ${maxAdvanceMonths} meses de anticipación.`);
    }

    const effectiveDuration = directEntry && durationMinutes ? Number(durationMinutes) : service.duration;

    const supabase = getServiceClient();

    let slot;
    if (directEntry) {
      // Registro directo: la hora la escribe la dueña a mano (no viene de
      // la cuadrícula de horarios), así que solo calculamos la hora de
      // fin según la duración — sin exigir que calce con un slot de 30 min.
      slot = { startTime, endTime: toHHMM(toMinutes(startTime) + effectiveDuration) };
    } else {
      const opening = await getOpeningForDate(supabase, date);
      const grid = slotsForDate(date, config.businessHours, effectiveDuration, config.closedDates, service.fixedSlots, opening);
      slot = grid.find((s) => s.startTime === startTime);
      if (!slot) return badRequest("Ese horario no está dentro del horario de atención.");
    }

    // El registro directo puede saltarse un bloqueo a propósito (es una
    // anotación de algo que ya pasó); el flujo normal de cita manual no.
    if (!directEntry) {
      const { fullDayBlock, partialBlocks } = await getBlocksForDate(supabase, date);
      if (fullDayBlock) return badRequest("Ese día no está disponible para citas.");
      const slotStart = toMinutes(slot.startTime);
      const slotEnd = toMinutes(slot.endTime);
      const blockedByRange = partialBlocks.some((b) =>
        rangesOverlap(slotStart, slotEnd, toMinutes(b.start_time.slice(0, 5)), toMinutes(b.end_time.slice(0, 5)))
      );
      if (blockedByRange) return badRequest("Ese horario no está disponible.");
    }

    await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("booking_date", date)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    // Una cita con fecha pasada ya sucedió — no tiene sentido dejarla
    // "pendiente" esperando un depósito que ya se resolvió en su momento.
    // Efectivo y tarjeta (terminal en el estudio) se cobran ahí mismo, así
    // que ambos confirman la cita de inmediato igual que antes solo hacía
    // "cash" — la diferencia entre los dos queda en payment_method, para
    // que Finanzas/Reportes los distinga.
    const isPaidNow = paymentMethod === "cash" || paymentMethod === "card" || isPast;
    const now = new Date();
    const loyaltyStatus = await getLoyaltyStatus(supabase, config.loyalty, customerPhone);
    const effectiveTotalAmount =
      directEntry && totalAmount !== undefined ? Number(totalAmount) : parsePriceAmount(service.price);

    const row = {
      reservation_code: generateReservationCode(date),
      service_id: service.id,
      service_name: service.name,
      price_label: service.price,
      deposit_amount: service.depositAmount,
      total_amount: effectiveTotalAmount,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: (customerEmail || "").trim() || null,
      notes: (notes || "").trim() || null,
      booking_date: date,
      start_time: `${slot.startTime}:00`,
      end_time: `${slot.endTime}:00`,
      status: isPaidNow ? "confirmed" : "pending",
      expires_at: new Date(now.getTime() + holdMinutes * 60000).toISOString(),
      confirmed_at: isPaidNow ? now.toISOString() : null,
      payment_method: isPast ? "cash" : paymentMethod === "card" ? "mercado_pago" : paymentMethod === "cash" ? "cash" : "bank_transfer",
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
    // confirmación (evento de Google Calendar + aviso de bienvenida/premio
    // de lealtad) — salvo que sea un registro retroactivo (fecha pasada),
    // donde no tiene sentido crear un evento de Calendar para algo que ya
    // pasó. El aviso de lealtad para estos casos se manda aparte, más
    // abajo, con el estado actualizado en vez del mensaje de bienvenida/premio.
    if (isPaidNow && !isPast) {
      try {
        await runPostConfirmSideEffects(supabase, data);
      } catch (sideEffectErr) {
        console.error("No se pudieron correr los efectos de confirmación", sideEffectErr);
      }
    }

    // Mejor esfuerzo: avisarle a la CLIENTA por WhatsApp. Requiere Meta
    // configurado y la plantilla correspondiente aprobada — si aún no
    // está listo, la cita de todas formas ya quedó creada en el sistema.
    // Un registro retroactivo no manda la confirmación de cita (ya pasó),
    // pero sí le avisa su estado de lealtad actualizado, para que quede
    // informada aunque la cita no se haya agendado por el sistema.
    try {
      if (isPast) {
        if (notifyLoyalty !== false) {
          const updatedStatus = await getLoyaltyStatus(supabase, config.loyalty, data.customer_phone);
          const statusTail = updatedStatus.hasReward
            ? `¡Ya tienes ${updatedStatus.discountPercent}% de descuento disponible!`
            : `Te ${updatedStatus.remaining === 1 ? "falta" : "faltan"} ${updatedStatus.remaining} visita${updatedStatus.remaining === 1 ? "" : "s"} más para tu ${updatedStatus.discountPercent}% de descuento.`;

          await sendWhatsAppTemplate(data.customer_phone, "estado_lealtad_origen", "es_MX", [
            {
              type: "body",
              parameters: [
                { type: "text", text: data.customer_name },
                { type: "text", text: String(updatedStatus.progress) },
                { type: "text", text: String(updatedStatus.cycleSize) },
                { type: "text", text: statusTail },
              ],
            },
          ]);
        }
        // Si notifyLoyalty es false, no se manda ningún WhatsApp — nunca
        // la confirmación de cita, que no aplica a una fecha ya pasada.
      } else if (isPaidNow) {
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
