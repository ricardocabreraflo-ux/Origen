const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireSectionWrite(context, "contenido");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized", message: err.message }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "JSON inválido." }) };
  }
  const { orderedIds } = payload;
  if (!Array.isArray(orderedIds) || !orderedIds.length || orderedIds.some((id) => typeof id !== "string")) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el orden." }) };
  }

  try {
    const supabase = getServiceClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase.from("gallery_photos").update({ sort_order: i }).eq("id", orderedIds[i]);
      if (error) throw error;
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("reorder-gallery error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar el orden." }) };
  }
};
