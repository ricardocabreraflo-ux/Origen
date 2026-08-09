const { getServiceClient } = require("./_lib/supabase");
const { last10 } = require("./_lib/loyalty");

const VALID_CHANNELS = ["whatsapp", "email", "both", "none"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request" }) };
  }

  const digits = last10(payload.phone);
  if (digits.length < 10) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Teléfono inválido." }) };
  }

  const channel = payload.notifyChannel;
  if (!VALID_CHANNELS.includes(channel)) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Elige una opción de notificación." }) };
  }

  const email = (payload.email || "").trim();
  if ((channel === "email" || channel === "both") && !email) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta tu correo." }) };
  }

  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("client_preferences")
      .upsert({ phone: digits, email: email || null, notify_channel: channel });
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("save-preference error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
