const { getServiceClient } = require("./_lib/supabase");
const { createPreference } = require("./_lib/mercadopago");

function resolveSiteUrl(event) {
  if (process.env.URL) return process.env.URL.replace(/\/$/, "");
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request" }) };
  }
  if (!payload.bookingId || typeof payload.bookingId !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el id de la reserva." }) };
  }

  try {
    const supabase = getServiceClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", payload.bookingId)
      .single();
    if (error || !booking) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
    }
    if (booking.status !== "pending") {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "invalid_status", message: "Esta reserva ya no está pendiente de pago." }),
      };
    }

    const preference = await createPreference(booking, resolveSiteUrl(event));
    await supabase.from("bookings").update({ mp_preference_id: preference.id }).eq("id", booking.id);

    return { statusCode: 200, body: JSON.stringify({ initPoint: preference.init_point }) };
  } catch (err) {
    console.error("create-mp-preference error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "server_error",
        message: "No se pudo iniciar el pago con tarjeta. Intenta con transferencia manual.",
      }),
    };
  }
};
