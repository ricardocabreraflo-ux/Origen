// Historial de inicios de sesión al panel — solo lo puede ver una cuenta
// administradora (información sensible: quién entró y cuándo).
const { getServiceClient } = require("./_lib/supabase");
const { requireAdministrator } = require("./_lib/requireAdmin");

const MAX_ROWS = 300;

exports.handler = async (event, context) => {
  try {
    requireAdministrator(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized", message: err.message }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("login_history")
      .select("id, email, full_name, logged_in_at")
      .order("logged_in_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ logins: data || [] }) };
  } catch (err) {
    console.error("list-login-history error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
