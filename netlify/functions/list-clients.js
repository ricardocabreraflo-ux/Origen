// Lista unificada de clientas: las que ya tienen citas en el sistema
// (bookings) más las que la administradora agregó a mano desde su
// agenda física (manual_clients). Se combinan por teléfono (últimos 10
// dígitos) para no duplicar a alguien que ya reservó y también fue
// agregada a mano.
const { getServiceClient } = require("./_lib/supabase");
const { requireSection } = require("./_lib/requireAdmin");
const { last10 } = require("./_lib/loyalty");

exports.handler = async (event, context) => {
  try {
    requireSection(context, "clientas");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  try {
    const supabase = getServiceClient();

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("customer_name, customer_phone, customer_email, status, created_at")
      .order("created_at", { ascending: true });
    if (bookingsError) throw bookingsError;

    const { data: manualClients, error: manualError } = await supabase
      .from("manual_clients")
      .select("*")
      .order("created_at", { ascending: true });
    if (manualError) throw manualError;

    const byPhone = new Map();

    (bookings || []).forEach((b) => {
      const key = last10(b.customer_phone);
      if (!key) return;
      const existing = byPhone.get(key) || { name: b.customer_name, phone: key, email: null, visits: 0, totalBookings: 0, manualId: null, notes: null };
      existing.name = b.customer_name; // el más reciente, porque bookings viene ordenado ascendente
      if (b.customer_email) existing.email = b.customer_email;
      existing.totalBookings += 1;
      if (b.status === "confirmed") existing.visits += 1;
      byPhone.set(key, existing);
    });

    (manualClients || []).forEach((m) => {
      const key = last10(m.phone);
      if (!key) return;
      const existing = byPhone.get(key);
      if (existing) {
        existing.manualId = m.id;
        if (!existing.email && m.email) existing.email = m.email;
        existing.notes = m.notes;
      } else {
        byPhone.set(key, {
          name: m.name,
          phone: key,
          email: m.email,
          visits: 0,
          totalBookings: 0,
          manualId: m.id,
          notes: m.notes,
        });
      }
    });

    const clients = Array.from(byPhone.values())
      .map((c) => ({
        ...c,
        source: c.manualId ? (c.totalBookings > 0 ? "ambos" : "manual") : "agenda",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    return { statusCode: 200, body: JSON.stringify({ clients }) };
  } catch (err) {
    console.error("list-clients error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
