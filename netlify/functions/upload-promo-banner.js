// Sube un flyer de promoción nuevo al carrusel "Promos de la semana",
// desde Configuración → Promos de la semana. Requiere permiso de
// escritura en "contenido". Mismo patrón que upload-gallery-photo.js,
// pero solo fotos (no video) y en su propia tabla/prefijo.
const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");

const MAX_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

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
    return badRequest("JSON inválido.");
  }

  const { dataBase64, contentType, alt } = payload;
  if (!dataBase64 || typeof dataBase64 !== "string") return badRequest("Falta el archivo.");
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) return badRequest("Formato no soportado. Usa JPG, PNG o WEBP.");

  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length > MAX_BYTES) {
    return badRequest("La imagen pesa demasiado (máximo 4.5 MB). Usa una imagen más ligera o comprímela antes de subirla.");
  }

  try {
    const supabase = getServiceClient();
    const path = `promo-banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("gallery").upload(path, buffer, { contentType });
    if (uploadError) throw uploadError;

    const { data: maxRow } = await supabase
      .from("promo_banners")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = maxRow ? maxRow.sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("promo_banners")
      .insert({ storage_path: path, alt: (alt || "").trim() || null, sort_order: nextOrder })
      .select()
      .single();
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ banner: { id: data.id, alt: data.alt || "", sortOrder: data.sort_order } }) };
  } catch (err) {
    console.error("upload-promo-banner error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo subir la imagen." }) };
  }
};
