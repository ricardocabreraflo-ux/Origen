const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Cada cuánto se ofrece un horario candidato dentro del día. Como los
// servicios ya no duran todos lo mismo, en vez de una rejilla fija de
// bloques iguales generamos posibles inicios cada 15 minutos y luego
// filtramos los que se traslapan con citas existentes.
const SLOT_STEP_MINUTES = 15;

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
 * Devuelve los horarios candidatos (cada SLOT_STEP_MINUTES) donde un
 * servicio de `durationMinutes` cabría antes de la hora de cierre, según
 * el horario de negocio configurado. No considera todavía citas
 * existentes — eso se filtra aparte con `markAvailability`.
 */
function slotsForDate(dateStr, businessHours, durationMinutes) {
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
 * citas activas del día. Cada cita existente "ocupa" desde su inicio hasta
 * su fin + el colchón de limpieza, para que la siguiente cita no pueda
 * empezar pegada a la anterior.
 */
function markAvailability(candidateSlots, existingBookings, bufferMinutes) {
  const occupied = existingBookings.map((b) => ({
    start: toMinutes(b.start_time.slice(0, 5)),
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
  parseLocalDate,
  isTodayOrFuture,
  toMinutes,
  toHHMM,
};
