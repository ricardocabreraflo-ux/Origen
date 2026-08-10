const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

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

  const { id, name, phone, email, notes } = payload;
  if (!name || !name.trim()) return badRequest("Falta el nombre.");
  if (!phone || !phone.trim()) return badRequest("Falta el teléfono.");
  if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return badRequest("El correo no es válido.");
  }

  const row = {
    name: name.trim(),
    phone: phone.trim(),
    email: (email || "").trim() || null,
    notes: (notes || "").trim() || null,
  };

  try {
    const supabase = getServiceClient();
    const query = id
      ? supabase.from("manual_clients").update(row).eq("id", id).select().single()
      : supabase.from("manual_clients").insert(row).select().single();

    const { data, error } = await query;
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ client: data }) };
  } catch (err) {
    console.error("save-manual-client error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar la clienta." }) };
  }
};
