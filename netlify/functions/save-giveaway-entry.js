// [público] Guarda una participación de sorteo/dinámica. Se guarda
// siempre en Supabase; además, si está configurada
// GOOGLE_SHEETS_GIVEAWAY_ID, se agrega también como fila en la Sheet en
// vivo (mejor esfuerzo — si falla, la participación ya quedó guardada de
// todas formas).
const { getServiceClient } = require("./_lib/supabase");
const { appendGiveawayRow } = require("./_lib/googleSheets");

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("JSON inválido.");
  }

  const name = (payload.name || "").trim();
  const whatsappPhone = (payload.whatsappPhone || "").trim();
  const instagramHandle = (payload.instagramHandle || "").trim().replace(/^@/, "");
  const giveawaySlug = (payload.giveawaySlug || "general").trim() || "general";

  if (!name) return badRequest("Falta tu nombre.");
  if (!whatsappPhone || whatsappPhone.replace(/\D/g, "").length < 10) return badRequest("Ingresa un WhatsApp válido.");

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("giveaway_entries")
      .insert({
        giveaway_slug: giveawaySlug,
        name,
        instagram_handle: instagramHandle || null,
        whatsapp_phone: whatsappPhone,
      })
      .select()
      .single();
    if (error) throw error;

    try {
      await appendGiveawayRow([
        data.created_at,
        giveawaySlug,
        name,
        instagramHandle ? `@${instagramHandle}` : "",
        whatsappPhone,
      ]);
    } catch (sheetsErr) {
      console.error("No se pudo sincronizar con Google Sheets", sheetsErr);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("save-giveaway-entry error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
