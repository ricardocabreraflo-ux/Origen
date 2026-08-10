const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Cada cuánto se ofrece un horario candidato dentro del día. Como los
// servicios ya no duran todos lo mismo, en vez de una rejilla fija de
// bloques iguales generamos posibles inicios cada 30 minutos y luego
// filtramos los que se traslapan con citas existentes. Con esto se ven
// menos botones de horario sin perder la posibilidad de elegir.
const SLOT_STEP_MINUTES = 30;

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

/** Devuelve la entrada de closedDates que corresponde a dateStr, o null. */
function findClosedDate(dateStr, closedDates) {
  return (closedDates || []).find((c) => c.date === dateStr) || null;
}

/**
 * true si dateStr cae dentro de la ventana de reservas permitida: desde hoy
 * hasta `maxAdvanceMonths` meses adelante.
 */
function isWithinBookingWindow(dateStr, maxAdvanceMonths) {
  const date = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getFullYear(), today.getMonth() + (maxAdvanceMonths || 2), today.getDate());
  return date.getTime() <= maxDate.getTime();
}

/**
 * Devuelve los horarios candidatos (cada SLOT_STEP_MINUTES) donde un
 * servicio de `durationMinutes` cabría antes de la hora de cierre, según
 * el horario de negocio configurado. No considera todavía citas
 * existentes — eso se filtra aparte con `markAvailability`. Devuelve []
 * si el negocio está cerrado ese día (fin de semana sin horario, o un
 * día festivo marcado en `closedDates`).
 */
function slotsForDate(dateStr, businessHours, durationMinutes, closedDates) {
  if (findClosedDate(dateStr, closedDates)) return [];

  const date = parseLocalDate(dateStr);
  const dayKey = WEEKDAY_KEYS[date.getDay()];
  const dayHours = businessHours[dayKey];
  if (!dayHours || !dayHours.open || !dayHours.close) return [];

  const open = toMinutes(dayHours.open);
  const close = toMinutes(dayHours.close);
  const slots = [];
  for (let start = open; start + durationMinutes <= close; start += SLOT_STEP_MINUTES) {
    slots.push({ startTime: toHHMM(start), endTime: toHHMM(start + durationMinutes) });
  }
  return slots;
}

/** true si los intervalos [aStart, aEnd) y [bStart, bEnd) se traslapan. */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Marca cada slot candidato como disponible o no, comparándolo contra las
 * citas activas del día. Cada cita existente "ocupa" su duración real más
 * el colchón de limpieza de los DOS lados (antes y después), para que
 * ningún horario candidato pueda quedar pegado a otra cita ya reservada,
 * sin importar si el candidato va antes o después de ella.
 */
function markAvailability(candidateSlots, existingBookings, bufferMinutes) {
  const occupied = existingBookings.map((b) => ({
    start: toMinutes(b.start_time.slice(0, 5)) - bufferMinutes,
    end: toMinutes(b.end_time.slice(0, 5)) + bufferMinutes,
  }));

  return candidateSlots.map((slot) => {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    const available = !occupied.some((o) => rangesOverlap(start, end, o.start, o.end));
    return { ...slot, available };
  });
}

/** true si la fecha (YYYY-MM-DD) es hoy o una fecha futura, en hora local. */
function isTodayOrFuture(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseLocalDate(dateStr).getTime() >= today.getTime();
}

module.exports = {
  slotsForDate,
  markAvailability,
  rangesOverlap,
  findClosedDate,
  isWithinBookingWindow,
  parseLocalDate,
  isTodayOrFuture,
  toMinutes,
  toHHMM,
};
