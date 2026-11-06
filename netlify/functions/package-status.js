// Público (sin sesión): consulta los paquetes activos de una clienta por
// su teléfono — misma idea que loyalty-status.js, pero para promociones
// "paquete" (ver create-booking.js / admin-create-booking.js).
const { getServiceClient } = require("./_lib/supabase");
const { last10 } = require("./_lib/loyalty");

exports.handler = async (event) => {
  const phone = event.queryStringParameters && event.queryStringParameters.phone;
  const digits = last10(phone);

  if (digits.length < 10) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "invalid_request", message: "Ingresa un teléfono válido." }),
    };
  }

  try {
    const supabase = getServiceClient();

    const { data: promos, error: promoError } = await supabase.from("promotions").select("*").eq("is_package", true);
    if (promoError) throw promoError;
    if (!promos || !promos.length) return { statusCode: 200, body: JSON.stringify({ packages: [] }) };

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("promo_code, customer_phone, status")
      .in("promo_code", promos.map((p) => p.code))
      .in("status", ["pending", "confirmed"]);
    if (bookingsError) throw bookingsError;

    const today = new Date().toISOString().slice(0, 10);
    const packages = promos
      .map((promo) => {
        const sessionsUsed = (bookings || []).filter((b) => b.promo_code === promo.code && last10(b.customer_phone) === digits).length;
        if (sessionsUsed === 0) return null;
        const remaining = Math.max(0, (promo.package_total_sessions || 0) - sessionsUsed);
        return {
          code: promo.code,
          campaignName: promo.campaign_name,
          totalSessions: promo.package_total_sessions,
          sessionsUsed,
          remaining,
          serviceId: Array.isArray(promo.service_ids) && promo.service_ids.length ? promo.service_ids[0] : null,
          canBookMore: remaining > 0 && promo.active && (!promo.ends_at || promo.ends_at >= today),
        };
      })
      .filter(Boolean);

    return { statusCode: 200, body: JSON.stringify({ packages }) };
  } catch (err) {
    console.error("package-status error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
