// Función programada (ver netlify.toml) que corre cada 6 horas y hace todo
// el pipeline de rastreo de competencia (RF3 a RF8 del PRD):
//   1. Trae posts nuevos de las cuentas activas (Apify).
//   2. Calcula el engagement relativo al histórico de cada cuenta.
//   3. Marca como viral el post que supere el umbral configurado.
//   4. Genera con Claude el análisis + borrador de recreación.
//   5. Guarda la alerta y avisa por Telegram.
const { getServiceClient } = require("./_lib/supabase");
const { fetchProfilePosts } = require("./_lib/apify");
const { sendTelegramMessage } = require("./_lib/telegram");
const { askClaude, extractJson } = require("./_lib/anthropic");
const { loadTrackingConfig } = require("./_lib/trackingConfig");

function mapFormat(item) {
  if (item.productType === "clips" || (item.type === "Video" && item.isReel)) return "reel";
  if (item.type === "Video") return "reel";
  if (item.type === "Sidecar") return "carousel";
  if (item.type === "Image") return "image";
  return "unknown";
}

// El Apify Instagram Scraper no siempre trae seguidores en el mismo
// campo según el modo de scraping usado; se buscan los nombres más
// comunes y, si no aparece ninguno, se usa 1 como neutro.
//
// Nota: como los seguidores de una cuenta son (casi) constantes entre un
// post y el siguiente, comparar "interacciones / seguidores" contra su
// promedio histórico da exactamente el mismo resultado que comparar
// "interacciones" contra el promedio histórico de interacciones — el
// divisor se cancela. Por eso no es crítico tener el número de
// seguidores exacto para que la detección de viralidad funcione bien.
function extractFollowers(item) {
  return item.ownerFollowersCount || item.ownersFollowersCount || item.followersCount || null;
}

function buildPostRow(competitorId, item) {
  const likes = item.likesCount ?? 0;
  const comments = item.commentsCount ?? 0;
  return {
    competitor_id: competitorId,
    ig_post_id: String(item.id || item.shortCode || item.url),
    permalink: item.url,
    format: mapFormat(item),
    caption: (item.caption || "").slice(0, 2000),
    hashtags: item.hashtags || [],
    posted_at: item.timestamp || new Date().toISOString(),
    likes_count: likes,
    comments_count: comments,
    raw_data: item,
  };
}

async function recomputeViral(supabase, competitor, thresholds) {
  const { data: posts, error } = await supabase
    .from("competitor_posts")
    .select("*")
    .eq("competitor_id", competitor.id)
    .order("posted_at", { ascending: true });

  if (error || !posts) return { newlyViral: [], latestBaseline: null };

  const followers = competitor.followers_count || 1;
  const newlyViral = [];
  let latestBaseline = null;

  for (let i = 0; i < posts.length; i += 1) {
    const priorWindow = posts
      .slice(Math.max(0, i - thresholds.baselineWindow), i)
      .map((p) => p.likes_count + p.comments_count);

    if (priorWindow.length < thresholds.minPostsForBaseline) continue;

    const baselineInteractions =
      priorWindow.reduce((sum, v) => sum + v, 0) / priorWindow.length;
    const postInteractions = posts[i].likes_count + posts[i].comments_count;
    const isViral = postInteractions >= thresholds.engagementMultiplier * baselineInteractions;

    const engagementRate = postInteractions / followers;
    const baselineRate = baselineInteractions / followers;
    latestBaseline = baselineRate;

    const wasViral = posts[i].is_viral;
    const update = {
      engagement_rate: engagementRate,
      baseline_engagement_rate: baselineRate,
      is_viral: isViral,
      viral_reason: isViral
        ? `${postInteractions} interacciones vs. promedio histórico de ${baselineInteractions.toFixed(1)} (≥ ${thresholds.engagementMultiplier}x)`
        : null,
    };

    await supabase.from("competitor_posts").update(update).eq("id", posts[i].id);

    if (isViral && !wasViral) {
      newlyViral.push({ ...posts[i], ...update });
    }
  }

  return { newlyViral, latestBaseline };
}

async function generateAnalysisAndRecreation(post, competitor, brand) {
  const system = `Eres un estratega de contenido y growth para una marca de belleza en Instagram.
Marca: ${brand.name}. Tono: ${brand.tone}
Público objetivo: ${brand.audience}
Prohibiciones: ${(brand.prohibitions || []).join("; ")}

Regla no negociable: debes recrear el FORMATO y la TÉCNICA del post que te paso (estructura, gancho, ritmo), nunca copiar su texto, guion, ideas específicas o elementos visuales palabra por palabra. Si el resultado se ve como copia del original, está mal.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con esta forma exacta:
{
  "analysis": { "format": string, "hook": string, "structure": string, "topic": string, "cta": string },
  "recreation": { "angle": string, "script": string, "copy": string, "hashtags": [string], "differentiation_note": string }
}`;

  const userContent = `Post de un competidor que se volvió viral:
Formato: ${post.format}
Caption: ${post.caption || "(sin caption)"}
Hashtags: ${(post.hashtags || []).join(", ") || "(ninguno)"}
Likes: ${post.likes_count} · Comentarios: ${post.comments_count}
Por qué se considera viral: ${post.viral_reason}`;

  const text = await askClaude({
    system,
    messages: [{ role: "user", content: userContent }],
  });
  return extractJson(text);
}

exports.handler = async () => {
  const supabase = getServiceClient();
  const trackingConfig = await loadTrackingConfig();
  const thresholds = trackingConfig.viralThresholds;

  const { data: competitors, error: competitorsError } = await supabase
    .from("competitors")
    .select("*")
    .eq("active", true);

  if (competitorsError) {
    console.error("track-pipeline: error leyendo competidores", competitorsError);
    return { statusCode: 500 };
  }
  if (!competitors || competitors.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ note: "Sin competidores activos" }) };
  }

  let items = [];
  try {
    items = await fetchProfilePosts(
      competitors.map((c) => c.username),
      trackingConfig.fetch?.postsPerCompetitorPerRun || 12
    );
  } catch (err) {
    console.error("track-pipeline: error consultando Apify", err);
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }

  const byUsername = new Map(competitors.map((c) => [c.username.toLowerCase(), c]));
  const itemsByCompetitor = new Map();
  for (const item of items) {
    const username = (item.ownerUsername || "").toLowerCase();
    const competitor = byUsername.get(username);
    if (!competitor) continue;
    if (!itemsByCompetitor.has(competitor.id)) itemsByCompetitor.set(competitor.id, []);
    itemsByCompetitor.get(competitor.id).push(item);
  }

  let newAlerts = 0;

  for (const competitor of competitors) {
    const competitorItems = itemsByCompetitor.get(competitor.id) || [];

    if (competitorItems.length > 0) {
      const rows = competitorItems.map((item) => buildPostRow(competitor.id, item));
      const { error: upsertError } = await supabase
        .from("competitor_posts")
        .upsert(rows, { onConflict: "competitor_id,ig_post_id" });
      if (upsertError) {
        console.error(`track-pipeline: error guardando posts de ${competitor.username}`, upsertError);
        continue;
      }

      const followers = competitorItems.map(extractFollowers).find(Boolean);
      if (followers) {
        await supabase.from("competitors").update({ followers_count: followers }).eq("id", competitor.id);
        competitor.followers_count = followers;
      }
    }

    const { newlyViral, latestBaseline } = await recomputeViral(supabase, competitor, thresholds);

    await supabase
      .from("competitors")
      .update({ last_fetched_at: new Date().toISOString(), avg_engagement_rate: latestBaseline })
      .eq("id", competitor.id);

    for (const post of newlyViral) {
      let analysis = null;
      let recreation = null;
      try {
        const result = await generateAnalysisAndRecreation(post, competitor, trackingConfig.brand);
        analysis = result.analysis;
        recreation = result.recreation;
      } catch (err) {
        console.error(`track-pipeline: error generando recreación para post ${post.id}`, err);
      }

      const { data: alert, error: alertError } = await supabase
        .from("viral_alerts")
        .insert({ post_id: post.id, analysis, recreation })
        .select()
        .single();

      if (alertError) {
        console.error(`track-pipeline: error guardando alerta para post ${post.id}`, alertError);
        continue;
      }
      newAlerts += 1;

      const angleLine = recreation?.angle ? `\n💡 Ángulo sugerido: ${recreation.angle}` : "";
      const message =
        `🚨 *Post viral detectado*\n` +
        `Cuenta: @${competitor.username}\n` +
        `${post.permalink}\n` +
        `❤️ ${post.likes_count} · 💬 ${post.comments_count}\n` +
        `Por qué: ${post.viral_reason}` +
        angleLine +
        `\n\nRevisa el borrador completo en el panel de competencia.`;

      try {
        await sendTelegramMessage(message);
        await supabase
          .from("viral_alerts")
          .update({ telegram_sent_at: new Date().toISOString() })
          .eq("id", alert.id);
      } catch (err) {
        console.error(`track-pipeline: error enviando Telegram para alerta ${alert.id}`, err);
        await supabase.from("viral_alerts").update({ telegram_error: String(err) }).eq("id", alert.id);
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ competitors: competitors.length, newAlerts }) };
};
