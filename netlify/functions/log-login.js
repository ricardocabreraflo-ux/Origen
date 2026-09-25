// Registra un inicio de sesión en el panel — se llama una sola vez por
// cada login real (no en cada carga de página), desde el evento "login"
// de Netlify Identity en cada página del panel.
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

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
    const { error } = await supabase.from("login_history").insert({
      email: user.email,
      full_name: fullName,
    });
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("log-login error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
