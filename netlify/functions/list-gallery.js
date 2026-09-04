// Público (sin sesión): la página principal lo usa para pintar la
// galería de trabajos realizados, y Configuración → Galería de fotos lo
// usa para mostrar el panel de edición.
const { getServiceClient } = require("./_lib/supabase");
const { buildPublicUrl } = require("./_lib/gallery");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("gallery_photos").select("*").order("sort_order", { ascending: true });
    if (error) throw error;

    const photos = (data || []).map((p) => ({
      id: p.id,
      url: buildPublicUrl(p.storage_path),
      alt: p.alt || "",
    }));

    return { statusCode: 200, body: JSON.stringify({ photos }) };
  } catch (err) {
    console.error("list-gallery error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
