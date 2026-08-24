// [admin] Crea o edita una campaña de descuento. Si no manda "id", crea
// una nueva; si manda "id", actualiza esa (incluye activar/desactivar
// cambiando el campo "active").
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");
const { generatePromoCode, slugify } = require("./_lib/promoCode");

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }
  try {
    requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("JSON inválido.");
  }

  const campaignName = (payload.campaignName || "").trim();
  if (!campaignName) return badRequest("Falta el nombre de la campaña.");

  const discountType = payload.discountType;
  if (!["percent", "fixed"].includes(discountType)) return badRequest("Elige el tipo de descuento.");

  const discountValue = Number(payload.discountValue);
  if (!discountValue || discountValue <= 0) return badRequest("El descuento debe ser mayor a 0.");
  if (discountType === "percent" && discountValue > 100) return badRequest("El descuento no puede ser mayor a 100%.");

  const startsAt = payload.startsAt || null;
  const endsAt = payload.endsAt || null;
  if (startsAt && endsAt && startsAt > endsAt) return badRequest("La fecha de inicio no puede ser después de la fecha de fin.");

  const maxRedemptions = payload.maxRedemptions ? Number(payload.maxRedemptions) : null;
  if (maxRedemptions != null && (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)) {
    return badRequest("El límite de usos debe ser un número entero mayor a 0.");
  }

  try {
    const supabase = getServiceClient();

    const row = {
      campaign_name: campaignName,
      description: (payload.description || "").trim() || null,
      discount_type: discountType,
      discount_value: discountValue,
      starts_at: startsAt,
      ends_at: endsAt,
      max_redemptions: maxRedemptions,
      active: payload.active !== false,
    };

    if (payload.id) {
      // Editar: el código y el slug ya existen y no cambian, para no
      // romper links de campaña que ya se compartieron.
      const { data, error } = await supabase
        .from("promotions")
        .update(row)
        .eq("id", payload.id)
        .eq("kind", "campaign") // nunca editar por aquí una recompensa de referido
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ promotion: data }) };
    }

    let code = (payload.code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!code) code = generatePromoCode(campaignName);

    let slug = slugify(payload.slug || campaignName);
    if (!slug) slug = slugify(code);

    const { data, error } = await supabase
      .from("promotions")
      .insert({ ...row, code, slug, kind: "campaign" })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return badRequest("Ya existe una campaña con ese código o esa dirección de landing (slug). Usa otro.");
      }
      throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ promotion: data }) };
  } catch (err) {
    console.error("save-promotion error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
