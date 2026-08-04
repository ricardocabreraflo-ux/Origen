/**
 * CONFIGURACIÓN DEL NEGOCIO
 * -------------------------
 * Edita únicamente este archivo para personalizar el sitio con la
 * información real de tu negocio. No es necesario tocar el resto del código.
 */

const BUSINESS_CONFIG = {
  // Identidad
  name: "Origen Brows & Hair Studio",
  shortName: "Origen Brows", // se usa en mensajes cortos (WhatsApp, etc.)
  tagline: "Diseño y arquitectura de cejas, pestañas y tratamientos capilares de alta gama",
  logoImage: "assets/logo-mark.jpg", // ícono "O" del logo
  logoText: "Origen",
  logoSub: "Brows & Hair Studio",

  // Fundadora
  founder: {
    name: "Montserrat Lemus",
    bio: "Especialista con más de 6 años de experiencia consolidada en el sector de la belleza.",
  },
  brandQuote:
    "Origen Brows no nace solo como un estudio de cejas, sino como un santuario donde cada clienta vive una transformación que realza su esencia natural a través del detalle y la excelencia.",

  // Aviso de apertura (déjalo en show: false para ocultar la barra una vez pasada la fecha)
  opening: {
    show: true,
    message: "Gran apertura",
    date: "8 de agosto de 2026",
  },

  // Contacto
  // Número de WhatsApp en formato internacional, SOLO dígitos (sin +, espacios ni guiones)
  // Ejemplo México: 52XXXXXXXXXX | Ejemplo España: 34XXXXXXXXX | Ejemplo Colombia: 57XXXXXXXXXX
  whatsappNumber: "525566095405",
  phoneDisplay: "+52 55 6609 5405",
  email: "origenbrowsmx@gmail.com",

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
    tiktok: "https://www.tiktok.com/@origen.brows",
    whatsapp: "", // se genera automáticamente desde whatsappNumber si se deja vacío
  },

  // Foto usada en la sección "Sobre nosotros"
  aboutImage: "assets/gallery-1.jpg",

  // Fotos reales para la sección Galería
  galleryImages: [
    { src: "assets/gallery-2.jpg", alt: "Origen Brows & Hair Studio" },
    { src: "assets/gallery-3.jpg", alt: "Origen Brows & Hair Studio" },
  ],

  // Servicios que se muestran en la sección "Servicios" y en el selector de la cita
  // duration está en minutos (estimado) y se usa para calcular el evento de Google Calendar
  services: [
    {
      id: "disenando-tu-origen",
      name: "Diseñando tu ORIGEN",
      description: "Solo diseño con visagismo + epilación con hilo.",
      price: "$220 MXN",
      duration: 30,
    },
    {
      id: "brow-tint-shape",
      name: "Brow Tint & Shape",
      description: "Diseño + hilo + tinte híbrido (Élan/Bronsun).",
      price: "$350 MXN",
      duration: 45,
    },
    {
      id: "korean-lash-lifting",
      name: "Korean Lash Lifting",
      description: "Levantamiento coreano + tinte negro + botox/keratina.",
      price: "$550 MXN",
      duration: 60,
    },
    {
      id: "luxury-brow-lamination",
      name: "Luxury Brow Lamination",
      description: "Diseño + hilo + laminado italiano + nutrición/botox.",
      price: "$480 MXN",
      duration: 60,
    },
    {
      id: "luxury-lamination-tint",
      name: "Luxury Lamination + Tint",
      description: "Laminado completo + tinte híbrido + botox.",
      price: "$580 MXN",
      duration: 75,
    },
    {
      id: "combo-full-look",
      name: "Combo Full Look Origen",
      description: "Luxury Brow Lamination + Korean Lash Lifting.",
      price: "$980 MXN",
      duration: 120,
    },
    {
      id: "tratamientos-capilares",
      name: "Tratamientos Capilares",
      description: "Keratina premium o botox capilar. Precio sujeto a valoración previa.",
      price: "Valoración previa",
      duration: 120,
    },
  ],
};
