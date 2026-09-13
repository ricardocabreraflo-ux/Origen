const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones

function randomSuffix(length = 4) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** A partir de "Verano Origen" genera algo como "VERANOORIGEN-K3F9". */
function generatePromoCode(seed) {
  const clean = String(seed || "PROMO")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 14);
  return `${clean || "PROMO"}-${randomSuffix()}`;
}

/** A partir de "Ana López" genera algo como "REF-ANA-K3F9". */
function generateReferralCode(name) {
  const clean = String(name || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "")
    .slice(0, 8);
  return `REF-${clean || "ORIGEN"}-${randomSuffix()}`;
}

/** A partir de "Verano Origen" genera el slug "verano-origen" para /promo-:slug. */
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

module.exports = { generatePromoCode, generateReferralCode, slugify };
