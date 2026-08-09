// Mercado Pago llama esta URL cuando cambia el estado de un pago. Nunca se
// confía en el contenido del webhook: siempre se vuelve a consultar el pago
// directamente en la API de Mercado Pago con nuestro propio access token
// antes de confirmar una cita.
const { getServiceClient } = require("./_lib/supabase");
const { getPayment } = require("./_lib/mercadopago");
const { confirmBookingById, ConfirmBookingError } = require("./_lib/confirmBooking");

function extractPaymentId(event) {
  const q = event.queryStringParameters || {};
  if (q["data.id"]) return q["data.id"];
  if (q.id && q.topic === "payment") return q.id;
  try {
    const body = JSON.parse(event.body || "{}");
    if (body.data && body.data.id) return String(body.data.id);
  } catch {
    // ignorado: algunas notificaciones no traen cuerpo JSON
  }
  return null;
}

exports.handler = async (event) => {
  // Mercado Pago solo necesita un 200 para dejar de reintentar la
  // notificación; cualquier problema se registra en logs pero no se
  // refleja en el código de respuesta.
  try {
    const paymentId = extractPaymentId(event);
    if (!paymentId) return { statusCode: 200, body: "ok" };

    const payment = await getPayment(paymentId);
    if (payment.status !== "approved") return { statusCode: 200, body: "ok" };

    const bookingId = payment.external_reference;
    if (!bookingId) return { statusCode: 200, body: "ok" };

    const supabase = getServiceClient();
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, deposit_amount")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return { statusCode: 200, body: "ok" };

    // El monto pagado debe coincidir con el anticipo de esa reserva antes
    // de confirmarla automáticamente.
    const amountMatches = Math.abs(Number(payment.transaction_amount) - Number(booking.deposit_amount)) < 1;
    if (!amountMatches) {
      console.error("mp-webhook: el monto del pago no coincide con el anticipo de la reserva", bookingId);
      return { statusCode: 200, body: "ok" };
    }

    await confirmBookingById(supabase, bookingId, {
      payment_method: "mercado_pago",
      mp_payment_id: String(payment.id),
    });
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    if (err instanceof ConfirmBookingError) {
      // Ya estaba confirmada, expiró, etc. — no es un error real del webhook.
      return { statusCode: 200, body: "ok" };
    }
    console.error("mp-webhook error", err);
    return { statusCode: 200, body: "ok" };
  }
};
