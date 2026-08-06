// Cliente mínimo para Apify (proveedor de datos recomendado en el PRD,
// sección 7 — Instagram no tiene API pública para leer cuentas de
// terceros, así que la extracción se delega a un proveedor especializado
// en vez de hacer scraping propio).
//
// Usa el endpoint "run-sync-get-dataset-items", que corre el actor y
// devuelve los resultados directamente en la respuesta (sin tener que
// hacer polling de un run asíncrono aparte).

const APIFY_INSTAGRAM_PROFILE_ACTOR = "apify~instagram-scraper";
const APIFY_INSTAGRAM_HASHTAG_ACTOR = "apify~instagram-hashtag-scraper";

async function runApifyActor(actorId, input, { timeoutSecs = 120 } = {}) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("Falta la variable de entorno APIFY_TOKEN");
  }

  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Apify (${actorId}) respondió ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

// Trae los posts más recientes de un conjunto de cuentas públicas.
function fetchProfilePosts(usernames, resultsLimit = 30) {
  return runApifyActor(APIFY_INSTAGRAM_PROFILE_ACTOR, {
    directUrls: usernames.map((u) => `https://www.instagram.com/${u}/`),
    resultsType: "posts",
    resultsLimit,
    addParentData: false,
  });
}

// Descubre posts/cuentas nuevas a partir de hashtags semilla (RF1).
function fetchHashtagPosts(hashtags, resultsLimit = 50) {
  return runApifyActor(APIFY_INSTAGRAM_HASHTAG_ACTOR, {
    hashtags,
    resultsLimit,
  });
}

module.exports = { runApifyActor, fetchProfilePosts, fetchHashtagPosts };
