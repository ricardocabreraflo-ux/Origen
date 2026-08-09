// Envía correos usando la API de Resend (https://resend.com). Tiene un
// nivel gratuito generoso y no requiere tarjeta de crédito para empezar.
// Requiere RESEND_API_KEY y RESEND_FROM_EMAIL configurados en Netlify.
async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Faltan las variables de entorno RESEND_API_KEY / RESEND_FROM_EMAIL");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { sendEmail };
