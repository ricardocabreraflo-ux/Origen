// Corrige price_label de las citas con fecha antes del 1 de septiembre de
// 2026 al precio que tenían vigente entonces (antes del aumento de
// precios), ya que varias se habían corrompido al precio nuevo por
// ediciones sin relación con el precio (ver commit del arreglo de
// price_label en edit-booking.js). Es una corrección de un solo uso —
// segura de correr más de una vez, siempre deja el mismo resultado.
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

const OLD_PRICES = {
  "disenando-tu-origen": "$220 MXN",
  "brow-tint-shape": "$350 MXN",
  "korean-lash-lifting": "$550 MXN",
  "luxury-brow-lamination": "$480 MXN",
  "luxury-lamination-tint": "$580 MXN",
  "combo-full-look": "$980 MXN",
};

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, service_id, booking_date, price_label")
      .lt("booking_date", "2026-09-01");
    if (error) throw error;

    let updated = 0;
    for (const b of bookings || []) {
      const oldPrice = OLD_PRICES[b.service_id];
      if (!oldPrice || b.price_label === oldPrice) continue;
      const { error: updateError } = await supabase.from("bookings").update({ price_label: oldPrice }).eq("id", b.id);
      if (updateError) throw updateError;
      updated++;
    }

    return { statusCode: 200, body: JSON.stringify({ checked: (bookings || []).length, updated }) };
  } catch (err) {
    console.error("fix-august-prices error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo corregir los precios de agosto." }) };
  }
};
