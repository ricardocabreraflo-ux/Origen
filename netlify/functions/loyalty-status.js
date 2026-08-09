const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");

exports.handler = async (event) => {
  const phone = event.queryStringParameters && event.queryStringParameters.phone;
  const digits = (phone || "").replace(/\D/g, "");

  if (digits.length < 8) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "invalid_request", message: "Ingresa un teléfono válido." }),
    };
  }

  try {
    const config = await loadConfig();
    const cycleSize = (config.loyalty && config.loyalty.cycleSize) || 5;
    const discountPercent = (config.loyalty && config.loyalty.discountPercent) || 20;

    const supabase = getServiceClient();
    const { data, error } = await supabase.from("bookings").select("customer_phone").eq("status", "confirmed");

    if (error) throw error;

    // Compara solo los últimos 10 dígitos, así no importa si alguien
    // guardó el "52" de código de país en unas citas y en otras no.
    const last10 = digits.slice(-10);
    const visits = (data || []).filter((b) => (b.customer_phone || "").replace(/\D/g, "").endsWith(last10)).length;

    const inCycle = visits % cycleSize;
    const hasReward = visits > 0 && inCycle === 0;

    return {
      statusCode: 200,
      body: JSON.stringify({
        visits,
        cycleSize,
        discountPercent,
        progress: hasReward ? cycleSize : inCycle,
        remaining: hasReward ? 0 : cycleSize - inCycle,
        hasReward,
      }),
    };
  } catch (err) {
    console.error("loyalty-status error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
