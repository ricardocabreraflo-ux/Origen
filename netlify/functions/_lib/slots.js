const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Cada cuánto se ofrece un horario candidato dentro del día. Como los
// servicios ya no duran todos lo mismo, en vez de una rejilla fija de
// bloques iguales generamos posibles inicios cada 40 minutos y luego
// filtramos los que se traslapan con citas existentes. Con esto se ven
// menos botones de horario sin perder la posibilidad de elegir.
const SLOT_STEP_MINUTES = 40;

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
 *
 * `fixedSlots` es opcional — para servicios largos (ej. Botox Capilar,
 * Keratina Alisante) en vez de la rejilla normal se ofrecen solo un par
 * de horarios fijos definidos en el servicio (`{ weekday: [...], saturday:
 * [...] }`), para no dejar el día casi bloqueado con un solo servicio de
 * varias horas. Igual se filtran por horario de negocio como candidatos
 * normales, y luego `markAvailability` los cruza contra citas ya existentes.
 *
 * `opening` es opcional — una apertura especial (tabla schedule_openings)
 * que la dueña armó a mano para esta fecha exacta. Si viene, define el
 * horario efectivo del día (start_time–end_time) por completo, sin
 * importar si el día está cerrado por `businessHours`/`closedDates` — es
 * lo contrario de un bloqueo: abre un hueco donde normalmente no se podría
 * reservar.
 */
function slotsForDate(dateStr, businessHours, durationMinutes, closedDates, fixedSlots, opening) {
  const date = parseLocalDate(dateStr);
  const dayKey = WEEKDAY_KEYS[date.getDay()];

  let open, close;
  if (opening) {
    open = toMinutes(opening.start_time.slice(0, 5));
    close = toMinutes(opening.end_time.slice(0, 5));
  } else {
    if (findClosedDate(dateStr, closedDates)) return [];
    const dayHours = businessHours[dayKey];
    if (!dayHours || !dayHours.open || !dayHours.close) return [];
    open = toMinutes(dayHours.open);
    close = toMinutes(dayHours.close);
  }

  if (fixedSlots) {
    const times = (dayKey === "sat" ? fixedSlots.saturday : fixedSlots.weekday) || [];
    return times
      .map((t) => toMinutes(t))
      .filter((start) => start >= open && start + durationMinutes <= close)
      .map((start) => ({ startTime: toHHMM(start), endTime: toHHMM(start + durationMinutes) }));
  }

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
 * empezar pegada a la anterior. El margen solo aplica DESPUÉS de cada
 * cita, no antes.
 *
 * `blocks` son bloqueos de horario que la dueña armó a mano (ej. "cerrado
 * de 2 a 4pm") — ocupan exactamente su rango, sin colchón extra.
 */
function markAvailability(candidateSlots, existingBookings, bufferMinutes, blocks = []) {
  const occupied = existingBookings
    .map((b) => ({
      start: toMinutes(b.start_time.slice(0, 5)),
      end: toMinutes(b.end_time.slice(0, 5)) + bufferMinutes,
    }))
    .concat(
      (blocks || []).map((b) => ({
        start: toMinutes(b.start_time.slice(0, 5)),
        end: toMinutes(b.end_time.slice(0, 5)),
      }))
    );

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
