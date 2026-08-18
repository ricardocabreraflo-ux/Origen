const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { slotsForDate, isTodayOrFuture, isWithinBookingWindow, rangesOverlap, toMinutes } = require("./_lib/slots");
const { getBlocksForDate } = require("./_lib/scheduleBlocks");
const { generateReservationCode } = require("./_lib/reservationCode");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");
const { getLoyaltyStatus } = require("./_lib/loyalty");
const { parsePriceAmount } = require("./_lib/money");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01"; // traslape detectado por la restricción de rango en Postgres

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("JSON inválido.");
  }

  const { serviceId, date, startTime, customerName, customerPhone, customerEmail, notes } = payload;

  if (!serviceId || typeof serviceId !== "string") return badRequest("Falta el servicio.");
  if (!date || !DATE_RE.test(date)) return badRequest("Fecha inválida.");
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return badRequest("Horario inválido.");
  if (!customerName || !customerName.trim()) return badRequest("Falta el nombre.");
  if (!customerPhone || !customerPhone.trim()) return badRequest("Falta el teléfono.");
  if (customerEmail && customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    return badRequest("El correo no es válido.");
  }
  if (!isTodayOrFuture(date)) return badRequest("La fecha debe ser hoy o una fecha futura.");

  try {
    const config = await loadConfig();

    // Nunca confiar en precio/anticipo que venga del cliente: se busca en
    // la fuente de verdad (data/config.json) del lado del servidor.
    const service = (config.services || []).find((s) => s.id === serviceId);
    if (!service) return badRequest("El servicio seleccionado no existe.");

    const holdMinutes = (config.booking && config.booking.holdMinutes) || 30;
    const maxAdvanceMonths = (config.booking && config.booking.maxAdvanceMonths) || 2;

    if (!isWithinBookingWindow(date, maxAdvanceMonths)) {
      return badRequest(`Solo se puede reservar con hasta ${maxAdvanceMonths} meses de anticipación.`);
    }

    const grid = slotsForDate(date, config.businessHours, service.duration, config.closedDates, service.fixedSlots);
    const slot = grid.find((s) => s.startTime === startTime);
    if (!slot) return badRequest("Ese horario no está dentro del horario de atención.");

    const supabase = getServiceClient();

    const { fullDayBlock, partialBlocks } = await getBlocksForDate(supabase, date);
    if (fullDayBlock) return badRequest("Ese día no está disponible para citas.");
    const slotStart = toMinutes(slot.startTime);
    const slotEnd = toMinutes(slot.endTime);
    const blockedByRange = partialBlocks.some((b) =>
      rangesOverlap(slotStart, slotEnd, toMinutes(b.start_time.slice(0, 5)), toMinutes(b.end_time.slice(0, 5)))
    );
    if (blockedByRange) return badRequest("Ese horario no está disponible.");

    // Libera pendientes vencidos de ese día antes de intentar reservar.
    await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("booking_date", date)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const now = new Date();
    const expiresAt = new Date(now.getTime() + holdMinutes * 60000);

    // Si ya completó su ciclo de visitas, esta cita se marca como canje de
    // lealtad para que se vea marcada en el panel y la administradora la
    // revise antes de confirmar el depósito.
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
      customer_email: (customerEmail || "").trim() || null,
      notes: (notes || "").trim() || null,
      booking_date: date,
      start_time: `${slot.startTime}:00`,
      end_time: `${slot.endTime}:00`,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      reward_redemption: loyaltyStatus.hasReward,
    };

    const { data, error } = await supabase.from("bookings").insert(row).select().single();

    if (error) {
      // La restricción de exclusión sobre rangos de tiempo (ver
      // supabase/schema.sql) es lo que de verdad evita que dos personas
      // aparten horarios que se traslapen, incluso si ambas solicitudes
      // llegan al mismo tiempo — sin importar que ahora los servicios
      // duren distinto.
      if (error.code === UNIQUE_VIOLATION || error.code === EXCLUSION_VIOLATION) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            error: "slot_taken",
            message: "Justo se acaba de ocupar ese horario. Elige otro, por favor.",
          }),
        };
      }
      throw error;
    }

    // Mejor esfuerzo: la reserva ya quedó hecha en la base de datos, así
    // que un fallo al avisarte por WhatsApp no debe tumbar la reserva de
    // la clienta. Requiere tener configurado WHATSAPP_ACCESS_TOKEN /
    // WHATSAPP_PHONE_NUMBER_ID (ver netlify/functions/_lib/whatsapp.js).
    const ownerPhone = config.booking && config.booking.ownerNotificationPhone;
    if (ownerPhone) {
      try {
        await sendWhatsAppTemplate(ownerPhone, "nueva_cita_origen", "es_MX", [
          {
            type: "body",
            parameters: [
              { type: "text", text: data.service_name },
              { type: "text", text: data.customer_name },
              { type: "text", text: data.customer_phone },
              { type: "text", text: data.booking_date },
              { type: "text", text: data.start_time.slice(0, 5) },
              { type: "text", text: `$${data.deposit_amount} MXN` },
            ],
          },
        ]);
      } catch (notifyErr) {
        console.error("No se pudo avisar por WhatsApp de la nueva cita", notifyErr);
      }

      if (data.reward_redemption) {
        try {
          await sendWhatsAppTemplate(ownerPhone, "canje_lealtad_origen", "es_MX", [
            {
              type: "body",
              parameters: [
                { type: "text", text: data.customer_name },
                { type: "text", text: data.booking_date },
                { type: "text", text: data.start_time.slice(0, 5) },
              ],
            },
          ]);
        } catch (notifyErr) {
          console.error("No se pudo avisar por WhatsApp del canje de lealtad", notifyErr);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        reservationCode: data.reservation_code,
        serviceName: data.service_name,
        priceLabel: data.price_label,
        depositAmount: data.deposit_amount,
        id: data.id,
        date: data.booking_date,
        startTime: data.start_time.slice(0, 5),
        endTime: data.end_time.slice(0, 5),
        holdMinutes,
        expiresAt: data.expires_at,
        bankTransfer: config.bankTransfer,
        whatsappNumber: config.whatsappNumber,
        rewardRedemption: data.reward_redemption,
        loyaltyDiscountPercent: loyaltyStatus.discountPercent,
      }),
    };
  } catch (err) {
    console.error("create-booking error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "No se pudo crear la reserva, intenta de nuevo." }),
    };
  }
};
