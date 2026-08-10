// Saca el número de un precio de lista tipo "$220 MXN" -> 220. Servicios
// sin precio fijo ("Valoración previa") no tienen ningún dígito y
// devuelven null, para que el monto real se capture a mano después.
function parsePriceAmount(priceLabel) {
  if (!priceLabel) return null;
  const match = String(priceLabel)
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

module.exports = { parsePriceAmount };
