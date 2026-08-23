// Aperturas especiales de horario que la dueña arma desde el panel de
// Citas (tabla schedule_openings): permite abrir un día que normalmente
// está cerrado, o cambiar el horario de un día ya abierto, para un rango
// de horas específico. Es lo contrario de schedule_blocks.
async function getOpeningForDate(supabase, dateStr) {
  const { data, error } = await supabase.from("schedule_openings").select("*").eq("opening_date", dateStr).maybeSingle();
  if (error) throw error;
  return data || null;
}

module.exports = { getOpeningForDate };
