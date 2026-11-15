// Panel (requiere sesión, sección "citas"): busca si una clienta ya
// existe —por citas previas o por la agenda a mano— a partir de su
// teléfono, para autocompletar su nombre y correo en "Agendar
// manualmente" sin que la administradora tenga que volver a
// escribirlos. Mismo criterio de coincidencia que Clientas (last10).
const { getServiceClient } = require("./_lib/supabase");
const { requireSection } = require("./_lib/requireAdmin");
const { last10 } = require("./_lib/loyalty");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireSection(context, "citas");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  const digits = last10(event.queryStringParameters && event.queryStringParameters.phone);
  if (digits.length < 10) {
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

    let name = null;
    let email = null;

    (bookings || []).forEach((b) => {
      if (last10(b.customer_phone) !== digits) return;
      name = b.customer_name; // el más reciente, porque bookings viene ordenado ascendente
      if (b.customer_email) email = b.customer_email;
    });

    (manualClients || []).forEach((m) => {
      if (last10(m.phone) !== digits) return;
      if (!name) name = m.name;
      if (!email && m.email) email = m.email;
    });

    if (!name) return { statusCode: 200, body: JSON.stringify({ client: null }) };

    return { statusCode: 200, body: JSON.stringify({ client: { name, email: email || "" } }) };
  } catch (err) {
    console.error("get-client-by-phone error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
