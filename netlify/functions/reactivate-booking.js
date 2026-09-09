const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");
const { reactivateExpiredBooking, ConfirmBookingError } = require("./_lib/confirmBooking");

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
    const { booking, alreadyConfirmed } = await reactivateExpiredBooking(getServiceClient(), payload.id);
    return {
      statusCode: 200,
      body: JSON.stringify({ booking, note: alreadyConfirmed ? "Ya estaba confirmada." : undefined }),
    };
  } catch (err) {
    if (err instanceof ConfirmBookingError) {
      const statusCode = err.code === "not_found" ? 404 : 409;
      return { statusCode, body: JSON.stringify({ error: err.code, message: err.message }) };
    }
    console.error("reactivate-booking error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
