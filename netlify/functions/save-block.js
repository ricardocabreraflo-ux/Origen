// Crea un bloqueo de calendario: un día completo (sin startTime/endTime) o
// solo un rango de horas dentro de un día que por lo demás está abierto.
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

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

  const { date, startTime, endTime, label } = payload;
  if (!date || !DATE_RE.test(date)) return badRequest("Falta la fecha del bloqueo.");

  const hasRange = startTime || endTime;
  let row = { block_date: date, start_time: null, end_time: null, label: (label || "").trim() || null };

  if (hasRange) {
    if (!startTime || !TIME_RE.test(startTime) || !endTime || !TIME_RE.test(endTime)) {
      return badRequest("La hora de inicio y fin deben tener formato HH:MM.");
    }
    if (startTime >= endTime) return badRequest("La hora de inicio debe ser antes que la hora de fin.");
    row.start_time = startTime;
    row.end_time = endTime;
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("schedule_blocks").insert(row).select().single();
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ block: data }) };
  } catch (err) {
    console.error("save-block error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar el bloqueo." }) };
  }
};
