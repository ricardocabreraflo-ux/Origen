// Sube una foto o video nuevo a la galería de trabajos realizados, desde
// Configuración → Galería de fotos. Requiere permiso de escritura en
// "contenido".
const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");

// ~4.5MB de archivo real; el POST completo en base64 (que pesa ~33% más)
// queda dentro del límite de tamaño de las Netlify Functions síncronas
// (por eso los videos deben ser clips cortos, no de varios minutos).
const MAX_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_TYPES = {
  "image/jpeg": { ext: "jpg", mediaType: "photo" },
  "image/png": { ext: "png", mediaType: "photo" },
  "image/webp": { ext: "webp", mediaType: "photo" },
  "video/mp4": { ext: "mp4", mediaType: "video" },
  "video/quicktime": { ext: "mov", mediaType: "video" },
  "video/webm": { ext: "webm", mediaType: "video" },
};

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
  const typeInfo = ALLOWED_TYPES[contentType];
  if (!typeInfo) return badRequest("Formato no soportado. Usa JPG, PNG, WEBP, MP4, MOV o WEBM.");

  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length > MAX_BYTES) {
    return badRequest("El archivo pesa demasiado (máximo 4.5 MB). Usa un archivo más ligero o comprímelo antes de subirlo.");
  }

  try {
    const supabase = getServiceClient();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${typeInfo.ext}`;

    const { error: uploadError } = await supabase.storage.from("gallery").upload(path, buffer, { contentType });
    if (uploadError) throw uploadError;

    const { data: maxRow } = await supabase
      .from("gallery_photos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = maxRow ? maxRow.sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("gallery_photos")
      .insert({ storage_path: path, alt: (alt || "").trim() || null, sort_order: nextOrder, media_type: typeInfo.mediaType })
      .select()
      .single();
    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ photo: { id: data.id, alt: data.alt || "", sortOrder: data.sort_order, mediaType: data.media_type } }),
    };
  } catch (err) {
    console.error("upload-gallery-photo error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo subir el archivo." }) };
  }
};
