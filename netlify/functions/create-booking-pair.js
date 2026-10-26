// Crea DOS citas juntas, de un solo envío, para promociones que exigen
// agendar en pareja (ej. "trae a tu amiga"): el código con requires_pair
// solo se puede aplicar aquí, nunca desde create-booking.js normal. La
// segunda persona queda en el horario justo después del de la primera
// (mismo servicio) — no al mismo tiempo exacto, porque solo se atiende a
// una clienta a la vez.
const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { slotsForDate, isTodayOrFuture, isWithinBookingWindow, rangesOverlap, toMinutes } = require("./_lib/slots");
const { getBlocksForDate } = require("./_lib/scheduleBlocks");
const { getOpeningForDate } = require("./_lib/scheduleOpenings");
const { generateReservationCode } = require("./_lib/reservationCode");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");
const { getLoyaltyStatus } = require("./_lib/loyalty");
const { parsePriceAmount } = require("./_lib/money");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(event) {
  const xff = event.headers && (event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"]);
  if (xff) return xff.split(",")[0].trim();
  return (event.headers && event.headers["x-nf-client-connection-ip"]) || null;
}

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

async function isRateLimited(supabase, ip) {
  if (!ip) return false;
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000).toISOString();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("created_ip", ip)
    .gte("created_at", since);
  if (error) return false;
  return (count || 0) >= RATE_LIMIT_MAX_ATTEMPTS;
}

function validPerson(person, label) {
  if (!person || typeof person !== "object") return `Faltan los datos de ${label}.`;
  if (!person.name || !person.name.trim()) return `Falta el nombre de ${label}.`;
  if (!person.phone || !person.phone.trim()) return `Falta el teléfono de ${label}.`;
  if (person.email && person.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email.trim())) {
    return `El correo de ${label} no es válido.`;
  }
  return null;
}

function blockedInRange(partialBlocks, start, end) {
  return partialBlocks.some((b) => rangesOverlap(start, end, toMinutes(b.start_time.slice(0, 5)), toMinutes(b.end_time.slice(0, 5))));
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

  const { serviceId, date, startTime, customerA, customerB, notes, promoCode, website } = payload;

  if (website) return badRequest("No se pudo completar la reserva.");
  if (!serviceId || typeof serviceId !== "string") return badRequest("Falta el servicio.");
  if (!date || !DATE_RE.test(date)) return badRequest("Fecha inválida.");
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return badRequest("Horario inválido.");
  const errA = validPerson(customerA, "la primera persona");
  if (errA) return badRequest(errA);
  const errB = validPerson(customerB, "tu amiga");
  if (errB) return badRequest(errB);
  if (!isTodayOrFuture(date)) return badRequest("La fecha debe ser hoy o una fecha futura.");
  if (!promoCode || !promoCode.trim()) return badRequest("Falta el código de la promoción.");

  try {
    const config = await loadConfig();
    const service = (config.services || []).find((s) => s.id === serviceId);
    if (!service) return badRequest("El servicio seleccionado no existe.");

    const holdMinutes = (config.booking && config.booking.holdMinutes) || 30;
    const maxAdvanceMonths = (config.booking && config.booking.maxAdvanceMonths) || 2;
    if (!isWithinBookingWindow(date, maxAdvanceMonths)) {
      return badRequest(`Solo se puede reservar con hasta ${maxAdvanceMonths} meses de anticipación.`);
    }

    const supabase = getServiceClient();
    const clientIp = getClientIp(event);
    if (await isRateLimited(supabase, clientIp)) {
      return badRequest("Hiciste demasiadas reservas en poco tiempo. Espera unos minutos o escríbenos por WhatsApp.");
    }

    const today = todayStr();
    const code = promoCode.trim().toUpperCase();
    const { data: promo, error: promoError } = await supabase
      .from("promotions")
      .select("*")
      .eq("code", code)
      .eq("kind", "campaign")
      .maybeSingle();
    if (promoError) throw promoError;
    if (!promo) return badRequest("No encontramos ese código.");
    if (!promo.requires_pair) return badRequest("Ese código no es de una promoción en pareja.");
    if (!promo.active) return badRequest("Ese código ya no está activo.");
    if (promo.starts_at && promo.starts_at > today) return badRequest("Ese código todavía no empieza a aplicar.");
    if (promo.ends_at && promo.ends_at < today) return badRequest("Ese código ya venció.");
    if (promo.max_redemptions != null && promo.redemptions_count + 2 > promo.max_redemptions) {
      return badRequest("Ese código ya alcanzó su límite de usos.");
    }

    const opening = await getOpeningForDate(supabase, date);
    const grid = slotsForDate(date, config.businessHours, service.duration, config.closedDates, service.fixedSlots, opening);
    const slotA = grid.find((s) => s.startTime === startTime);
    if (!slotA) return badRequest("Ese horario no está dentro del horario de atención.");
    const slotB = grid.find((s) => s.startTime === slotA.endTime);
    if (!slotB) {
      return badRequest("No hay un segundo horario disponible justo después para tu amiga. Elige una hora un poco más temprano.");
    }

    const { fullDayBlock, partialBlocks } = await getBlocksForDate(supabase, date);
    if (fullDayBlock) return badRequest("Ese día no está disponible para citas.");
    if (blockedInRange(partialBlocks, toMinutes(slotA.startTime), toMinutes(slotA.endTime))) {
      return badRequest("Ese horario no está disponible.");
    }
    if (blockedInRange(partialBlocks, toMinutes(slotB.startTime), toMinutes(slotB.endTime))) {
      return badRequest("El horario de tu amiga (justo después) no está disponible. Elige una hora un poco más temprano.");
    }

    await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("booking_date", date)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const now = new Date();
    const expiresAt = new Date(now.getTime() + holdMinutes * 60000);

    // Anticipo: si la promoción define un anticipo total para la pareja,
    // se reparte entre las dos citas (la primera se lleva el residuo si
    // no divide exacto); si no, cada cita cobra su anticipo normal.
    let depositA = service.depositAmount;
    let depositB = service.depositAmount;
    if (promo.pair_deposit_amount) {
      const half = Math.floor(promo.pair_deposit_amount / 2);
      depositA = promo.pair_deposit_amount - half;
      depositB = half;
    }

    const loyaltyA = await getLoyaltyStatus(supabase, config.loyalty, customerA.phone);
    const loyaltyB = await getLoyaltyStatus(supabase, config.loyalty, customerB.phone);

    function buildRow(person, slot, deposit, loyaltyStatus) {
      return {
        reservation_code: generateReservationCode(date),
        service_id: service.id,
        service_name: service.name,
        price_label: service.price,
        deposit_amount: deposit,
        total_amount: parsePriceAmount(service.price),
        customer_name: person.name.trim(),
        customer_phone: person.phone.trim(),
        customer_email: (person.email || "").trim() || null,
        notes: (notes || "").trim() || null,
        created_ip: clientIp,
        promo_code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        booking_date: date,
        start_time: `${slot.startTime}:00`,
        end_time: `${slot.endTime}:00`,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        reward_redemption: loyaltyStatus.hasReward,
      };
    }

    const rowA = buildRow(customerA, slotA, depositA, loyaltyA);
    const { data: dataA, error: errorA } = await supabase.from("bookings").insert(rowA).select().single();
    if (errorA) {
      if (errorA.code === UNIQUE_VIOLATION || errorA.code === EXCLUSION_VIOLATION) {
        return { statusCode: 409, body: JSON.stringify({ error: "slot_taken", message: "Justo se acaba de ocupar ese horario. Elige otro, por favor." }) };
      }
      throw errorA;
    }

    const rowB = buildRow(customerB, slotB, depositB, loyaltyB);
    rowB.paired_booking_id = dataA.id;
    const { data: dataB, error: errorB } = await supabase.from("bookings").insert(rowB).select().single();
    if (errorB) {
      // La cita de la primera persona ya quedó hecha pero la de su amiga
      // no cupo (alguien más tomó ese horario justo en medio) — se
      // deshace la primera para no dejar una reserva "suelta" sin pareja.
      await supabase.from("bookings").delete().eq("id", dataA.id);
      if (errorB.code === UNIQUE_VIOLATION || errorB.code === EXCLUSION_VIOLATION) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "slot_taken", message: "El horario de tu amiga se acaba de ocupar. Elige otra hora e inténtalo de nuevo." }),
        };
      }
      throw errorB;
    }

    await supabase.from("bookings").update({ paired_booking_id: dataB.id }).eq("id", dataA.id);

    try {
      await supabase
        .from("promo_redemptions")
        .insert([
          { promotion_id: promo.id, booking_id: dataA.id },
          { promotion_id: promo.id, booking_id: dataB.id },
        ]);
      await supabase.from("promotions").update({ redemptions_count: promo.redemptions_count + 2 }).eq("id", promo.id);
    } catch (codeTrackingErr) {
      console.error("No se pudo registrar el uso del código (pareja)", codeTrackingErr);
    }

    const ownerPhone = config.booking && config.booking.ownerNotificationPhone;
    if (ownerPhone) {
      for (const data of [dataA, dataB]) {
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
          console.error("No se pudo avisar por WhatsApp de la nueva cita (pareja)", notifyErr);
        }
      }
    }

    function toSummary(data) {
      return {
        reservationCode: data.reservation_code,
        customerName: data.customer_name,
        depositAmount: data.deposit_amount,
        startTime: data.start_time.slice(0, 5),
        endTime: data.end_time.slice(0, 5),
        id: data.id,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        serviceName: dataA.service_name,
        priceLabel: dataA.price_label,
        date: dataA.booking_date,
        holdMinutes,
        expiresAt: dataA.expires_at,
        bankTransfer: config.bankTransfer,
        whatsappNumber: config.whatsappNumber,
        promoCode: promo.code,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        totalDeposit: Number(dataA.deposit_amount) + Number(dataB.deposit_amount),
        a: toSummary(dataA),
        b: toSummary(dataB),
      }),
    };
  } catch (err) {
    console.error("create-booking-pair error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo crear la reserva, intenta de nuevo." }) };
  }
};
