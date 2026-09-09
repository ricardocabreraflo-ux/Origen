// [público] Datos de una campaña para su landing page (/promo-:slug ->
// promo.html?slug=:slug). Solo expone lo que la clienta necesita ver —
// nada de conteos internos ni del código en bruto de otras campañas.
const { getServiceClient } = require("./_lib/supabase");

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters && event.queryStringParameters.slug;
  if (!slug) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta el slug." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data: promo, error } = await supabase
      .from("promotions")
      .select("code, slug, campaign_name, description, discount_type, discount_value, active, starts_at, ends_at, max_redemptions, redemptions_count")
      .eq("slug", slug)
      .eq("kind", "campaign")
      .maybeSingle();
    if (error) throw error;

    const today = todayStr();
    const isLive =
      promo &&
      promo.active &&
      (!promo.starts_at || promo.starts_at <= today) &&
      (!promo.ends_at || promo.ends_at >= today) &&
      (promo.max_redemptions == null || promo.redemptions_count < promo.max_redemptions);

    if (!isLive) {
      return { statusCode: 404, body: JSON.stringify({ error: "not_found", message: "Esta promoción ya no está disponible." }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        code: promo.code,
        slug: promo.slug,
        campaignName: promo.campaign_name,
        description: promo.description,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        endsAt: promo.ends_at,
      }),
    };
  } catch (err) {
    console.error("get-promotion error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
