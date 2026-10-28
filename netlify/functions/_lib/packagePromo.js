// Resuelve un código de promoción "paquete" (ej. "6 sesiones por $999")
// para citas creadas a mano desde el panel (admin-create-booking.js) — la
// misma lógica que usa create-booking.js del lado público, para que el
// conteo de sesiones sea el mismo sin importar quién agende: la clienta
// o la administradora.
const { last10 } = require("./loyalty");

class CodeError extends Error {}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function resolvePackagePromo(supabase, rawCode, customerPhone, serviceId) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return null;

  const today = todayStr();
  const { data: promo, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("code", code)
    .eq("kind", "campaign")
    .maybeSingle();
  if (error) throw error;
  if (!promo) throw new CodeError("No encontramos ese código.");
  if (!promo.active) throw new CodeError("Ese código ya no está activo.");
  if (promo.starts_at && promo.starts_at > today) throw new CodeError("Ese código todavía no empieza a aplicar.");
  if (promo.ends_at && promo.ends_at < today) throw new CodeError("Ese código ya venció.");
  if (Array.isArray(promo.service_ids) && promo.service_ids.length && !promo.service_ids.includes(serviceId)) {
    throw new CodeError("Ese código no aplica al servicio que elegiste.");
  }
  if (!promo.is_package) return { promo, packageSessionNumber: null };

  const target = last10(customerPhone);
  const { data: priorUses, error: priorUsesError } = await supabase
    .from("bookings")
    .select("customer_phone")
    .eq("promo_code", promo.code)
    .in("status", ["pending", "confirmed"]);
  if (priorUsesError) throw priorUsesError;
  const sessionsUsed = (priorUses || []).filter((b) => last10(b.customer_phone) === target).length;
  const totalSessions = promo.package_total_sessions || 1;
  if (sessionsUsed >= totalSessions) {
    throw new CodeError(`Ya usaste las ${totalSessions} sesiones de este paquete.`);
  }
  return { promo, packageSessionNumber: sessionsUsed + 1 };
}

module.exports = { CodeError, resolvePackagePromo };
