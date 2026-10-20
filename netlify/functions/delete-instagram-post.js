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
  if (!payload.id) return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id." }) };

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("instagram_posts").delete().eq("id", payload.id);
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("delete-instagram-post error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo borrar." }) };
  }
};
