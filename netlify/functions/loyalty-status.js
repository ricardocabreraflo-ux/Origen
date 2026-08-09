const { loadConfig } = require("./_lib/config");
const { getServiceClient } = require("./_lib/supabase");
const { getLoyaltyStatus, last10 } = require("./_lib/loyalty");

exports.handler = async (event) => {
  const phone = event.queryStringParameters && event.queryStringParameters.phone;
  const digits = last10(phone);

  if (digits.length < 10) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "invalid_request", message: "Ingresa un teléfono válido." }),
    };
  }

  try {
    const config = await loadConfig();
    const supabase = getServiceClient();

    const status = await getLoyaltyStatus(supabase, config.loyalty, phone);

    const { data: pref, error: prefError } = await supabase
      .from("client_preferences")
      .select("email, notify_channel")
      .eq("phone", digits)
      .maybeSingle();
    if (prefError) throw prefError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...status,
        preference: pref ? { email: pref.email, notifyChannel: pref.notify_channel } : null,
      }),
    };
  } catch (err) {
    console.error("loyalty-status error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
