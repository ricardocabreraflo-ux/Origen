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
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id de la lista de espera." }) };
  }

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("waitlist").delete().eq("id", payload.id);
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  } catch (err) {
    console.error("delete-waitlist error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
