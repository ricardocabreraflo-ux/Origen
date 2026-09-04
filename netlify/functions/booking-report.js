// Reporte de citas agregado por periodo (semana/mes/año), para las
// gráficas del panel de reportes. Solo cuenta como ingreso las citas
// confirmadas que no estén marcadas "sin ingreso" y que ya tengan un
// total_amount capturado (ver set-total-amount.js).
const { getServiceClient } = require("./_lib/supabase");
const { requireSection } = require("./_lib/requireAdmin");
const { computeRange, toISODate, addDays } = require("./_lib/period");

function bucketKey(dateStr, bucketBy) {
  return bucketBy === "month" ? dateStr.slice(0, 7) : dateStr;
}

function buildBucketList(start, end, bucketBy) {
  const keys = [];
  if (bucketBy === "month") {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      keys.push(toISODate(cursor).slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    let cursor = new Date(start);
    while (cursor <= end) {
      keys.push(toISODate(cursor));
      cursor = addDays(cursor, 1);
    }
  }
  return keys;
}

exports.handler = async (event, context) => {
  try {
    requireSection(context, "reportes");
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  const params = event.queryStringParameters || {};
  const periodType = ["week", "month", "year"].includes(params.periodType) ? params.periodType : "month";
  const referenceDate = /^\d{4}-\d{2}-\d{2}$/.test(params.referenceDate)
    ? params.referenceDate
    : new Date().toISOString().split("T")[0];

  try {
    const { start, end, bucketBy } = computeRange(periodType, referenceDate);
    const startStr = toISODate(start);
    const endStr = toISODate(end);

    const supabase = getServiceClient();
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("booking_date, status, total_amount, revenue_exempt, service_id, service_name")
      .gte("booking_date", startStr)
      .lte("booking_date", endStr);
    if (error) throw error;

    const bucketMap = new Map(buildBucketList(start, end, bucketBy).map((k) => [k, { key: k, revenue: 0, confirmedCount: 0, totalCount: 0 }]));
    const serviceMap = new Map();

    let totalRevenue = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let expiredCount = 0;
    let missingAmountCount = 0;

    (bookings || []).forEach((b) => {
      const key = bucketKey(b.booking_date, bucketBy);
      const bucket = bucketMap.get(key);
      if (bucket) bucket.totalCount += 1;

      if (b.status === "pending") pendingCount += 1;
      else if (b.status === "cancelled") cancelledCount += 1;
      else if (b.status === "expired") expiredCount += 1;

      if (b.status === "confirmed") {
        confirmedCount += 1;
        if (bucket) bucket.confirmedCount += 1;

        if (!b.revenue_exempt) {
          if (b.total_amount === null || b.total_amount === undefined) {
            missingAmountCount += 1;
          } else {
            const amount = Number(b.total_amount);
            totalRevenue += amount;
            if (bucket) bucket.revenue += amount;

            const svc = serviceMap.get(b.service_id) || { serviceId: b.service_id, serviceName: b.service_name, count: 0, revenue: 0 };
            svc.count += 1;
            svc.revenue += amount;
            serviceMap.set(b.service_id, svc);
          }
        }
      }
    });

    const byService = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      statusCode: 200,
      body: JSON.stringify({
        periodType,
        rangeStart: startStr,
        rangeEnd: endStr,
        buckets: Array.from(bucketMap.values()),
        byService,
        totals: {
          revenue: totalRevenue,
          confirmedCount,
          pendingCount,
          cancelledCount,
          expiredCount,
          missingAmountCount,
        },
      }),
    };
  } catch (err) {
    console.error("booking-report error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error" }) };
  }
};
