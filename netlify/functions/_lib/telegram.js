// Envía alertas por Telegram (RF6). El PRD recomienda Telegram sobre
// WhatsApp para este módulo porque el Bot API es gratis e inmediato, sin
// la fricción de aprobar plantillas de mensaje como en WhatsApp Business.

async function sendTelegramMessage(text, { parseMode = "Markdown", disablePreview = false } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disablePreview,
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram API respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { sendTelegramMessage };
