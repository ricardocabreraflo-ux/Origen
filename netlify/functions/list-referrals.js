// [admin] Lista todos los códigos de referido con cuántas citas generó
// cada uno, para el panel admin/promos.html.
const { getServiceClient } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/requireAdmin");

exports.handler = async (event, context) => {
  try {
    requireAdmin(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  try {
    const supabase = getServiceClient();

    const { data: referrals, error } = await supabase
      .from("referral_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!referrals || referrals.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ referrals: [] }) };
    }

    const { data: redemptions, error: redemptionsError } = await supabase
      .from("referral_redemptions")
      .select("referral_code_id, reward_status, referred_booking_id");
    if (redemptionsError) throw redemptionsError;

    const bookingIds = [...new Set((redemptions || []).map((r) => r.referred_booking_id))];
    let statusByBooking = {};
    if (bookingIds.length > 0) {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, status")
        .in("id", bookingIds);
      if (bookingsError) throw bookingsError;
      statusByBooking = Object.fromEntries((bookings || []).map((b) => [b.id, b.status]));
    }

    const list = referrals.map((r) => {
      const own = (redemptions || []).filter((rd) => rd.referral_code_id === r.id);
      const confirmedCount = own.filter((rd) => statusByBooking[rd.referred_booking_id] === "confirmed").length;
      const rewardsGranted = own.filter((rd) => rd.reward_status === "granted").length;
      return {
        code: r.code,
        ownerName: r.owner_name,
        ownerPhone: r.owner_phone,
        createdAt: r.created_at,
        referredCount: own.length,
        confirmedCount,
        rewardsGranted,
      };
    });

    return { statusCode: 200, body: JSON.stringify({ referrals: list }) };
  } catch (err) {
    console.error("list-referrals error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
