const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

const ACTIVE_WINDOW_SECONDS = 90;

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }
  let user;
  try {
    user = requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }
  try {
    const supabase = getServiceClient();
    const fullName = (user.user_metadata && user.user_metadata.full_name) || null;
    await supabase.from("admin_presence").upsert({
      email: user.email,
      full_name: fullName,
      last_seen: new Date().toISOString(),
    });

    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_SECONDS * 1000).toISOString();
    const { data: active, error } = await supabase
      .from("admin_presence")
      .select("email, full_name")
      .gte("last_seen", cutoff)
      .order("email", { ascending: true });
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ active: active || [] }) };
  } catch (err) {
    console.error("heartbeat error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
