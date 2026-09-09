// Resumen financiero de un periodo (ingresos, gastos, utilidad) + el
// cálculo del punto de equilibrio mensual, que siempre se calcula sobre
// un mes completo sin importar qué periodo esté viendo la administradora
// en el reporte, porque es la unidad en la que tiene sentido planear.
//
// El punto de equilibrio usa la fórmula real de costo-volumen-utilidad:
//   citas necesarias = costos fijos / (ticket promedio - costo variable por cita)
// en vez de ignorar el costo variable por cita como en la primera versión.
const { getServiceClient } = require("./_lib/supabase");
const { requireSection } = require("./_lib/requireAdmin");
const { loadConfig } = require("./_lib/config");
const { computeRange, toISODate } = require("./_lib/period");
const { parsePriceAmount } = require("./_lib/money");

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKS_PER_MONTH = 4.345;
const DAYS_PER_MONTH = 30.4;

// Cuántos días de [aStart,aEnd] caen dentro de [bStart,bEnd]. Se usa para
// prorratear un gasto fijo o de inversión (mensual) sobre el periodo que
// se está viendo.
function overlapDays(aStart, aEnd, bStart, bEnd) {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

// El valor "mensual equivalente" de un gasto: para uno fijo es su monto
// tal cual; para una inversión prorrateada es el monto total dividido
// entre los meses que se decidió repartirlo.
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
  const periodType = ["week", "month", "year"].includes(params.periodType) ? params.periodType : "month";
  const referenceDate = /^\d{4}-\d{2}-\d{2}$/.test(params.referenceDate)
    ? params.referenceDate
    : new Date().toISOString().split("T")[0];

  try {
    const { start, end } = computeRange(periodType, referenceDate);
    const startStr = toISODate(start);
    const endStr = toISODate(end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { start: curMonthStart, end: curMonthEnd } = computeRange("month", toISODate(today));
    const curMonthStartStr = toISODate(curMonthStart);
    const curMonthEndStr = toISODate(curMonthEnd);

    const supabase = getServiceClient();
    const config = await loadConfig();

    // --- Ingresos del periodo seleccionado ---
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("total_amount, revenue_exempt, status, booking_date")
      .eq("status", "confirmed")
      .gte("booking_date", startStr)
      .lte("booking_date", endStr);
    if (bookingsError) throw bookingsError;

    let revenue = 0;
    (bookings || []).forEach((b) => {
      if (!b.revenue_exempt && b.total_amount !== null && b.total_amount !== undefined) {
        revenue += Number(b.total_amount);
      }
    });

    // --- Gastos del periodo (variables dentro del rango + fijos/inversión prorrateados) ---
    const { data: expenses, error: expensesError } = await supabase.from("expenses").select("*");
    if (expensesError) throw expensesError;

    let variableTotal = 0;
    let fixedTotalForPeriod = 0;
    let monthlyFixedCostsNow = 0; // para el punto de equilibrio, con los gastos activos HOY
    let variableThisCalendarMonth = 0; // para estimar el costo variable por cita

    (expenses || []).forEach((e) => {
      if (e.kind === "variable") {
        if (e.expense_date >= startStr && e.expense_date <= endStr) {
          variableTotal += Number(e.amount);
        }
        if (e.expense_date >= curMonthStartStr && e.expense_date <= curMonthEndStr) {
          variableThisCalendarMonth += Number(e.amount);
        }
        return;
      }

      // fijo o inversión prorrateada
      const monthly = monthlyEquivalent(e);
      const expStart = new Date(e.start_date);
      const expEnd = e.end_date ? new Date(e.end_date) : new Date(8640000000000000); // "sin fin"
      const days = overlapDays(expStart, expEnd, start, end);
      if (days > 0) {
        fixedTotalForPeriod += (monthly * days) / DAYS_PER_MONTH;
      }

      if (e.active && expStart <= today && (!e.end_date || new Date(e.end_date) >= today)) {
        monthlyFixedCostsNow += monthly;
      }
    });

    const totalExpenses = variableTotal + fixedTotalForPeriod;
    const profit = revenue - totalExpenses;

    // --- Punto de equilibrio mensual (siempre sobre un mes completo) ---
    const { data: allConfirmed, error: allConfirmedError } = await supabase
      .from("bookings")
      .select("total_amount, revenue_exempt, booking_date")
      .eq("status", "confirmed");
    if (allConfirmedError) throw allConfirmedError;

    const realTickets = (allConfirmed || [])
      .filter((b) => !b.revenue_exempt && b.total_amount !== null && b.total_amount !== undefined)
      .map((b) => Number(b.total_amount));

    let averageTicket;
    if (realTickets.length > 0) {
      averageTicket = realTickets.reduce((a, b) => a + b, 0) / realTickets.length;
    } else {
      const listPrices = (config.services || []).map((s) => parsePriceAmount(s.price)).filter((n) => n !== null);
      averageTicket = listPrices.length > 0 ? listPrices.reduce((a, b) => a + b, 0) / listPrices.length : null;
    }

    const confirmedThisCalendarMonth = (allConfirmed || []).filter(
      (b) => b.booking_date >= curMonthStartStr && b.booking_date <= curMonthEndStr
    ).length;
    const variableCostPerBooking = confirmedThisCalendarMonth > 0 ? variableThisCalendarMonth / confirmedThisCalendarMonth : 0;

    const openDaysPerWeek = WEEKDAY_KEYS.filter((k) => config.businessHours && config.businessHours[k] && config.businessHours[k].open).length;
    const businessDaysPerMonth = openDaysPerWeek * WEEKS_PER_MONTH;

    let breakeven = null;
    if (averageTicket && averageTicket > 0) {
      const margin = averageTicket - variableCostPerBooking;
      if (margin > 0) {
        const citasPorMes = Math.ceil(monthlyFixedCostsNow / margin);
        breakeven = {
          monthlyFixedCosts: monthlyFixedCostsNow,
          averageTicket,
          variableCostPerBooking,
          citasPorMes,
          citasPorSemana: Math.ceil(citasPorMes / WEEKS_PER_MONTH),
          citasPorDia: businessDaysPerMonth > 0 ? Math.ceil(citasPorMes / businessDaysPerMonth) : null,
          ingresoMensualNecesario: monthlyFixedCostsNow,
          basadoEnDatosReales: realTickets.length > 0,
          ticketsConsiderados: realTickets.length,
        };
      } else {
        // El costo variable por cita ya es igual o mayor al ticket promedio:
        // no hay ningún número de citas que alcance el punto de equilibrio.
        breakeven = {
          monthlyFixedCosts: monthlyFixedCostsNow,
          averageTicket,
          variableCostPerBooking,
          citasPorMes: null,
          citasPorSemana: null,
          citasPorDia: null,
          ingresoMensualNecesario: monthlyFixedCostsNow,
          basadoEnDatosReales: realTickets.length > 0,
          ticketsConsiderados: realTickets.length,
          margenNegativo: true,
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        periodType,
        rangeStart: startStr,
        rangeEnd: endStr,
        revenue,
        variableExpenses: variableTotal,
        fixedExpenses: fixedTotalForPeriod,
        totalExpenses,
        profit,
        breakeven,
      }),
    };
  } catch (err) {
    console.error("financial-summary error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
