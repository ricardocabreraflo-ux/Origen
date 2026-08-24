const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { slotsForDate, isTodayOrFuture, isWithinBookingWindow } = require("./_lib/slots");
const { generateReservationCode } = require("./_lib/reservationCode");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");
const { getLoyaltyStatus, last10 } = require("./_lib/loyalty");
const { parsePriceAmount } = require("./_lib/money");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01"; // traslape detectado por la restricción de rango en Postgres

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

class CodeError extends Error {}

// Resuelve el código de descuento/referido que la clienta escribió al
// agendar. Nunca confía en lo que ya validó check-promo-code.js del lado
// del cliente — vuelve a checar todo aquí, que es lo único que de verdad
// aplica el descuento y cuenta el uso.
async function resolvePromoOrReferralCode(supabase, rawCode, customerPhone) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { kind: "none" };

  const today = todayStr();

  const { data: promo, error: promoError } = await supabase
    .from("promotions")
    .select("*")
    .eq("code", code)
    .eq("kind", "campaign")
    .maybeSingle();
  if (promoError) throw promoError;

  if (promo) {
    if (!promo.active) throw new CodeError("Ese código ya no está activo.");
    if (promo.starts_at && promo.starts_at > today) throw new CodeError("Ese código todavía no empieza a aplicar.");
    if (promo.ends_at && promo.ends_at < today) throw new CodeError("Ese código ya venció.");
    if (promo.max_redemptions != null && promo.redemptions_count >= promo.max_redemptions) {
      throw new CodeError("Ese código ya alcanzó su límite de usos.");
    }
    return { kind: "promotion", promotion: promo };
  }

  const { data: referral, error: referralError } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (referralError) throw referralError;

  if (referral) {
    const targetPhone = last10(customerPhone);
    if (referral.owner_phone === targetPhone) {
      throw new CodeError("No puedes usar tu propio código de referido.");
    }

    // El código de referido solo aplica en la primera cita de la
    // clienta referida — se revisa contra TODAS sus citas anteriores,
    // sin importar el estado, para que no se pueda reintentar con una
    // cita cancelada o vencida de por medio.
    const { data: priorBookings, error: priorError } = await supabase.from("bookings").select("customer_phone");
    if (priorError) throw priorError;
    const hasPriorBooking = (priorBookings || []).some((b) => last10(b.customer_phone) === targetPhone);
    if (hasPriorBooking) {
      throw new CodeError("El código de referido solo aplica en tu primera cita en Origen.");
    }

    return { kind: "referral", referral };
  }

  throw new CodeError("No encontramos ese código.");
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

  const { serviceId, date, startTime, customerName, customerPhone, customerEmail, notes, promoCode } = payload;

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

    const grid = slotsForDate(date, config.businessHours, service.duration, config.closedDates);
    const slot = grid.find((s) => s.startTime === startTime);
    if (!slot) return badRequest("Ese horario no está dentro del horario de atención.");

    const supabase = getServiceClient();

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

    // Código de descuento o de referido, si la clienta escribió uno. Se
    // valida aquí de verdad (nunca se confía en lo que ya haya validado
    // check-promo-code.js del lado del cliente).
    let codeResult;
    try {
      codeResult = await resolvePromoOrReferralCode(supabase, promoCode, customerPhone);
    } catch (err) {
      if (err instanceof CodeError) return badRequest(err.message);
      throw err;
    }

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
      promo_code: codeResult.kind !== "none" ? (codeResult.promotion || codeResult.referral).code : null,
      discount_type: codeResult.kind === "promotion" ? codeResult.promotion.discount_type : null,
      discount_value: codeResult.kind === "promotion" ? codeResult.promotion.discount_value : null,
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

    // La reserva ya quedó hecha — ahora se registra el uso del código.
    // Si esto llegara a fallar, la cita ya existe de todas formas; el
    // conteo de usos es secundario frente a la reserva en sí.
    try {
      if (codeResult.kind === "promotion") {
        await supabase.from("promo_redemptions").insert({ promotion_id: codeResult.promotion.id, booking_id: data.id });
        await supabase
          .from("promotions")
          .update({ redemptions_count: codeResult.promotion.redemptions_count + 1 })
          .eq("id", codeResult.promotion.id);
      } else if (codeResult.kind === "referral") {
        await supabase
          .from("referral_redemptions")
          .insert({ referral_code_id: codeResult.referral.id, referred_booking_id: data.id });
      }
    } catch (codeTrackingErr) {
      console.error("No se pudo registrar el uso del código", codeTrackingErr);
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
        promoCode: data.promo_code,
        discountType: data.discount_type,
        discountValue: data.discount_value,
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
