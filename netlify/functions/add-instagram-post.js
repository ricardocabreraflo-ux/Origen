const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireSectionWrite(context, "contenido");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized", message: err.message }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "JSON inválido." }) };
  }
  const permalink = (payload.permalink || "").trim();
  if (!permalink) return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el enlace del post." }) };
  if (!/^https:\/\/(www\.)?instagram\.com\//.test(permalink)) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Ese enlace no parece ser de Instagram." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: maxRow } = await supabase
      .from("instagram_posts")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = maxRow ? maxRow.sort_order + 1 : 0;

    const { data, error } = await supabase.from("instagram_posts").insert({ permalink, sort_order: nextOrder }).select().single();
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ post: { id: data.id, permalink: data.permalink } }) };
  } catch (err) {
    console.error("add-instagram-post error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar." }) };
  }
};
