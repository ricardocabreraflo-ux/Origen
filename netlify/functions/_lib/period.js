// Calcula el rango de fechas de un periodo de reporte (semana/mes/año) a
// partir de una fecha de referencia. Lo usan booking-report.js y
// financial-summary.js para que ambos calculen exactamente el mismo
// periodo dado el mismo periodType + referenceDate.
const { parseLocalDate } = require("./slots");

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function computeRange(periodType, referenceDate) {
  const ref = parseLocalDate(referenceDate);

  if (periodType === "week") {
    const offset = (ref.getDay() + 6) % 7; // lunes = 0
    const start = addDays(ref, -offset);
    const end = addDays(start, 6);
    return { start, end, bucketBy: "day" };
  }

  if (periodType === "year") {
    const start = new Date(ref.getFullYear(), 0, 1);
    const end = new Date(ref.getFullYear(), 11, 31);
    return { start, end, bucketBy: "month" };
  }

  // month (default)
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { start, end, bucketBy: "day" };
}

module.exports = { computeRange, toISODate, addDays };
