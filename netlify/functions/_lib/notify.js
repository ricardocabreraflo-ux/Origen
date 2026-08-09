const { sendWhatsAppTemplate } = require("./whatsapp");
const { sendEmail } = require("./email");

/**
 * Avisa a una clienta por su canal preferido (WhatsApp, correo, ambos o
 * ninguno). Mejor esfuerzo: si un canal falla, no interrumpe el flujo de
 * la reserva — solo se registra en los logs.
 */
async function notifyClient(preference, phoneRaw, { whatsappTemplate, whatsappParams, emailSubject, emailHtml }) {
  if (!preference || preference.notify_channel === "none") return;

  const wantsWhatsapp = preference.notify_channel === "whatsapp" || preference.notify_channel === "both";
  const wantsEmail = preference.notify_channel === "email" || preference.notify_channel === "both";

  if (wantsWhatsapp) {
    try {
      await sendWhatsAppTemplate(phoneRaw, whatsappTemplate, "es_MX", [{ type: "body", parameters: whatsappParams }]);
    } catch (err) {
      console.error("notifyClient: WhatsApp falló", err);
    }
  }

  if (wantsEmail && preference.email) {
    try {
      await sendEmail(preference.email, emailSubject, emailHtml);
    } catch (err) {
      console.error("notifyClient: correo falló", err);
    }
  }
}

module.exports = { notifyClient };
