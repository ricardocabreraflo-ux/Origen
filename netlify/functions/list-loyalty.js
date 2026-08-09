const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");
const { last10, computeLoyaltyStatus } = require("./_lib/loyalty");

exports.handler = async (event, context) => {
  try {
    requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  try {
    const config = await loadConfig();
    const supabase = getServiceClient();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("customer_name, customer_phone, status, created_at")
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const { data: prefs, error: prefError } = await supabase
      .from("client_preferences")
      .select("phone, email, notify_channel");
    if (prefError) throw prefError;

    const prefByPhone = new Map((prefs || []).map((p) => [p.phone, p]));

    // Agrupa por teléfono (últimos 10 dígitos). Usa el nombre más reciente
    // que haya usado esa clienta, por si lo escribió distinto entre citas.
    const byPhone = new Map();
    (bookings || []).forEach((b) => {
      const key = last10(b.customer_phone);
      if (!key) return;
      const existing = byPhone.get(key) || { phone: key, name: b.customer_name, phones: [] };
      existing.name = b.customer_name; // el más reciente, porque bookings viene ordenado ascendente
      existing.phones.push(b.customer_phone);
      byPhone.set(key, existing);
    });

    const allConfirmedPhones = (bookings || []).map((b) => b.customer_phone);

    const clients = Array.from(byPhone.values())
      .map((c) => {
        const status = computeLoyaltyStatus(allConfirmedPhones, c.phones[0], config.loyalty);
        const pref = prefByPhone.get(c.phone);
        return {
          name: c.name,
          phone: c.phone,
          visits: status.visits,
          progress: status.progress,
          cycleSize: status.cycleSize,
          hasReward: status.hasReward,
          preference: pref ? { email: pref.email, notifyChannel: pref.notify_channel } : null,
        };
      })
      .sort((a, b) => b.visits - a.visits);

    return { statusCode: 200, body: JSON.stringify({ clients }) };
  } catch (err) {
    console.error("list-loyalty error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
