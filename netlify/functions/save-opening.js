// Crea (o reemplaza, si ya existía una para la misma fecha) una apertura
// especial de horario: abre un día normalmente cerrado, o cambia el
// horario de un día ya abierto, para un rango de horas específico.
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
  if (!date || !DATE_RE.test(date)) return badRequest("Falta la fecha de la apertura.");
  if (!startTime || !TIME_RE.test(startTime) || !endTime || !TIME_RE.test(endTime)) {
    return badRequest("La hora de inicio y fin deben tener formato HH:MM.");
  }
  if (startTime >= endTime) return badRequest("La hora de inicio debe ser antes que la hora de fin.");

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("schedule_openings")
      .upsert(
        { opening_date: date, start_time: startTime, end_time: endTime, label: (label || "").trim() || null },
        { onConflict: "opening_date" }
      )
      .select()
      .single();
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ opening: data }) };
  } catch (err) {
    console.error("save-opening error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar la apertura." }) };
  }
};
