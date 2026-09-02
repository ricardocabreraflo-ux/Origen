// Edita los datos de una cita ya creada (servicio, fecha, hora, datos de la
// clienta, notas y monto) — a diferencia de admin-create-booking.js, aquí
// no se crea un registro nuevo ni se manda ningún WhatsApp; solo se
// corrige la información. Si la cita ya tenía evento en Google Calendar,
// se actualiza ese mismo evento (no se crea uno nuevo).
const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");
const { toMinutes, toHHMM } = require("./_lib/slots");
const { parsePriceAmount } = require("./_lib/money");
const { updateCalendarEvent } = require("./_lib/googleCalendar");

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

  const {
    id,
    serviceId,
    date,
    startTime,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    totalAmount,
    durationMinutes,
  } = payload;

  if (!id) return badRequest("Falta el id de la cita.");
  if (!serviceId || typeof serviceId !== "string") return badRequest("Falta el servicio.");
  if (!date || !DATE_RE.test(date)) return badRequest("Fecha inválida.");
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return badRequest("Horario inválido.");
  if (!customerName || !customerName.trim()) return badRequest("Falta el nombre.");
  if (!customerPhone || !customerPhone.trim()) return badRequest("Falta el teléfono.");
  if (customerEmail && customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    return badRequest("El correo no es válido.");
  }
  if (totalAmount !== undefined && totalAmount !== null && (!Number.isFinite(Number(totalAmount)) || Number(totalAmount) < 0)) {
    return badRequest("El monto debe ser un número mayor o igual a 0.");
  }
  if (durationMinutes !== undefined && (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) <= 0)) {
    return badRequest("La duración debe ser un número de minutos mayor a 0.");
  }

  try {
    const config = await loadConfig();
    const service = (config.services || []).find((s) => s.id === serviceId);
    if (!service) return badRequest("El servicio seleccionado no existe.");

    const effectiveDuration = durationMinutes ? Number(durationMinutes) : service.duration;
    const endTime = toHHMM(toMinutes(startTime) + effectiveDuration);
    const effectiveTotalAmount =
      totalAmount !== undefined && totalAmount !== null ? Number(totalAmount) : parsePriceAmount(service.price);

    const supabase = getServiceClient();

    const { data: existing, error: fetchError } = await supabase.from("bookings").select("*").eq("id", id).single();
    if (fetchError || !existing) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    // price_label es la referencia contra la que se calcula el % de
    // descuento en el panel — solo debe cambiar si esta edición reasigna
    // la cita a otro servicio. Si el servicio sigue siendo el mismo, se
    // deja el precio que ya tenía guardado, aunque el precio de lista del
    // servicio haya subido o bajado después — si no, cualquier edición sin
    // relación (corregir un teléfono, una nota) inflaría el % de
    // descuento mostrado sin que se haya tocado el monto cobrado.
    const serviceChanged = existing.service_id !== service.id;
    const priceLabel = serviceChanged || !existing.price_label ? service.price : existing.price_label;

    const row = {
      service_id: service.id,
      service_name: service.name,
      price_label: priceLabel,
      deposit_amount: service.depositAmount,
      total_amount: effectiveTotalAmount,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: (customerEmail || "").trim() || null,
      notes: (notes || "").trim() || null,
      booking_date: date,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
    };

    const { data: updated, error } = await supabase.from("bookings").update(row).eq("id", id).select().single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION || error.code === EXCLUSION_VIOLATION) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "slot_taken", message: "Ese horario ya está ocupado por otra cita." }),
        };
      }
      throw error;
    }

    if (existing.calendar_event_id) {
      try {
        await updateCalendarEvent(existing.calendar_event_id, updated);
      } catch (calendarErr) {
        console.error("No se pudo actualizar el evento de Google Calendar", calendarErr);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ booking: updated }) };
  } catch (err) {
    console.error("edit-booking error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar la cita." }) };
  }
};
