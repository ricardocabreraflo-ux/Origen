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
      .from("expenses")
      .select("*")
      .order("kind", { ascending: true })
      .order("start_date", { ascending: false })
      .order("expense_date", { ascending: false });

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ expenses: data || [] }) };
  } catch (err) {
    console.error("list-expenses error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
