// Carga data/config.json desde el propio sitio publicado, para que el
// backend siempre valide contra la MISMA fuente de verdad que edita el
// panel de administración (Decap CMS) — nunca una copia separada que se
// pueda desincronizar.
async function loadConfig() {
  const base =
    process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";
  const res = await fetch(`${base}/data/config.json`);
  if (!res.ok) {
    throw new Error(`No se pudo cargar data/config.json (${res.status})`);
  }
  return res.json();
}

module.exports = { loadConfig };
