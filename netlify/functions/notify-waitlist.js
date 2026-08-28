// Le avisa a una clienta en lista de espera que se liberó un espacio,
// disparado a mano por la administradora desde el panel de Citas — igual
// que send-thank-you.js. Requiere Meta configurado y la plantilla
// "espacio_liberado_origen" aprobada.
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");

function formatDateEs(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
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
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request" }) };
  }
  if (!payload.id) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id de la lista de espera." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: entry, error: fetchError } = await supabase.from("waitlist").select("*").eq("id", payload.id).single();
    if (fetchError || !entry) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    await sendWhatsAppTemplate(entry.customer_phone, "espacio_liberado_origen", "es_MX", [
      { type: "body", parameters: [{ type: "text", text: entry.customer_name }, { type: "text", text: formatDateEs(entry.preferred_date) }] },
    ]);

    const { data: updated, error: updateError } = await supabase
      .from("waitlist")
      .update({ status: "notified", notified_at: new Date().toISOString() })
      .eq("id", payload.id)
      .select()
      .single();
    if (updateError) throw updateError;

    return { statusCode: 200, body: JSON.stringify({ entry: updated }) };
  } catch (err) {
    console.error("notify-waitlist error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "No se pudo enviar el mensaje. Revisa que Meta esté configurado y la plantilla aprobada." }),
    };
  }
};
