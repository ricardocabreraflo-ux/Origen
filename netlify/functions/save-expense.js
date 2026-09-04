const { getServiceClient } = require("./_lib/supabase");
const { requireSection } = require("./_lib/requireAdmin");

const CATEGORIES = ["renta", "insumos", "servicios", "sueldo", "marketing", "mantenimiento", "inversion", "otro"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

function addMonthsToDateStr(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireSection(context, "finanzas");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("JSON inválido.");
  }

  const { id, description, category, amount, kind, expenseDate, startDate, endDate, amortizeMonths, notes } = payload;
  const active = payload.active === undefined ? true : Boolean(payload.active);

  if (!description || !description.trim()) return badRequest("Falta la descripción del gasto.");
  if (!CATEGORIES.includes(category)) return badRequest("Categoría inválida.");
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return badRequest("El monto debe ser un número mayor a 0.");
  if (!["variable", "fixed", "investment"].includes(kind)) {
    return badRequest("El tipo debe ser 'variable', 'fixed' o 'investment'.");
  }

  const row = {
    description: description.trim(),
    category,
    amount: amountNum,
    kind,
    notes: (notes || "").trim() || null,
    active,
  };

  if (kind === "variable") {
    if (!expenseDate || !DATE_RE.test(expenseDate)) return badRequest("Falta la fecha del gasto.");
    row.expense_date = expenseDate;
    row.start_date = null;
    row.end_date = null;
    row.amortize_months = null;
  } else if (kind === "fixed") {
    if (!startDate || !DATE_RE.test(startDate)) return badRequest("Falta desde cuándo aplica este gasto fijo.");
    if (endDate && !DATE_RE.test(endDate)) return badRequest("Fecha final inválida.");
    row.expense_date = null;
    row.start_date = startDate;
    row.end_date = endDate || null;
    row.amortize_months = null;
  } else {
    // investment: monto TOTAL repartido entre amortizeMonths meses desde startDate.
    if (!startDate || !DATE_RE.test(startDate)) return badRequest("Falta desde cuándo empieza a contar esta inversión.");
    const months = Number(amortizeMonths);
    if (!Number.isInteger(months) || months <= 0) return badRequest("El plazo debe ser un número de meses mayor a 0.");
    row.expense_date = null;
    row.start_date = startDate;
    row.end_date = addMonthsToDateStr(startDate, months);
    row.amortize_months = months;
  }

  try {
    const supabase = getServiceClient();
    const query = id
      ? supabase.from("expenses").update(row).eq("id", id).select().single()
      : supabase.from("expenses").insert(row).select().single();

    const { data, error } = await query;
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ expense: data }) };
  } catch (err) {
    console.error("save-expense error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo guardar el gasto." }) };
  }
};
