const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { slotsForDate, markAvailability } = require("./_lib/slots");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const date = params.date;
  const serviceId = params.serviceId;

  if (!date || !DATE_RE.test(date)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "invalid_date", message: "Falta 'date' en formato YYYY-MM-DD." }),
    };
  }
  if (!serviceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "invalid_request", message: "Falta 'serviceId'." }),
    };
  }

  try {
    const config = await loadConfig();

    const service = (config.services || []).find((s) => s.id === serviceId);
    if (!service) {
      return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Servicio inválido." }) };
    }

    const bufferMinutes = (config.booking && config.booking.bufferMinutes) || 15;
    const grid = slotsForDate(date, config.businessHours, service.duration);

    if (grid.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ date, serviceId, slots: [] }),
      };
    }

    const supabase = getServiceClient();

    // Libera horarios cuyo plazo de 30 minutos para confirmar el depósito
    // ya venció, antes de calcular qué está disponible.
    await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("booking_date", date)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const { data: existing, error } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_date", date)
      .in("status", ["pending", "confirmed"]);

    if (error) throw error;

    const slots = markAvailability(grid, existing || [], bufferMinutes);

    return {
      statusCode: 200,
      body: JSON.stringify({ date, serviceId, slots }),
    };
  } catch (err) {
    console.error("availability error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "No se pudo calcular la disponibilidad." }),
    };
  }
};
