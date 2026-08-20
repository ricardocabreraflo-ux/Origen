// Crea uno o varios bloqueos de calendario: un día completo (sin
// startTime/endTime) o solo un rango de horas dentro de un día que por lo
// demás está abierto. Si viene endDate, crea un bloqueo por cada día entre
// date y endDate (para vacaciones o cierres de varios días). Cada bloqueo
// también se sincroniza como evento en Google Calendar (mejor esfuerzo: si
// falla, el bloqueo igual queda guardado y sigue funcionando en el sitio).
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");
const { parseLocalDate } = require("./_lib/slots");
const { toISODate, addDays } = require("./_lib/period");
const { createBlockEvent } = require("./_lib/googleCalendar");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_RANGE_DAYS = 60;

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

  const { date, endDate, startTime, endTime, label } = payload;
  if (!date || !DATE_RE.test(date)) return badRequest("Falta la fecha del bloqueo.");
  if (endDate && !DATE_RE.test(endDate)) return badRequest("Fecha final inválida.");

  const hasRange = startTime || endTime;
  if (hasRange) {
    if (!startTime || !TIME_RE.test(startTime) || !endTime || !TIME_RE.test(endTime)) {
      return badRequest("La hora de inicio y fin deben tener formato HH:MM.");
    }
    if (startTime >= endTime) return badRequest("La hora de inicio debe ser antes que la hora de fin.");
  }

  const dates = [date];
  if (endDate && endDate > date) {
    let cursor = parseLocalDate(date);
    const last = parseLocalDate(endDate);
    if ((last - cursor) / 86400000 > MAX_RANGE_DAYS) {
      return badRequest(`El rango no puede ser mayor a ${MAX_RANGE_DAYS} días.`);
    }
    dates.length = 0;
    while (cursor <= last) {
      dates.push(toISODate(cursor));
      cursor = addDays(cursor, 1);
    }
  } else if (endDate && endDate < date) {
    return badRequest("La fecha final debe ser igual o posterior a la fecha inicial.");
  }

  const cleanLabel = (label || "").trim() || null;

  try {
    const supabase = getServiceClient();
    const created = [];

    for (const d of dates) {
      const row = { block_date: d, start_time: hasRange ? startTime : null, end_time: hasRange ? endTime : null, label: cleanLabel };
      const { data, error } = await supabase.from("schedule_blocks").insert(row).select().single();
      if (error) throw error;

      try {
        const calendarEvent = await createBlockEvent(data);
        await supabase.from("schedule_blocks").update({ calendar_event_id: calendarEvent.id }).eq("id", data.id);
        data.calendar_event_id = calendarEvent.id;
      } catch (calendarErr) {
        console.error("No se pudo crear el evento de Google Calendar para el bloqueo", calendarErr);
      }

      created.push(data);
    }

    return { statusCode: 200, body: JSON.stringify({ blocks: created }) };
  } catch (err) {
    console.error("save-block error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar el bloqueo." }) };
  }
};
