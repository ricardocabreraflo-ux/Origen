// [admin] Lista las campañas creadas a mano desde el panel (excluye las
// recompensas de referido de un solo uso, que se generan solas y se ven
// en list-referrals.js en su lugar).
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
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("kind", "campaign")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ promotions: data || [] }) };
  } catch (err) {
    console.error("list-promotions error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
