/**
 * CONFIGURACIÓN DEL NEGOCIO
 * -------------------------
 * Edita únicamente este archivo para personalizar el sitio con la
 * información real de tu negocio. No es necesario tocar el resto del código.
 */

const BUSINESS_CONFIG = {
  // Identidad
  name: "Origen Brows",
  tagline: "Diseño y arquitectura de cejas, pestañas y tratamientos capilares de alta gama",
  logoText: "Origen Brows",

  // Contacto
  // Número de WhatsApp en formato internacional, SOLO dígitos (sin +, espacios ni guiones)
  // Ejemplo México: 52XXXXXXXXXX | Ejemplo España: 34XXXXXXXXX | Ejemplo Colombia: 57XXXXXXXXXX
  whatsappNumber: "525566095405",
  phoneDisplay: "+52 55 6609 5405",
  email: "contacto@origenbrows.com", // TODO: pon aquí el correo real del negocio

  // Ubicación
  address: "Ote. 253 299-Loc B, Agrícola Oriental, Iztacalco, 08500 Ciudad de México, CDMX",
  // Pega aquí el enlace "Compartir > Insertar un mapa" de Google Maps (src del iframe)
  mapEmbedUrl: "https://www.google.com/maps?q=Ote.+253+299-Loc+B%2C+Agr%C3%ADcola+Oriental%2C+Iztacalco%2C+08500+Ciudad+de+M%C3%A9xico%2C+CDMX&output=embed",

  // Horario de atención
  hours: [
    { day: "Lunes", time: "Cerrado" },
    { day: "Martes - Viernes", time: "10:00 am - 7:00 pm" },
    { day: "Sábado", time: "9:00 am - 5:00 pm" },
    { day: "Domingo", time: "Cerrado" },
  ],

  // Redes sociales (deja vacío "" el que no uses y el ícono se ocultará)
  social: {
    instagram: "https://www.instagram.com/origen.brows",
    facebook: "", // TODO: pon aquí tu página real de Facebook (vacío = el ícono no se muestra)
    tiktok: "", // TODO: pon aquí tu usuario real de TikTok (vacío = el ícono no se muestra)
    whatsapp: "", // se genera automáticamente desde whatsappNumber si se deja vacío
  },

  // Servicios que se muestran en la sección "Servicios" y en el selector de la cita
  // duration está en minutos y se usa para calcular el evento de Google Calendar
  // TODO: reemplaza "Consultar" por tus precios reales de cada servicio
  services: [
    {
      id: "diseno-cejas",
      name: "Diseño y Arquitectura de Cejas",
      description: "Diseño personalizado con depilación en hilo de alta precisión.",
      price: "Consultar",
      duration: 30,
    },
    {
      id: "laminado-cejas",
      name: "Laminado de Cejas",
      description: "Fija y peina cada vello para lucir cejas más pobladas y definidas.",
      price: "Consultar",
      duration: 45,
    },
    {
      id: "lifting-pestanas",
      name: "Lifting de Pestañas (InLei)",
      description: "Curvatura y levantamiento de pestañas naturales con productos InLei.",
      price: "Consultar",
      duration: 60,
    },
    {
      id: "extensiones-pestanas",
      name: "Extensiones de Pestañas (Maxymova)",
      description: "Aplicación pelo a pelo o volumen ruso con fibras de alta gama.",
      price: "Consultar",
      duration: 120,
    },
    {
      id: "botox-capilar",
      name: "Botox Capilar",
      description: "Tratamiento intensivo que restaura brillo, suavidad y salud al cabello.",
      price: "Consultar",
      duration: 90,
    },
    {
      id: "keratina-capilar",
      name: "Keratina Capilar",
      description: "Alisado y nutrición profunda para un cabello sano y manejable.",
      price: "Consultar",
      duration: 120,
    },
  ],
};
