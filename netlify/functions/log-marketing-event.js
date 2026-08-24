// [público] Registra un evento propio de medición (click a WhatsApp,
// código de promo usado), además de lo que mida Meta Pixel — para saber
// qué campaña convierte sin depender solo del Ads Manager.
const { getServiceClient } = require("./_lib/supabase");

const VALID_TYPES = ["whatsapp_click", "promo_code_used"];

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

  if (!VALID_TYPES.includes(payload.eventType)) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Tipo de evento inválido." }) };
  }

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("marketing_events").insert({
      event_type: payload.eventType,
      campaign: (payload.campaign || "").slice(0, 120) || null,
      metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : null,
    });
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    // Nunca debe tumbar la experiencia de la clienta por un fallo de
    // medición — se registra el error y se responde bien de todas formas.
    console.error("log-marketing-event error", err);
    return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  }
};
