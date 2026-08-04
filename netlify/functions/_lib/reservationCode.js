const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones

function randomSuffix(length = 4) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Ej: OB-20260810-K3F9 */
function generateReservationCode(dateStr) {
  const compact = dateStr.replace(/-/g, "");
  return `OB-${compact}-${randomSuffix()}`;
}

module.exports = { generateReservationCode };
