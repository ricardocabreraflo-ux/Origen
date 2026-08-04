const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Devuelve la rejilla fija de bloques (ej. de 2 horas) para una fecha dada,
 * según el horario de negocio configurado. No hay traslape entre bloques.
 * Devuelve [] si el negocio está cerrado ese día.
 */
function slotsForDate(dateStr, businessHours, blockMinutes) {
  const date = parseLocalDate(dateStr);
  const dayKey = WEEKDAY_KEYS[date.getDay()];
  const dayHours = businessHours[dayKey];
  if (!dayHours || !dayHours.open || !dayHours.close) return [];

  const open = toMinutes(dayHours.open);
  const close = toMinutes(dayHours.close);
  const slots = [];
  for (let start = open; start + blockMinutes <= close; start += blockMinutes) {
    slots.push({ startTime: toHHMM(start), endTime: toHHMM(start + blockMinutes) });
  }
  return slots;
}

/** true si la fecha (YYYY-MM-DD) es hoy o una fecha futura, en hora local. */
function isTodayOrFuture(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseLocalDate(dateStr).getTime() >= today.getTime();
}

module.exports = { slotsForDate, parseLocalDate, isTodayOrFuture, toMinutes, toHHMM };
