// Validación en vivo mientras la clienta escribe el código (en el paso de
// agendar o en la landing de campaña). No es la validación que de verdad
// cuenta — esa vuelve a correr del lado del servidor en create-booking.js,
// que es el único lugar que aplica el descuento de verdad.
const { getServiceClient } = require("./_lib/supabase");

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  const raw = event.queryStringParameters && event.queryStringParameters.code;
  const code = (raw || "").trim().toUpperCase();

  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ valid: false, message: "Escribe un código." }) };
  }

  try {
    const supabase = getServiceClient();
    const today = todayStr();

    const { data: promo, error: promoError } = await supabase
      .from("promotions")
      .select("code, campaign_name, discount_type, discount_value, active, starts_at, ends_at, max_redemptions, redemptions_count")
      .eq("code", code)
      .maybeSingle();
    if (promoError) throw promoError;

    if (promo) {
      if (!promo.active) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, message: "Ese código ya no está activo." }) };
      }
      if (promo.starts_at && promo.starts_at > today) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, message: "Ese código todavía no empieza a aplicar." }) };
      }
      if (promo.ends_at && promo.ends_at < today) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, message: "Ese código ya venció." }) };
      }
      if (promo.max_redemptions != null && promo.redemptions_count >= promo.max_redemptions) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, message: "Ese código ya alcanzó su límite de usos." }) };
      }
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: true,
          kind: "promotion",
          campaignName: promo.campaign_name,
          discountType: promo.discount_type,
          discountValue: promo.discount_value,
          message:
            promo.discount_type === "percent"
              ? `${promo.discount_value}% de descuento — ${promo.campaign_name}`
              : `$${promo.discount_value} MXN de descuento — ${promo.campaign_name}`,
        }),
      };
    }

    const { data: referral, error: referralError } = await supabase
      .from("referral_codes")
      .select("code, owner_name")
      .eq("code", code)
      .maybeSingle();
    if (referralError) throw referralError;

    if (referral) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: true,
          kind: "referral",
          message: `Código de referido de ${referral.owner_name} — válido solo en tu primera cita.`,
        }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ valid: false, message: "No encontramos ese código." }) };
  } catch (err) {
    console.error("check-promo-code error", err);
    return { statusCode: 500, body: JSON.stringify({ valid: false, message: "No se pudo validar el código." }) };
  }
};
