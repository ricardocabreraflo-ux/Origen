const { getServiceClient } = require("./_lib/supabase");
const { requireSection } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  try {
    requireSection(context, "citas");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("*")
      .order("block_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ blocks: data || [] }) };
  } catch (err) {
    console.error("list-blocks error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
