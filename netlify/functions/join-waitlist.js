// Anota a una clienta en la lista de espera de una fecha que le salió sin
// horarios (llena o cerrada), para poder avisarle por WhatsApp si se
// libera un espacio. Es pública (cualquiera puede anotarse), no requiere
// sesión de administradora — igual que create-booking.js.
const { getServiceClient } = require("./_lib/supabase");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const phone = (payload.phone || "").trim();
  const date = payload.date;
  if (!name) return badRequest("Falta tu nombre.");
  if (!phone || phone.replace(/\D/g, "").length < 10) return badRequest("Falta un WhatsApp válido.");
  if (!date || !DATE_RE.test(date)) return badRequest("Falta la fecha que te interesa.");

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        customer_name: name,
        customer_phone: phone,
        customer_email: (payload.email || "").trim() || null,
        service_id: payload.serviceId || null,
        service_name: payload.serviceName || null,
        preferred_date: date,
        notes: (payload.notes || "").trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ waitlistEntry: data }) };
  } catch (err) {
    console.error("join-waitlist error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar tu lugar en la lista de espera." }) };
  }
};
