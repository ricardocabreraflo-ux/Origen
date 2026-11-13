// Público (sin sesión): la página principal lo usa para pintar el
// carrusel "Promos de la semana", y Configuración → Promos de la
// semana lo usa para mostrar el panel de edición.
const { getServiceClient } = require("./_lib/supabase");
const { buildPublicUrl } = require("./_lib/gallery");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("promo_banners").select("*").order("sort_order", { ascending: true });
    if (error) throw error;

    const banners = (data || []).map((b) => ({
      id: b.id,
      url: buildPublicUrl(b.storage_path),
      alt: b.alt || "",
    }));

    return { statusCode: 200, body: JSON.stringify({ banners }) };
  } catch (err) {
    console.error("list-promo-banners error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
