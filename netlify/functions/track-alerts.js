// Endpoint admin (RF9): listar alertas (con su post y competidor) y
// cambiar su estado — usada / descartada / guardada.
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
    const status = event.queryStringParameters?.status;
    let query = supabase
      .from("viral_alerts")
      .select("*, post:competitor_posts(*, competitor:competitors(username, display_name))")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "PATCH") {
    const body = JSON.parse(event.body || "{}");
    if (!body.id) return { statusCode: 400, body: "Falta id" };
    if (!["pending", "saved", "used", "dismissed"].includes(body.status)) {
      return { statusCode: 400, body: "Estado inválido" };
    }

    const updates = { status: body.status };
    if (typeof body.notes === "string") updates.notes = body.notes;

    const { data, error } = await supabase
      .from("viral_alerts")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  return { statusCode: 405, body: "Método no permitido" };
};
