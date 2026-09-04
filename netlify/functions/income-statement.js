// Estado de resultados: ingresos, gastos y utilidad de cada uno de los
// últimos N meses de calendario, para llevar la contabilidad mes a mes
// (no solo el mes actual, como en financial-summary.js).
const { getServiceClient } = require("./_lib/supabase");
const { requireSection } = require("./_lib/requireAdmin");
const { computeRange, toISODate } = require("./_lib/period");

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DAYS_PER_MONTH = 30.4;

function overlapDays(aStart, aEnd, bStart, bEnd) {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

function monthlyEquivalent(expense) {
  if (expense.kind === "investment") {
    return Number(expense.amount) / Number(expense.amortize_months);
  }
  return Number(expense.amount);
}

exports.handler = async (event, context) => {
  try {
    requireSection(context, "finanzas");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  const params = event.queryStringParameters || {};
  const monthsCount = Math.min(24, Math.max(1, parseInt(params.months, 10) || 6));

  try {
    const supabase = getServiceClient();

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("total_amount, revenue_exempt, status, booking_date")
      .eq("status", "confirmed");
    if (bookingsError) throw bookingsError;

    const { data: expenses, error: expensesError } = await supabase.from("expenses").select("*");
    if (expensesError) throw expensesError;

    const today = new Date();
    const rows = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const { start, end } = computeRange("month", toISODate(ref));
      const startStr = toISODate(start);
      const endStr = toISODate(end);

      let revenue = 0;
      (bookings || []).forEach((b) => {
        if (b.booking_date >= startStr && b.booking_date <= endStr && !b.revenue_exempt && b.total_amount !== null && b.total_amount !== undefined) {
          revenue += Number(b.total_amount);
        }
      });

      let variableExpenses = 0;
      let fixedExpenses = 0;
      (expenses || []).forEach((e) => {
        if (e.kind === "variable") {
          if (e.expense_date >= startStr && e.expense_date <= endStr) variableExpenses += Number(e.amount);
          return;
        }
        const monthly = monthlyEquivalent(e);
        const expStart = new Date(e.start_date);
        const expEnd = e.end_date ? new Date(e.end_date) : new Date(8640000000000000);
        const days = overlapDays(expStart, expEnd, start, end);
        if (days > 0) fixedExpenses += (monthly * days) / DAYS_PER_MONTH;
      });

      rows.push({
        month: startStr.slice(0, 7),
        monthLabel: `${MONTHS_SHORT[ref.getMonth()]} ${ref.getFullYear()}`,
        revenue,
        variableExpenses,
        fixedExpenses,
        totalExpenses: variableExpenses + fixedExpenses,
        profit: revenue - variableExpenses - fixedExpenses,
      });
    }

    return { statusCode: 200, body: JSON.stringify({ rows }) };
  } catch (err) {
    console.error("income-statement error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
