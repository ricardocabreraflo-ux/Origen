// Envía mensajes de WhatsApp usando la Cloud API de Meta directamente
// (sin intermediarios como Twilio, para evitar una capa extra de costo).
// Requiere una plantilla de mensaje ya aprobada por Meta — WhatsApp no
// permite que un negocio inicie una conversación con texto libre.

// WhatsApp exige un "1" extra después del código de país (52) para
// números móviles de México: +52 XX XXXX XXXX → 521XXXXXXXXXX.
function toWhatsAppMexicoNumber(rawPhone) {
  const digits = (rawPhone || "").replace(/\D/g, "");
  if (digits.startsWith("521") && digits.length === 13) return digits;
  if (digits.startsWith("52") && digits.length === 12) return `521${digits.slice(2)}`;
  if (digits.length === 10) return `521${digits}`;
  return digits;
}

async function sendWhatsAppTemplate(rawPhone, templateName, languageCode, components) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("Faltan WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID");
  }

  const to = toWhatsAppMexicoNumber(rawPhone);

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: templateName, language: { code: languageCode }, components },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp API respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { sendWhatsAppTemplate, toWhatsAppMexicoNumber };
