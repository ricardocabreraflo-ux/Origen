// Marca o desmarca a mano si ya se cobró el total de una cita (anticipo +
// el resto que se paga en el estudio) — es una casilla manual que solo
// toca la administradora, no se calcula sola a partir del estado ni del
// monto capturado.
const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireSectionWrite(context, "citas");
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
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id de la cita." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: updated, error } = await supabase
      .from("bookings")
      .update({ paid: Boolean(payload.paid) })
      .eq("id", payload.id)
      .select()
      .single();

    if (error || !updated) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ booking: updated }) };
  } catch (err) {
    console.error("mark-paid error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
