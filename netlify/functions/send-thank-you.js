// Manda un WhatsApp de agradecimiento por la visita a una clienta,
// disparado a mano por la administradora desde el panel de Citas.
// Requiere Meta configurado y la plantilla "agradecimiento_visita_origen"
// aprobada.
const { requireAdmin } = require("./_lib/requireAdmin");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");

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
  if (!payload.phone || !payload.name) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el teléfono o el nombre de la clienta." }) };
  }

  try {
    await sendWhatsAppTemplate(payload.phone, "agradecimiento_visita_origen", "es_MX", [
      { type: "body", parameters: [{ type: "text", text: payload.name }] },
    ]);
    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (err) {
    console.error("send-thank-you error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "No se pudo enviar el mensaje. Revisa que Meta esté configurado y la plantilla aprobada." }),
    };
  }
};
