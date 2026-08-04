// Función programada (ver netlify.toml) que corre cada 15 minutos y manda
// un recordatorio de WhatsApp a las clientas con cita confirmada dentro de
// la próxima hora, para que no se les olvide llegar a tiempo.
const { getServiceClient } = require("./_lib/supabase");
const { sendWhatsAppTemplate } = require("./_lib/whatsapp");

// Ventana de 55–70 min: como esto corre cada 15 min, una ventana de 15 min
// exactos podría dejar una cita sin avisar si el reloj no cuadra perfecto.
const WINDOW_START_MIN = 55;
const WINDOW_END_MIN = 70;

exports.handler = async () => {
  const supabase = getServiceClient();
  const now = Date.now();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null);

  if (error) {
    console.error("send-reminders: error leyendo citas", error);
    return { statusCode: 500 };
  }

  const due = (bookings || []).filter((booking) => {
    const startsAt = new Date(`${booking.booking_date}T${booking.start_time}`).getTime();
    const minutesUntil = (startsAt - now) / 60000;
    return minutesUntil >= WINDOW_START_MIN && minutesUntil <= WINDOW_END_MIN;
  });

  let sent = 0;
  for (const booking of due) {
    try {
      await sendWhatsAppTemplate(booking.customer_phone, "recordatorio_cita_origen", "es_MX", [
        {
          type: "body",
          parameters: [
            { type: "text", text: booking.customer_name },
            { type: "text", text: booking.service_name },
            { type: "text", text: booking.start_time.slice(0, 5) },
          ],
        },
      ]);
      await supabase.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", booking.id);
      sent += 1;
    } catch (err) {
      // Mejor esfuerzo por cita: si una falla (ej. número inválido), las
      // demás igual deben recibir su recordatorio.
      console.error(`send-reminders: fallo con la cita ${booking.id}`, err);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ checked: (bookings || []).length, sent }) };
};
