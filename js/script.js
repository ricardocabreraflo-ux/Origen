(function () {
  "use strict";

  const cfg = BUSINESS_CONFIG;

  /* ---------------------------------------------------------
     Helpers
  --------------------------------------------------------- */
  function digitsOnly(str) {
    return (str || "").replace(/\D/g, "");
  }

  function whatsappLink(message) {
    const phone = digitsOnly(cfg.whatsappNumber);
    const text = encodeURIComponent(message || "");
    return `https://wa.me/${phone}${text ? `?text=${text}` : ""}`;
  }

  function serviceById(id) {
    return cfg.services.find((s) => s.id === id);
  }

  const shortName = cfg.shortName || cfg.name;

  /* ---------------------------------------------------------
     Render business info into the page
  --------------------------------------------------------- */
  function renderBrand() {
    document.title = cfg.name;
    if (cfg.logoImage) document.getElementById("logo-mark").src = cfg.logoImage;
    document.getElementById("logo-text").textContent = cfg.logoText || cfg.name;
    if (cfg.logoSub) document.getElementById("logo-sub").textContent = cfg.logoSub;
    document.getElementById("hero-title").textContent = cfg.tagline;
    document.getElementById("about-name").textContent = cfg.name;
    document.getElementById("footer-name").textContent = cfg.name;
    document.getElementById("footer-year").textContent = new Date().getFullYear();
  }

  function renderAnnouncement() {
    const bar = document.getElementById("announcement-bar");
    if (!cfg.opening || !cfg.opening.show) return;
    bar.innerHTML = `<strong>${cfg.opening.message}</strong> · ${cfg.opening.date} — <a href="#agenda">Agenda tu primera cita</a>`;
    bar.classList.add("visible");
  }

  function renderFounder() {
    if (cfg.founder) {
      document.getElementById("founder-name").textContent = cfg.founder.name;
      document.getElementById("founder-bio").textContent = cfg.founder.bio;
    }
    if (cfg.brandQuote) {
      document.getElementById("brand-quote").textContent = `“${cfg.brandQuote}”`;
    }
  }

  function renderGallery() {
    const grid = document.getElementById("gallery-grid");
    if (!grid || !cfg.galleryImages) return;
    grid.innerHTML = cfg.galleryImages
      .map(
        (g) => `<div class="gallery-item"><img src="${g.src}" alt="${g.alt || ""}" loading="lazy" /></div>`
      )
      .join("");
  }

  function renderContact() {
    document.getElementById("contact-address").textContent = cfg.address;
    document.getElementById("contact-phone").textContent = cfg.phoneDisplay;
    document.getElementById("contact-email").textContent = cfg.email;
    document.getElementById("map-iframe").src = cfg.mapEmbedUrl;

    const hoursList = document.getElementById("hours-list");
    hoursList.innerHTML = cfg.hours
      .map((h) => `<li><span>${h.day}</span><span>${h.time}</span></li>`)
      .join("");
  }

  function renderSocialLinks() {
    const links = [
      { key: "instagram", url: cfg.social.instagram, icon: "icon-instagram", label: "Instagram" },
      { key: "facebook", url: cfg.social.facebook, icon: "icon-facebook", label: "Facebook" },
      { key: "tiktok", url: cfg.social.tiktok, icon: "icon-tiktok", label: "TikTok" },
      { key: "whatsapp", url: cfg.social.whatsapp || whatsappLink(), icon: "icon-whatsapp", label: "WhatsApp" },
    ].filter((l) => l.url);

    const html = links
      .map(
        (l) =>
          `<a href="${l.url}" target="_blank" rel="noopener" aria-label="${l.label}"><svg class="icon" viewBox="0 0 24 24"><use href="#${l.icon}"/></svg></a>`
      )
      .join("");

    document.getElementById("social-links").innerHTML = html;
    document.getElementById("footer-social-links").innerHTML = html;
  }

  function renderWhatsappButtons() {
    const greeting = `Hola ${shortName}, me gustaría más información. 😊`;
    const link = whatsappLink(greeting);
    document.getElementById("hero-whatsapp").href = link;
    document.getElementById("floating-whatsapp").href = link;
  }

  function renderServices() {
    const grid = document.getElementById("services-grid");
    grid.innerHTML = cfg.services
      .map(
        (s) => `
        <div class="service-card">
          <h3>${s.name}</h3>
          <p>${s.description}</p>
          <div class="service-meta">
            <span>${s.price}</span>
            <span>${s.duration} min</span>
          </div>
        </div>`
      )
      .join("");

    const select = document.getElementById("b-service");
    cfg.services.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} · ${s.price}`;
      select.appendChild(opt);
    });
  }

  /* ---------------------------------------------------------
     Mobile navigation
  --------------------------------------------------------- */
  function initMobileNav() {
    const hamburger = document.getElementById("hamburger");
    const nav = document.getElementById("main-nav");

    hamburger.addEventListener("click", () => {
      nav.classList.toggle("open");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => nav.classList.remove("open"));
    });
  }

  /* ---------------------------------------------------------
     Booking form -> WhatsApp
  --------------------------------------------------------- */
  function formatDateReadable(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  function buildBookingMessage(data, service) {
    return [
      `Hola ${shortName}, quiero agendar una cita:`,
      ``,
      `Nombre: ${data.name}`,
      `Teléfono: ${data.phone}`,
      `Servicio: ${service ? service.name : data.service}`,
      `Fecha: ${formatDateReadable(data.date)}`,
      `Hora: ${data.time}`,
      data.notes ? `Notas: ${data.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  function readBookingForm(form) {
    return {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      service: form.service.value,
      date: form.date.value,
      time: form.time.value,
      notes: form.notes.value.trim(),
    };
  }

  function initBookingForm() {
    const form = document.getElementById("booking-form");
    const dateInput = document.getElementById("b-date");
    const hint = document.getElementById("form-hint");

    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const data = readBookingForm(form);
      const service = serviceById(data.service);
      const message = buildBookingMessage(data, service);
      window.open(whatsappLink(message), "_blank", "noopener");
      hint.textContent = "Se abrió WhatsApp con tu solicitud de cita. ¡Confirma el envío para completar tu reserva!";
    });

    document.getElementById("add-to-calendar").addEventListener("click", () => {
      const data = readBookingForm(form);
      if (!data.date || !data.time || !data.service) {
        hint.textContent = "Completa servicio, fecha y hora antes de añadir el evento a tu calendario.";
        dateInput.reportValidity();
        return;
      }
      const service = serviceById(data.service);
      const duration = service ? service.duration : 60;

      const start = new Date(`${data.date}T${data.time}`);
      const end = new Date(start.getTime() + duration * 60000);

      const toGCalDate = (d) =>
        d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const title = `Cita: ${service ? service.name : "Servicio"} en ${shortName}`;
      const details = `Cita agendada en ${shortName}.${data.notes ? " Notas: " + data.notes : ""}`;
      const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
        details: details,
        location: cfg.address,
      });

      window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank", "noopener");
      hint.textContent = "Se abrió Google Calendar para añadir tu cita como recordatorio.";
    });
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderBrand();
    renderAnnouncement();
    renderFounder();
    renderGallery();
    renderContact();
    renderSocialLinks();
    renderWhatsappButtons();
    renderServices();
    initMobileNav();
    initBookingForm();
  });
})();
