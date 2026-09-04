// Reenvía manualmente por WhatsApp el estado de lealtad de una clienta
// (aunque ya esté en fase de pruebas y no se le haya podido avisar sola
// todavía). Requiere Meta configurado y la plantilla aprobada.
const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");
const { loadConfig } = require("./_lib/config");
const { getLoyaltyStatus } = require("./_lib/loyalty");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireSectionWrite(context, "lealtad");
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
    const config = await loadConfig();
    const supabase = getServiceClient();
    const status = await getLoyaltyStatus(supabase, config.loyalty, payload.phone);

    const statusTail = status.hasReward
      ? `¡Ya tienes ${status.discountPercent}% de descuento disponible!`
      : `Te ${status.remaining === 1 ? "falta" : "faltan"} ${status.remaining} visita${status.remaining === 1 ? "" : "s"} más para tu ${status.discountPercent}% de descuento.`;

    await sendWhatsAppTemplate(payload.phone, "estado_lealtad_origen", "es_MX", [
      {
        type: "body",
        parameters: [
          { type: "text", text: payload.name },
          { type: "text", text: String(status.progress) },
          { type: "text", text: String(status.cycleSize) },
          { type: "text", text: statusTail },
        ],
      },
    ]);

    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (err) {
    console.error("resend-loyalty-notice error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "No se pudo enviar el WhatsApp (revisa que Meta ya esté configurado)." }),
    };
  }
};
