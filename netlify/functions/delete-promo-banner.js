const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");
const { isBucketFile } = require("./_lib/gallery");

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
  if (!payload.id) return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id de la imagen." }) };

  try {
    const supabase = getServiceClient();
    const { data: existing } = await supabase.from("promo_banners").select("storage_path").eq("id", payload.id).single();
    if (!existing) return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };

    if (isBucketFile(existing.storage_path)) {
      await supabase.storage.from("gallery").remove([existing.storage_path]);
    }

    const { error } = await supabase.from("promo_banners").delete().eq("id", payload.id);
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("delete-promo-banner error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo borrar la imagen." }) };
  }
};
