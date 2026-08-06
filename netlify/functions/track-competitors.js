// Endpoint admin (RF2/RF10): listar, agregar, activar/desactivar (incluye
// aprobar candidatos descubiertos) y quitar competidores.
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  try {
    requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: err.message };
  }

  const supabase = getServiceClient();

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const username = (body.username || "").replace(/^@/, "").trim().toLowerCase();
    if (!username) return { statusCode: 400, body: "Falta username" };

    const { data, error } = await supabase
      .from("competitors")
      .upsert({ username, display_name: body.displayName || null, active: true, source: "manual" }, { onConflict: "username" })
      .select()
      .single();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "PATCH") {
    const body = JSON.parse(event.body || "{}");
    if (!body.id) return { statusCode: 400, body: "Falta id" };

    const updates = {};
    if (typeof body.active === "boolean") updates.active = body.active;
    if (Object.keys(updates).length === 0) return { statusCode: 400, body: "Nada para actualizar" };

    const { data, error } = await supabase
      .from("competitors")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "DELETE") {
    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, body: "Falta id" };
    const { error } = await supabase.from("competitors").delete().eq("id", id);
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: "Método no permitido" };
};
