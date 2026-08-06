// Config no-secreta del módulo de rastreo de competencia: hashtags
// semilla, umbrales de viralidad y el brief de marca que se usa en el
// prompt de recreación con IA (RF8, sección 9 del PRD). Vive en
// data/tracking-config.json para poder editarla sin tocar código, igual
// que data/config.json para el resto del sitio.
const { loadConfig } = require("./config");

async function loadTrackingConfig() {
  const base =
    process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";
  const res = await fetch(`${base}/data/tracking-config.json`);
  if (!res.ok) {
    throw new Error(`No se pudo cargar data/tracking-config.json (${res.status})`);
  }
  const trackingConfig = await res.json();
  const siteConfig = await loadConfig();

  return {
    ...trackingConfig,
    brand: {
      name: siteConfig.name,
      tagline: siteConfig.tagline,
      brandQuote: siteConfig.brandQuote,
      services: (siteConfig.services || []).map((s) => s.name),
      ...trackingConfig.brand,
    },
  };
}

module.exports = { loadTrackingConfig };
