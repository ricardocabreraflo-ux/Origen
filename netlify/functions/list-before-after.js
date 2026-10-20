// Público (sin sesión): la página principal lo usa para pintar la
// sección "Antes y después", y Configuración → Antes y después lo usa
// para mostrar el panel de edición.
const { getServiceClient } = require("./_lib/supabase");

function publicUrl(storagePath) {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/gallery/${storagePath}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("before_after_photos").select("*").order("sort_order", { ascending: true });
    if (error) throw error;

    const pairs = (data || []).map((p) => ({
      id: p.id,
      beforeUrl: publicUrl(p.before_path),
      afterUrl: publicUrl(p.after_path),
      label: p.label || "",
    }));

    return { statusCode: 200, body: JSON.stringify({ pairs }) };
  } catch (err) {
    console.error("list-before-after error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
