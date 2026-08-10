const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  try {
    requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  try {
    const supabase = getServiceClient();

    // Limpia pendientes vencidos en general para que el panel siempre
    // refleje el estado real antes de mostrarlo.
    await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const params = event.queryStringParameters || {};
    let query = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (params.date) query = query.eq("booking_date", params.date);
    if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
      const [y, m] = params.month.split("-").map(Number);
      const monthStart = `${params.month}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const monthEnd = `${params.month}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("booking_date", monthStart).lte("booking_date", monthEnd);
    }
    if (params.status) query = query.eq("status", params.status);

    const { data, error } = await query;
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ bookings: data }) };
  } catch (err) {
    console.error("list-bookings error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
