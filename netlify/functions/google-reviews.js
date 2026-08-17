// Trae las reseñas públicas de Google Maps del negocio (Places API New) y
// solo deja pasar las de "minRating" estrellas o más, para mostrarlas como
// testimonios en la página sin que nadie tenga que copiarlas a mano.
//
// Limitación de la propia API de Google: solo entrega hasta 5 reseñas por
// negocio (las que Google considera "más relevantes"), no todas las que
// existen en Maps — no hay forma de pedir más vía API oficial.
const { loadConfig } = require("./_lib/config");

exports.handler = async () => {
  try {
    const config = await loadConfig();
    const placeId = config.reviews && config.reviews.googlePlaceId;
    const minRating = (config.reviews && config.reviews.minRating) || 4;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!placeId || !apiKey) {
      return { statusCode: 200, body: JSON.stringify({ reviews: [] }) };
    }

    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=es`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "reviews",
      },
    });

    if (!res.ok) {
      throw new Error(`Places API respondió ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const reviews = (data.reviews || [])
      .filter((r) => (r.rating || 0) >= minRating)
      .map((r) => ({
        author: (r.authorAttribution && r.authorAttribution.displayName) || "Clienta de Origen Brows",
        rating: r.rating,
        quote: (r.text && r.text.text) || (r.originalText && r.originalText.text) || "",
      }))
      .filter((r) => r.quote);

    return {
      statusCode: 200,
      // Cache corto: son datos públicos de Google, no hace falta pedirlos en cada visita.
      headers: { "Cache-Control": "public, max-age=21600" },
      body: JSON.stringify({ reviews }),
    };
  } catch (err) {
    console.error("google-reviews error", err);
    // Mejor esfuerzo: si Google falla, la página cae de vuelta a los
    // testimonios manuales del CMS en vez de romper la sección.
    return { statusCode: 200, body: JSON.stringify({ reviews: [] }) };
  }
};
