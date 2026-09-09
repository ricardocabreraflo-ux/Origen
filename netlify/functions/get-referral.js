// [público] GET ?phone=... busca el código de referido de una clienta.
// POST { phone, name } lo crea si no existe todavía (una clienta puede
// tener su código desde su primera visita, no hace falta que ya tenga
// citas confirmadas).
const { getServiceClient } = require("./_lib/supabase");
const { last10 } = require("./_lib/loyalty");
const { generateReferralCode } = require("./_lib/promoCode");

async function buildResponse(supabase, referral) {
  const { data: redemptions, error } = await supabase
    .from("referral_redemptions")
    .select("referred_booking_id")
    .eq("referral_code_id", referral.id);
  if (error) throw error;

  const bookingIds = (redemptions || []).map((r) => r.referred_booking_id);
  let confirmedCount = 0;
  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("status")
      .in("id", bookingIds);
    if (bookingsError) throw bookingsError;
    confirmedCount = (bookings || []).filter((b) => b.status === "confirmed").length;
  }

  return {
    code: referral.code,
    ownerName: referral.owner_name,
    referredCount: bookingIds.length,
    confirmedCount,
  };
}

exports.handler = async (event) => {
  const supabase = getServiceClient();

  if (event.httpMethod === "GET") {
    const digits = last10(event.queryStringParameters && event.queryStringParameters.phone);
    if (digits.length < 10) {
      return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Ingresa un teléfono válido." }) };
    }
    try {
      const { data: referral, error } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("owner_phone", digits)
        .maybeSingle();
      if (error) throw error;
      if (!referral) {
        return { statusCode: 404, body: JSON.stringify({ error: "not_found", message: "Todavía no tienes un código de referido." }) };
      }
      return { statusCode: 200, body: JSON.stringify(await buildResponse(supabase, referral)) };
    } catch (err) {
      console.error("get-referral GET error", err);
      return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
    }
  }

  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "invalid_request" }) };
    }
    const digits = last10(payload.phone);
    const name = (payload.name || "").trim();
    if (digits.length < 10) return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Ingresa un teléfono válido." }) };
    if (!name) return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Falta tu nombre." }) };

    try {
      const { data: existing, error: existingError } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("owner_phone", digits)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        return { statusCode: 200, body: JSON.stringify(await buildResponse(supabase, existing)) };
      }

      // Reintenta si por mala suerte el código generado ya existía.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: created, error: insertError } = await supabase
          .from("referral_codes")
          .insert({ code: generateReferralCode(name), owner_phone: digits, owner_name: name })
          .select()
          .single();
        if (!insertError) {
          return { statusCode: 200, body: JSON.stringify(await buildResponse(supabase, created)) };
        }
        if (insertError.code !== "23505") throw insertError;
      }
      throw new Error("No se pudo generar un código único de referido.");
    } catch (err) {
      console.error("get-referral POST error", err);
      return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
};
