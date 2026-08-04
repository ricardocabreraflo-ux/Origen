/**
 * CONFIGURACIÓN DEL NEGOCIO
 * -------------------------
 * Edita únicamente este archivo para personalizar el sitio con la
 * información real de tu negocio. No es necesario tocar el resto del código.
 */

const BUSINESS_CONFIG = {
  // Identidad
  name: "Origen",
  tagline: "Belleza, cuidado y bienestar en un solo lugar",
  logoText: "Origen",

  // Contacto
  // Número de WhatsApp en formato internacional, SOLO dígitos (sin +, espacios ni guiones)
  // Ejemplo México: 52XXXXXXXXXX | Ejemplo España: 34XXXXXXXXX | Ejemplo Colombia: 57XXXXXXXXXX
  whatsappNumber: "525566095405",
  phoneDisplay: "+52 55 6609 5405",
  email: "contacto@origen.com", // TODO: pon aquí el correo real del negocio

  // Ubicación
  address: "Av. Siempre Viva 123, Col. Centro, Ciudad",
  // Pega aquí el enlace "Compartir > Insertar un mapa" de Google Maps (src del iframe)
  mapEmbedUrl: "https://www.google.com/maps?q=Ciudad+de+M%C3%A9xico&output=embed",

  // Horario de atención
  hours: [
    { day: "Lunes - Viernes", time: "9:00 am - 7:00 pm" },
    { day: "Sábado", time: "9:00 am - 5:00 pm" },
    { day: "Domingo", time: "Cerrado" },
  ],

  // Redes sociales (deja vacío "" el que no uses y el ícono se ocultará)
  social: {
    instagram: "https://instagram.com/origen", // TODO: pon aquí tu usuario real de Instagram
    facebook: "https://facebook.com/origen", // TODO: pon aquí tu página real de Facebook
    tiktok: "https://tiktok.com/@origen", // TODO: pon aquí tu usuario real de TikTok
    whatsapp: "", // se genera automáticamente desde whatsappNumber si se deja vacío
  },

  // Servicios que se muestran en la sección "Servicios" y en el selector de la cita
  // duration está en minutos y se usa para calcular el evento de Google Calendar
  services: [
    {
      id: "manicure",
      name: "Manicure",
      description: "Limado, cutícula, esmaltado tradicional o semipermanente.",
      price: "$250",
      duration: 45,
    },
    {
      id: "pedicure",
      name: "Pedicure Spa",
      description: "Exfoliación, masaje e hidratación profunda para tus pies.",
      price: "$300",
      duration: 60,
    },
    {
      id: "corte-peinado",
      name: "Corte y Peinado",
      description: "Corte personalizado y peinado para cualquier ocasión.",
      price: "$350",
      duration: 60,
    },
    {
      id: "coloracion",
      name: "Coloración",
      description: "Tinte, mechas o balayage con productos de alta calidad.",
      price: "Desde $800",
      duration: 120,
    },
    {
      id: "maquillaje",
      name: "Maquillaje",
      description: "Maquillaje social o para eventos especiales.",
      price: "$450",
      duration: 60,
    },
    {
      id: "facial",
      name: "Tratamiento Facial",
      description: "Limpieza profunda, hidratación y masaje facial relajante.",
      price: "$500",
      duration: 60,
    },
    {
      id: "pestanas",
      name: "Extensiones de Pestañas",
      description: "Aplicación de extensiones pelo a pelo o volumen ruso.",
      price: "$600",
      duration: 90,
    },
    {
      id: "depilacion",
      name: "Depilación con Cera",
      description: "Depilación de cejas, piernas, axilas y más.",
      price: "Desde $150",
      duration: 30,
    },
  ],
};
