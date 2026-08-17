// Bloqueos de calendario que la dueña arma desde el panel de Citas
// (tabla schedule_blocks): un día completo bloqueado, o solo un rango de
// horas dentro de un día que por lo demás está abierto.
async function getBlocksForDate(supabase, dateStr) {
  const { data, error } = await supabase.from("schedule_blocks").select("*").eq("block_date", dateStr);
  if (error) throw error;

  const blocks = data || [];
  const fullDayBlock = blocks.find((b) => !b.start_time && !b.end_time) || null;
  const partialBlocks = blocks
    .filter((b) => b.start_time && b.end_time)
    .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));

  return { fullDayBlock, partialBlocks };
}

module.exports = { getBlocksForDate };
