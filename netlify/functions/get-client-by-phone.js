// Panel (requiere sesión, sección "citas" o "clientas"): busca si una
// clienta ya existe —por citas previas o por la agenda a mano— a
// partir de su teléfono O de su nombre, para autocompletar el resto de
// sus datos en cualquier formulario que lo use ("Agendar
// manualmente", "Registrar cita directa", "Agregar clienta") sin que
// la administradora tenga que volver a escribirlos. Mismo criterio de
// coincidencia que Clientas (last10).
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin, getUserSections } = require("./_lib/requireAdmin");
const { last10 } = require("./_lib/loyalty");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const user = requireAdmin(context);
    const sections = getUserSections(user);
    if (!sections.includes("citas") && !sections.includes("clientas")) {
      return { statusCode: 403, body: JSON.stringify({ error: "unauthorized" }) };
    }
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  const qs = event.queryStringParameters || {};
  const phoneQuery = last10(qs.phone);
  const nameQuery = (qs.name || "").trim().toLowerCase();

  if (phoneQuery.length < 10 && !nameQuery) {
    return { statusCode: 200, body: JSON.stringify({ client: null }) };
  }

  try {
    const supabase = getServiceClient();

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("customer_name, customer_phone, customer_email, created_at")
      .order("created_at", { ascending: true });
    if (bookingsError) throw bookingsError;

    const { data: manualClients, error: manualError } = await supabase
      .from("manual_clients")
      .select("name, phone, email, created_at")
      .order("created_at", { ascending: true });
    if (manualError) throw manualError;

    // Une todo en una sola lista por teléfono (igual que Clientas), para
    // poder buscar tanto por teléfono como por nombre sobre los mismos
    // datos ya combinados.
    const byPhone = new Map();

    (bookings || []).forEach((b) => {
      const key = last10(b.customer_phone);
      if (!key) return;
      const existing = byPhone.get(key) || { name: null, phone: key, email: null };
      existing.name = b.customer_name; // el más reciente, porque bookings viene ordenado ascendente
      if (b.customer_email) existing.email = b.customer_email;
      byPhone.set(key, existing);
    });

    (manualClients || []).forEach((m) => {
      const key = last10(m.phone);
      if (!key) return;
      const existing = byPhone.get(key);
      if (existing) {
        if (!existing.name) existing.name = m.name;
        if (!existing.email && m.email) existing.email = m.email;
      } else {
        byPhone.set(key, { name: m.name, phone: key, email: m.email || null });
      }
    });

    let client = null;

    if (phoneQuery.length >= 10) {
      const found = byPhone.get(phoneQuery);
      if (found && found.name) client = found;
    } else if (nameQuery) {
      const matches = Array.from(byPhone.values()).filter((c) => c.name && c.name.trim().toLowerCase() === nameQuery);
      // Si hay más de una clienta con el mismo nombre, no se adivina
      // cuál es — mejor no autocompletar que autocompletar mal.
      if (matches.length === 1) client = matches[0];
    }

    if (!client) return { statusCode: 200, body: JSON.stringify({ client: null }) };

    return { statusCode: 200, body: JSON.stringify({ client: { name: client.name, phone: client.phone, email: client.email || "" } }) };
  } catch (err) {
    console.error("get-client-by-phone error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
