// Corrige el servicio (etiqueta) de un caso de "Antes y después" ya
// subido, sin tener que volver a subir las fotos.
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
    const { data, error } = await supabase
      .from("before_after_photos")
      .update({ label: (payload.label || "").trim() || null })
      .eq("id", payload.id)
      .select()
      .single();
    if (error || !data) return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };

    return { statusCode: 200, body: JSON.stringify({ pair: { id: data.id, label: data.label || "" } }) };
  } catch (err) {
    console.error("update-before-after error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar." }) };
  }
};
