// Aperturas especiales de horario que la dueña arma desde el panel de
// Citas (tabla schedule_openings): permite abrir un día que normalmente
// está cerrado, o cambiar el horario de un día ya abierto, para un rango
// de horas específico. Es lo contrario de schedule_blocks.
//
// Mejor esfuerzo: si la tabla todavía no existe en Supabase (falta correr
// la migración) o falla la consulta por cualquier otra razón, no debe
// tumbar el cálculo de disponibilidad del sitio completo — simplemente se
// asume que no hay apertura especial para esa fecha.
async function getOpeningForDate(supabase, dateStr) {
  try {
    const { data, error } = await supabase.from("schedule_openings").select("*").eq("opening_date", dateStr).maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("getOpeningForDate error (se ignora, se asume sin apertura especial)", err);
    return null;
  }
}

module.exports = { getOpeningForDate };
