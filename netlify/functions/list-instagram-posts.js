// Público (sin sesión): la página principal lo usa para pintar los posts
// destacados, y Configuración → Posts de Instagram lo usa para el panel.
const { getServiceClient } = require("./_lib/supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("instagram_posts").select("*").order("sort_order", { ascending: true });
    if (error) throw error;

    const posts = (data || []).map((p) => ({ id: p.id, permalink: p.permalink }));
    return { statusCode: 200, body: JSON.stringify({ posts }) };
  } catch (err) {
    console.error("list-instagram-posts error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
