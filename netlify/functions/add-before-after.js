// Agrega un caso nuevo a "Antes y después" desde Configuración: sube las
// dos fotos al bucket "gallery" y crea la fila. Requiere permiso de
// escritura en "contenido".
const { getServiceClient } = require("./_lib/supabase");
const { requireSectionWrite } = require("./_lib/requireAdmin");

// Mismo límite que la galería de fotos: cabe dentro del límite de tamaño
// de las Netlify Functions síncronas una vez codificado en base64.
const MAX_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

async function uploadImage(supabase, dataBase64, contentType, suffix) {
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    const err = new Error("Formato no soportado. Usa JPG, PNG o WEBP.");
    err.isBadRequest = true;
    throw err;
  }
  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length > MAX_BYTES) {
    const err = new Error("Una de las fotos pesa demasiado (máximo 4.5 MB).");
    err.isBadRequest = true;
    throw err;
  }
  const path = `before-after/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, buffer, { contentType });
  if (error) throw error;
  return path;
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

  const { beforeDataBase64, beforeContentType, afterDataBase64, afterContentType, label } = payload;
  if (!beforeDataBase64 || !afterDataBase64) return badRequest("Faltan las dos fotos (antes y después).");

  try {
    const supabase = getServiceClient();
    const beforePath = await uploadImage(supabase, beforeDataBase64, beforeContentType, "before");
    const afterPath = await uploadImage(supabase, afterDataBase64, afterContentType, "after");

    const { data: maxRow } = await supabase
      .from("before_after_photos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = maxRow ? maxRow.sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("before_after_photos")
      .insert({ before_path: beforePath, after_path: afterPath, label: (label || "").trim() || null, sort_order: nextOrder })
      .select()
      .single();
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ pair: { id: data.id, label: data.label || "" } }) };
  } catch (err) {
    if (err.isBadRequest) return badRequest(err.message);
    console.error("add-before-after error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar." }) };
  }
};
