const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .order("preferred_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ entries: data || [] }) };
  } catch (err) {
    console.error("list-waitlist error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
