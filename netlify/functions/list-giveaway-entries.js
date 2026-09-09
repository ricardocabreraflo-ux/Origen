// [admin] Lista participaciones de sorteo para admin/sorteos.html
// (tabla + exportar CSV). ?slug= filtra por sorteo, si hay más de uno.
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
    let query = supabase.from("giveaway_entries").select("*").order("created_at", { ascending: false });

    const slug = event.queryStringParameters && event.queryStringParameters.slug;
    if (slug) query = query.eq("giveaway_slug", slug);

    const { data, error } = await query;
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ entries: data || [] }) };
  } catch (err) {
    console.error("list-giveaway-entries error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
