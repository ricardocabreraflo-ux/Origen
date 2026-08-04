const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { slotsForDate } = require("./_lib/slots");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

exports.handler = async (event) => {
  const date = event.queryStringParameters && event.queryStringParameters.date;

  if (!date || !DATE_RE.test(date)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "invalid_date", message: "Falta 'date' en formato YYYY-MM-DD." }),
    };
  }

  try {
    const config = await loadConfig();
    const blockMinutes = (config.booking && config.booking.blockMinutes) || 120;
    const grid = slotsForDate(date, config.businessHours, blockMinutes);

    if (grid.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ date, blockMinutes, slots: [] }),
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

    const { data: taken, error } = await supabase
      .from("bookings")
      .select("start_time")
      .eq("booking_date", date)
      .in("status", ["pending", "confirmed"]);

    if (error) throw error;

    const takenTimes = new Set((taken || []).map((b) => b.start_time.slice(0, 5)));

    const slots = grid.map((slot) => ({
      ...slot,
      available: !takenTimes.has(slot.startTime),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ date, blockMinutes, slots }),
    };
  } catch (err) {
    console.error("availability error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "server_error", message: "No se pudo calcular la disponibilidad." }),
    };
  }
};
