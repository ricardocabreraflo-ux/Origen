// Pago del anticipo con tarjeta usando Checkout Pro de Mercado Pago
// (redirección a una página de pago alojada por Mercado Pago, sin manejar
// datos de tarjeta directamente en este sitio). Requiere MP_ACCESS_TOKEN
// (credencial de producción de la cuenta de Mercado Pago del negocio).

const MP_API = "https://api.mercadopago.com";

function getAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Falta configurar MP_ACCESS_TOKEN");
  return token;
}

async function createPreference(booking, siteUrl) {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          title: `Anticipo · ${booking.service_name}`,
          quantity: 1,
          unit_price: Number(booking.deposit_amount),
          currency_id: "MXN",
        },
      ],
      external_reference: booking.id,
      back_urls: {
        success: `${siteUrl}/?mp=exito&codigo=${encodeURIComponent(booking.reservation_code)}#agenda`,
        pending: `${siteUrl}/?mp=pendiente&codigo=${encodeURIComponent(booking.reservation_code)}#agenda`,
        failure: `${siteUrl}/?mp=fallo&codigo=${encodeURIComponent(booking.reservation_code)}#agenda`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/mp-webhook`,
      statement_descriptor: "ORIGEN BROWS",
    }),
  });

  if (!res.ok) {
    throw new Error(`Mercado Pago respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function getPayment(paymentId) {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { createPreference, getPayment };
