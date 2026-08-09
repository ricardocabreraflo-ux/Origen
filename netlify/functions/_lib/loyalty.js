// Compara solo los últimos 10 dígitos de un teléfono, así no importa si
// alguien guardó el "52" de código de país en unas citas y en otras no.
function last10(phoneRaw) {
  return (phoneRaw || "").replace(/\D/g, "").slice(-10);
}

/**
 * Calcula el estado de la tarjeta de lealtad de una clienta a partir de
 * sus citas confirmadas. `confirmedPhones` es un arreglo de customer_phone
 * (una entrada por cada cita confirmada, sin filtrar).
 */
function computeLoyaltyStatus(confirmedPhones, phoneRaw, loyaltyConfig) {
  const cycleSize = (loyaltyConfig && loyaltyConfig.cycleSize) || 5;
  const discountPercent = (loyaltyConfig && loyaltyConfig.discountPercent) || 20;
  const target = last10(phoneRaw);

  const visits = (confirmedPhones || []).filter((p) => last10(p) === target).length;
  const inCycle = visits % cycleSize;
  const hasReward = visits > 0 && inCycle === 0;

  return {
    visits,
    cycleSize,
    discountPercent,
    progress: hasReward ? cycleSize : inCycle,
    remaining: hasReward ? 0 : cycleSize - inCycle,
    hasReward,
  };
}

async function getLoyaltyStatus(supabase, loyaltyConfig, phoneRaw) {
  const { data, error } = await supabase.from("bookings").select("customer_phone").eq("status", "confirmed");
  if (error) throw error;
  return computeLoyaltyStatus((data || []).map((b) => b.customer_phone), phoneRaw, loyaltyConfig);
}

module.exports = { last10, computeLoyaltyStatus, getLoyaltyStatus };
