const { JWT } = require("google-auth-library");

// Reutiliza el mismo tipo de cuenta de servicio que ya usa Google Calendar
// (ver googleCalendar.js), pero con permiso de Sheets en vez de Calendar.
function getAuthClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error("Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_KEY");
  }
  const credentials = JSON.parse(keyJson);
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// Agrega una fila al final de la hoja configurada en
// GOOGLE_SHEETS_GIVEAWAY_ID. Si esa variable no está configurada todavía,
// no hace nada — el sorteo sigue funcionando solo con Supabase y el CSV
// del panel mientras se configura la Sheet.
async function appendGiveawayRow(row) {
  const sheetId = process.env.GOOGLE_SHEETS_GIVEAWAY_ID;
  if (!sheetId) return { skipped: true, reason: "GOOGLE_SHEETS_GIVEAWAY_ID no configurado" };

  const client = getAuthClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:E:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Sheets respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { appendGiveawayRow };
