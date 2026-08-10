// Borra un gasto por completo (para errores de captura). Para un gasto
// fijo que ya no aplica pero sí aplicó en el pasado, es mejor
// desactivarlo con save-expense.js (active:false, end_date:hoy) para no
// perder el historial de los meses en que sí contaba.
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

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
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request" }) };
  }
  if (!payload.id) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id del gasto." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: deleted, error } = await supabase.from("expenses").delete().eq("id", payload.id).select().single();

    if (error || !deleted) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  } catch (err) {
    console.error("delete-expense error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
