// Función programada (ver netlify.toml) que corre una vez por semana y
// descubre cuentas competidoras nuevas a partir de los hashtags semilla
// del nicho (RF1). Las cuentas descubiertas entran como "candidatas"
// (active = false, source = 'discovered') para que Ricardo las apruebe a
// mano desde el panel — el sistema propone, la persona decide.
const { getServiceClient } = require("./_lib/supabase");
const { fetchHashtagPosts } = require("./_lib/apify");
const { loadTrackingConfig } = require("./_lib/trackingConfig");

exports.handler = async () => {
  const supabase = getServiceClient();
  const trackingConfig = await loadTrackingConfig();

  // Recomendación del PRD (sección 15): asegurar que la lista semilla
  // manual de competidores conocidos siempre exista, aunque el objetivo
  // final sea el descubrimiento automático — da datos reales para
  // calibrar los umbrales de viralidad mucho más rápido.
  const seedCompetitors = trackingConfig.seedCompetitors || [];
  if (seedCompetitors.length > 0) {
    await supabase
      .from("competitors")
      .upsert(
        seedCompetitors.map((username) => ({
          username: username.replace(/^@/, "").toLowerCase(),
          active: true,
          source: "manual",
        })),
        { onConflict: "username", ignoreDuplicates: true }
      );
  }

  const seedHashtags = trackingConfig.seedHashtags || [];
  if (seedHashtags.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ discovered: 0, note: "Sin hashtags semilla configurados" }),
    };
  }

  let items = [];
  try {
    items = await fetchHashtagPosts(seedHashtags, 60);
  } catch (err) {
    console.error("track-discover-competitors: error consultando Apify", err);
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }

  const candidateUsernames = [
    ...new Set(
      items
        .map((item) => item.ownerUsername || item.owner?.username)
        .filter(Boolean)
        .map((u) => u.toLowerCase())
    ),
  ];

  if (candidateUsernames.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ discovered: 0 }) };
  }

  const { data: existing } = await supabase
    .from("competitors")
    .select("username")
    .in("username", candidateUsernames);
  const existingSet = new Set((existing || []).map((c) => c.username));
  const newUsernames = candidateUsernames.filter((u) => !existingSet.has(u));

  if (newUsernames.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ discovered: 0 }) };
  }

  const { error } = await supabase.from("competitors").insert(
    newUsernames.map((username) => ({
      username,
      active: false,
      source: "discovered",
    }))
  );

  if (error) {
    console.error("track-discover-competitors: error guardando candidatos", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ discovered: newUsernames.length }) };
};
