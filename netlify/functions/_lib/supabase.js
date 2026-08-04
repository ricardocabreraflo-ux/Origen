const { createClient } = require("@supabase/supabase-js");

// Usa la Service Role Key: solo existe en el servidor (Netlify Functions),
// nunca se envía al navegador. Se salta Row Level Security a propósito,
// porque estas funciones SON la única puerta de entrada a la tabla.
function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan las variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { getServiceClient };
