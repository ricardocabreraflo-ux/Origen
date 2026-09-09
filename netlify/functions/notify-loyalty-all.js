// Avisa por WhatsApp a TODAS las clientas con al menos una cita
// confirmada sobre el programa de lealtad, invitándolas también a seguir
// las redes sociales del negocio. Requiere Meta configurado y la
// plantilla aprobada.
const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");
const { loadConfig } = require("./_lib/config");
const { last10 } = require("./_lib/loyalty");
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

  try {
    const config = await loadConfig();
    const supabase = getServiceClient();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("customer_name, customer_phone, created_at")
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const byPhone = new Map();
    (bookings || []).forEach((b) => {
      const key = last10(b.customer_phone);
      if (!key) return;
      byPhone.set(key, { name: b.customer_name, phone: b.customer_phone });
    });

    const loyalty = config.loyalty || { cycleSize: 5, discountPercent: 20 };
    const loyaltyPageLink = "https://origen-brows.netlify.app/lealtad.html";
    const facebookLink = (config.social && config.social.facebook) || "";
    const instagramLink = (config.social && config.social.instagram) || "";

    let sent = 0;
    let failed = 0;
    for (const client of byPhone.values()) {
      try {
        await sendWhatsAppTemplate(client.phone, "invitacion_lealtad_masiva_origen", "es_MX", [
          {
            type: "body",
            parameters: [
              { type: "text", text: client.name },
              { type: "text", text: String(loyalty.cycleSize) },
              { type: "text", text: String(loyalty.discountPercent) },
              { type: "text", text: loyaltyPageLink },
              { type: "text", text: facebookLink || "—" },
              { type: "text", text: instagramLink || "—" },
            ],
          },
        ]);
        sent += 1;
      } catch (sendErr) {
        console.error(`No se pudo avisar a ${client.phone}`, sendErr);
        failed += 1;
      }
    }

    return { statusCode: 200, body: JSON.stringify({ sent, failed, total: byPhone.size }) };
  } catch (err) {
    console.error("notify-loyalty-all error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
