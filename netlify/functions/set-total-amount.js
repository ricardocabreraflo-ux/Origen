// Edita el monto real cobrado por una cita (distinto del anticipo).
// Necesario sobre todo para servicios de "Valoración previa" (Botox
// Capilar, Keratina Alisante, Servicio Especial), que no tienen precio
// fijo y por lo tanto no se pueden contar en los reportes de ingresos
// hasta que la administradora captura cuánto se cobró de verdad.
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

  let totalAmount = null;
  if (payload.totalAmount !== null && payload.totalAmount !== undefined && payload.totalAmount !== "") {
    totalAmount = Number(payload.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "El monto debe ser un número válido." }) };
    }
  }

  try {
    const supabase = getServiceClient();
    const { data: updated, error } = await supabase
      .from("bookings")
      .update({ total_amount: totalAmount })
      .eq("id", payload.id)
      .select()
      .single();

    if (error || !updated) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ booking: updated }) };
  } catch (err) {
    console.error("set-total-amount error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
