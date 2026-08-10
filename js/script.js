(function () {
  "use strict";

  // Se carga desde data/config.json al iniciar (ver init() al final del archivo)
  let cfg;

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

  function getShortName() {
    return cfg.shortName || cfg.name;
  }

  function formatDateReadable(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  function formatMoney(n) {
    return `$${n} MXN`;
  }

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

  function initPromoPopup() {
    const promo = cfg.promoPopup;
    if (!promo || !promo.show) return;
    if (localStorage.getItem("promoPopupSeen")) return;
    const today = new Date().toISOString().split("T")[0];
    if (promo.expiresOn && today > promo.expiresOn) return;

    const overlay = document.getElementById("promo-popup-overlay");
    document.getElementById("promo-popup-eyebrow").textContent = promo.eyebrow || "";
    document.getElementById("promo-popup-title").textContent = promo.title || "";
    document.getElementById("promo-popup-message").textContent = promo.message || "";
    const cta = document.getElementById("promo-popup-cta");
    cta.textContent = promo.ctaLabel || "Agenda tu cita";

    function dismiss() {
      overlay.hidden = true;
      localStorage.setItem("promoPopupSeen", "1");
    }

    document.getElementById("promo-popup-close").addEventListener("click", dismiss);
    cta.addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) dismiss();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.hidden) dismiss();
    });

    setTimeout(() => {
      overlay.hidden = false;
    }, 1000);
  }

  function initPwaInstallBanner() {
    const banner = document.getElementById("pwa-install-banner");
    if (!banner) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem("pwaInstallDismissed")) return;

    const closeBtn = document.getElementById("pwa-install-close");
    const actionBtn = document.getElementById("pwa-install-action");
    const messageEl = document.getElementById("pwa-install-message");

    function dismiss() {
      banner.hidden = true;
      localStorage.setItem("pwaInstallDismissed", "1");
    }
    closeBtn.addEventListener("click", dismiss);

    // No mostramos el aviso encima de la ventana emergente de promoción:
    // esperamos a que se cierre (o a que nunca aparezca) antes de mostrarlo.
    function revealWhenClear() {
      const overlay = document.getElementById("promo-popup-overlay");
      if (overlay && !overlay.hidden) {
        setTimeout(revealWhenClear, 800);
        return;
      }
      banner.hidden = false;
    }

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isIOSOtherBrowser = /crios|fxios/i.test(ua); // Chrome/Firefox en iOS no pueden agregar a inicio

    let deferredPrompt = null;
    let canShowNativePrompt = false;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      canShowNativePrompt = true;
      actionBtn.hidden = false;
    });

    actionBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      actionBtn.disabled = true;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice.outcome === "accepted") dismiss();
      else actionBtn.disabled = false;
    });

    // Le damos 3.5s para que el navegador dispare "beforeinstallprompt" (si
    // lo soporta) antes de decidir qué mensaje mostrar.
    setTimeout(() => {
      if (canShowNativePrompt) {
        revealWhenClear();
      } else if (isIOS && !isIOSOtherBrowser) {
        messageEl.textContent = "Toca el botón de compartir (⬆️) en Safari y luego 'Agregar a inicio'.";
        revealWhenClear();
      }
      // En otros navegadores sin "Agregar a inicio" disponible, no forzamos
      // ningún aviso — no hay una acción real que la clienta pueda tomar.
    }, 3500);
  }

  function renderFounder() {
    if (cfg.founder) {
      document.getElementById("founder-name").textContent = cfg.founder.name;
      document.getElementById("founder-bio").textContent = cfg.founder.bio;
    }
    if (cfg.brandQuote) {
      document.getElementById("brand-quote").textContent = `“${cfg.brandQuote}”`;
    }
    if (cfg.aboutImage) {
      document.getElementById("about-image-photo").src = cfg.aboutImage;
    }
  }

  function renderGallery() {
    const grid = document.getElementById("gallery-grid");
    if (!grid || !cfg.galleryImages) return;
    grid.innerHTML = cfg.galleryImages
      .map((g) => `<div class="gallery-item"><img src="${g.src}" alt="${g.alt || ""}" loading="lazy" /></div>`)
      .join("");
  }

  function renderContact() {
    const addressLink = document.getElementById("contact-address");
    addressLink.textContent = cfg.address;
    if (cfg.mapsUrl) addressLink.href = cfg.mapsUrl;
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
    const greeting = `Hola ${getShortName()}, me gustaría más información. 😊`;
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
            <span>${s.duration} min aprox.</span>
          </div>
          <p class="service-deposit">Anticipo para reservar: ${formatMoney(s.depositAmount)}</p>
          <button type="button" class="btn btn-outline btn-sm" data-book-service="${s.id}">Reservar</button>
        </div>`
      )
      .join("");

    grid.querySelectorAll("[data-book-service]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const service = serviceById(btn.getAttribute("data-book-service"));
        document.getElementById("agenda").scrollIntoView({ behavior: "smooth" });
        BookingFlow.selectService(service);
      });
    });
  }

  function renderPolicies() {
    if (!cfg.policies) return;
    document.getElementById("policies-title").textContent = cfg.policies.title || "Nuestras políticas";
    document.getElementById("policy-grid").innerHTML = (cfg.policies.sections || [])
      .map((s) => `<div class="policy-card"><h3>${s.heading}</h3><p>${s.body}</p></div>`)
      .join("");
  }

  function renderTestimonials() {
    const grid = document.getElementById("testimonial-grid");
    const items = cfg.testimonials || [];
    if (items.length === 0) {
      grid.outerHTML = `
        <div class="testimonial-empty" id="testimonial-grid">
          <strong>Muy pronto, aquí</strong>
          Estamos por abrir. En cuanto lleguen tus primeras reseñas, aparecerán en esta sección.
        </div>`;
      return;
    }
    grid.innerHTML = items
      .map(
        (t) => `
        <div class="testimonial-card">
          <div class="testimonial-stars" aria-hidden="true">★★★★★</div>
          <p class="testimonial-quote">“${t.quote}”</p>
          <p class="testimonial-author">${t.author}</p>
        </div>`
      )
      .join("");
  }

  function renderFAQ() {
    const list = document.getElementById("faq-list");
    list.innerHTML = (cfg.faq || [])
      .map(
        (f, i) => `
        <div class="faq-item" data-faq="${i}">
          <button type="button" class="faq-question" aria-expanded="false">
            <span>${f.question}</span>
            <svg class="icon" viewBox="0 0 24 24"><path d="M12 4v16m-8-8h16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          </button>
          <div class="faq-answer-wrap">
            <div class="faq-answer"><p>${f.answer}</p></div>
          </div>
        </div>`
      )
      .join("");

    list.querySelectorAll(".faq-item").forEach((item) => {
      const question = item.querySelector(".faq-question");
      question.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        list.querySelectorAll(".faq-item.is-open").forEach((open) => {
          open.classList.remove("is-open");
          open.querySelector(".faq-question").setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          item.classList.add("is-open");
          question.setAttribute("aria-expanded", "true");
        }
      });
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
     Revelado suave al hacer scroll
  --------------------------------------------------------- */
  function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach((t) => observer.observe(t));
  }

  /* ---------------------------------------------------------
     Agenda tu cita — flujo por pasos + API de reservas
  --------------------------------------------------------- */
  const BookingFlow = (function () {
    const state = { service: null, date: null, slot: null, booking: null };
    let countdownInterval = null;

    let els = {};

    function cacheEls() {
      els = {
        steps: document.querySelectorAll("#booking-steps li"),
        panels: document.querySelectorAll(".booking-step[data-step-panel]"),
        servicePickGrid: document.getElementById("service-pick-grid"),
        dateInput: document.getElementById("b-date"),
        slotGrid: document.getElementById("slot-grid"),
        slotStatus: document.getElementById("slot-status"),
        bookingSummary: document.getElementById("booking-summary"),
        form: document.getElementById("booking-form"),
        formHint: document.getElementById("form-hint"),
        submitBtn: document.getElementById("booking-submit"),
        confirmationCode: document.getElementById("confirmation-code"),
        confirmationSummary: document.getElementById("confirmation-summary"),
        confirmationLoyaltyNote: document.getElementById("confirmation-loyalty-note"),
        confirmationTimer: document.getElementById("confirmation-timer"),
        transferAmount: document.getElementById("transfer-amount"),
        transferBank: document.getElementById("transfer-bank"),
        transferHolder: document.getElementById("transfer-holder"),
        transferClabe: document.getElementById("transfer-clabe"),
        transferNote: document.getElementById("transfer-note"),
        copyClabe: document.getElementById("copy-clabe"),
        confirmationWhatsapp: document.getElementById("confirmation-whatsapp"),
        confirmationCalendar: document.getElementById("confirmation-calendar"),
        bookingRestart: document.getElementById("booking-restart"),
        payOnlineBtn: document.getElementById("pay-online-btn"),
        payOnlineHint: document.getElementById("pay-online-hint"),
        mpReturnBanner: document.getElementById("mp-return-banner"),
      };
    }

    function goToStep(n) {
      els.steps.forEach((li) => {
        const step = Number(li.getAttribute("data-step"));
        li.classList.toggle("is-active", step === n);
        li.classList.toggle("is-done", step < n);
      });
      els.panels.forEach((panel) => {
        const step = Number(panel.getAttribute("data-step-panel"));
        panel.hidden = step !== n;
      });
    }

    function renderServicePickGrid() {
      els.servicePickGrid.innerHTML = cfg.services
        .map(
          (s) => `
          <button type="button" class="service-pick" data-service-id="${s.id}">
            <strong>${s.name}</strong>
            <span class="service-pick-price">${s.price}</span><br/>
            <span>Anticipo: ${formatMoney(s.depositAmount)}</span>
          </button>`
        )
        .join("");

      els.servicePickGrid.querySelectorAll("[data-service-id]").forEach((btn) => {
        btn.addEventListener("click", () => selectService(serviceById(btn.getAttribute("data-service-id"))));
      });
    }

    function selectService(service) {
      state.service = service;
      goToStep(2);
      if (state.date) fetchAvailability(state.date);
    }

    function fetchAvailability(date) {
      state.slot = null;
      els.slotGrid.innerHTML = "";
      els.slotStatus.textContent = "Buscando horarios disponibles…";
      els.slotStatus.classList.remove("is-error");

      fetch(`/api/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(state.service.id)}`)
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
          if (!ok) throw new Error(body.message || "No se pudo cargar la disponibilidad.");
          renderSlotGrid(body.slots || [], body.closedReason);
        })
        .catch((err) => {
          els.slotStatus.textContent = err.message || "No se pudo cargar la disponibilidad. Intenta de nuevo.";
          els.slotStatus.classList.add("is-error");
        });
    }

    function renderSlotGrid(slots, closedReason) {
      if (slots.length === 0) {
        els.slotGrid.innerHTML = "";
        els.slotStatus.textContent = closedReason
          ? `${closedReason} Elige otra fecha.`
          : "Cerrado ese día — elige otra fecha.";
        return;
      }
      els.slotStatus.textContent = "Elige un horario disponible:";
      els.slotGrid.innerHTML = slots
        .map(
          (s, i) => `
          <button type="button" class="slot-pill" style="animation-delay:${i * 35}ms"
            data-start="${s.startTime}" data-end="${s.endTime}" ${s.available ? "" : "disabled"}>
            ${s.startTime} – ${s.endTime}
          </button>`
        )
        .join("");

      els.slotGrid.querySelectorAll(".slot-pill:not(:disabled)").forEach((btn) => {
        btn.addEventListener("click", () => {
          els.slotGrid.querySelectorAll(".slot-pill").forEach((p) => p.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          selectSlot({ startTime: btn.getAttribute("data-start"), endTime: btn.getAttribute("data-end") });
        });
      });
    }

    function selectSlot(slot) {
      state.slot = slot;
      goToStep(3);
      renderBookingSummary();
    }

    function renderBookingSummary() {
      els.bookingSummary.innerHTML = `
        <span><strong>Servicio:</strong> ${state.service.name}</span>
        <span><strong>Fecha:</strong> ${formatDateReadable(state.date)}</span>
        <span><strong>Horario:</strong> ${state.slot.startTime} – ${state.slot.endTime}</span>
        <span><strong>Anticipo:</strong> ${formatMoney(state.service.depositAmount)}</span>
      `;
    }

    function submitBooking(e) {
      e.preventDefault();
      const form = els.form;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      els.submitBtn.disabled = true;
      els.submitBtn.textContent = "Reservando…";
      els.formHint.textContent = "";
      els.formHint.classList.remove("is-error");

      fetch("/api/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: state.service.id,
          date: state.date,
          startTime: state.slot.startTime,
          customerName: form.name.value.trim(),
          customerPhone: form.phone.value.trim(),
          customerEmail: form.email.value.trim(),
          notes: form.notes.value.trim(),
        }),
      })
        .then((res) => res.json().then((body) => ({ status: res.status, body })))
        .then(({ status, body }) => {
          if (status === 409) {
            els.formHint.textContent = body.message || "Ese horario ya no está disponible.";
            els.formHint.classList.add("is-error");
            goToStep(2);
            fetchAvailability(state.date);
            return;
          }
          if (status !== 200) {
            throw new Error(body.message || "No se pudo completar la reserva.");
          }
          state.booking = body;
          renderConfirmation(body);
          goToStep(4);
        })
        .catch((err) => {
          els.formHint.textContent = err.message || "No se pudo completar la reserva. Intenta de nuevo.";
          els.formHint.classList.add("is-error");
        })
        .finally(() => {
          els.submitBtn.disabled = false;
          els.submitBtn.textContent = "Apartar horario";
        });
    }

    function renderConfirmation(data) {
      els.confirmationCode.textContent = data.reservationCode;
      els.confirmationSummary.textContent = `${data.serviceName} · ${formatDateReadable(data.date)} · ${data.startTime} – ${data.endTime}`;

      if (data.rewardRedemption) {
        els.confirmationLoyaltyNote.textContent = `🎁 Estás usando tu ${data.loyaltyDiscountPercent}% de descuento de lealtad — lo confirmamos junto con tu depósito.`;
        els.confirmationLoyaltyNote.hidden = false;
      } else {
        els.confirmationLoyaltyNote.hidden = true;
      }

      els.transferAmount.textContent = formatMoney(data.depositAmount);
      els.transferBank.textContent = data.bankTransfer.bankName;
      els.transferHolder.textContent = data.bankTransfer.accountHolder;
      els.transferClabe.textContent = data.bankTransfer.clabe;
      els.transferNote.textContent = data.bankTransfer.note || "";

      const waMessage = [
        `Hola ${getShortName()}, aquí está mi comprobante de transferencia.`,
        `Código de reserva: ${data.reservationCode}`,
        `Servicio: ${data.serviceName}`,
        `Fecha: ${formatDateReadable(data.date)}`,
        `Horario: ${data.startTime} – ${data.endTime}`,
        `Anticipo: ${formatMoney(data.depositAmount)}`,
      ].join("\n");
      els.confirmationWhatsapp.href = whatsappLink(waMessage);

      const start = new Date(`${data.date}T${data.startTime}`);
      const end = new Date(`${data.date}T${data.endTime}`);
      const toGCalDate = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const calParams = new URLSearchParams({
        action: "TEMPLATE",
        text: `Cita: ${data.serviceName} en ${getShortName()}`,
        dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
        details: `Código de reserva ${data.reservationCode}. Recuerda llevar tu comprobante de transferencia.`,
        location: cfg.address,
      });
      els.confirmationCalendar.href = `https://calendar.google.com/calendar/render?${calParams.toString()}`;

      els.payOnlineHint.textContent = "";
      els.payOnlineHint.classList.remove("is-error");
      els.payOnlineBtn.disabled = false;
      els.payOnlineBtn.textContent = "Pagar anticipo con tarjeta";

      startCountdown(data.expiresAt);
    }

    function payOnline() {
      els.payOnlineBtn.disabled = true;
      els.payOnlineBtn.textContent = "Preparando pago…";
      els.payOnlineHint.textContent = "";
      els.payOnlineHint.classList.remove("is-error");

      fetch("/api/create-mp-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: state.booking.id }),
      })
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
          if (!ok || !body.initPoint) throw new Error(body.message || "No se pudo iniciar el pago con tarjeta.");
          window.location.href = body.initPoint;
        })
        .catch((err) => {
          els.payOnlineHint.textContent = err.message || "No se pudo iniciar el pago con tarjeta. Intenta transferencia manual.";
          els.payOnlineHint.classList.add("is-error");
          els.payOnlineBtn.disabled = false;
          els.payOnlineBtn.textContent = "Pagar anticipo con tarjeta";
        });
    }

    function handleMpReturn() {
      const params = new URLSearchParams(window.location.search);
      const mp = params.get("mp");
      if (!mp) return;

      const codigo = params.get("codigo");
      const codeSuffix = codigo ? ` (código ${codigo})` : "";
      const MESSAGES = {
        exito: { cls: "is-success", text: `Recibimos tu pago${codeSuffix}. Tu cita se confirmará automáticamente en unos momentos y te avisaremos por WhatsApp.` },
        pendiente: { cls: "is-pending", text: `Tu pago${codeSuffix} está pendiente de aprobación. En cuanto se confirme, tu cita quedará agendada.` },
        fallo: { cls: "is-error", text: `No se pudo completar tu pago${codeSuffix}. Puedes intentar de nuevo o transferir tu anticipo manualmente y enviarnos el comprobante por WhatsApp.` },
      };
      const info = MESSAGES[mp];
      if (info) {
        els.mpReturnBanner.textContent = `${info.text} (Toca para cerrar este aviso)`;
        els.mpReturnBanner.className = `mp-return-banner ${info.cls}`;
        els.mpReturnBanner.hidden = false;
        els.mpReturnBanner.addEventListener("click", () => (els.mpReturnBanner.hidden = true), { once: true });
        requestAnimationFrame(() => els.mpReturnBanner.scrollIntoView({ block: "start" }));
      }

      params.delete("mp");
      params.delete("codigo");
      const query = params.toString();
      const cleanUrl = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }

    function startCountdown(expiresAtIso) {
      if (countdownInterval) clearInterval(countdownInterval);
      const expiresAt = new Date(expiresAtIso).getTime();

      function tick() {
        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
          els.confirmationTimer.innerHTML = `Tu horario podría liberarse en cualquier momento. Si ya transferiste, envíanos tu comprobante y lo confirmamos manualmente.`;
          clearInterval(countdownInterval);
          return;
        }
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000)
          .toString()
          .padStart(2, "0");
        els.confirmationTimer.innerHTML = `Tienes <strong>${mins}:${secs}</strong> min para transferir tu anticipo y que confirmemos tu horario.`;
      }

      tick();
      countdownInterval = setInterval(tick, 1000);
    }

    function resetFlow() {
      state.service = null;
      state.date = null;
      state.slot = null;
      state.booking = null;
      if (countdownInterval) clearInterval(countdownInterval);
      els.form.reset();
      els.dateInput.value = "";
      els.slotGrid.innerHTML = "";
      els.slotStatus.textContent = "Elige una fecha para ver los horarios disponibles.";
      els.slotStatus.classList.remove("is-error");
      goToStep(1);
    }

    function init() {
      cacheEls();
      renderServicePickGrid();
      handleMpReturn();

      const today = new Date().toISOString().split("T")[0];
      els.dateInput.setAttribute("min", today);

      const maxAdvanceMonths = (cfg.booking && cfg.booking.maxAdvanceMonths) || 2;
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + maxAdvanceMonths);
      els.dateInput.setAttribute("max", maxDate.toISOString().split("T")[0]);

      els.dateInput.addEventListener("change", () => {
        state.date = els.dateInput.value;
        if (state.date) fetchAvailability(state.date);
      });

      document.querySelectorAll(".booking-back").forEach((btn) => {
        btn.addEventListener("click", () => goToStep(Number(btn.getAttribute("data-back"))));
      });

      els.form.addEventListener("submit", submitBooking);
      els.payOnlineBtn.addEventListener("click", payOnline);

      els.copyClabe.addEventListener("click", () => {
        const clabe = els.transferClabe.textContent;
        navigator.clipboard
          ?.writeText(clabe)
          .then(() => {
            const original = els.copyClabe.textContent;
            els.copyClabe.textContent = "¡Copiado!";
            setTimeout(() => (els.copyClabe.textContent = original), 1600);
          })
          .catch(() => {});
      });

      els.bookingRestart.addEventListener("click", resetFlow);
    }

    return { init, selectService };
  })();

  /* ---------------------------------------------------------
     Init — carga data/config.json y luego dibuja la página.
     Así, el panel de administración (/admin) puede editar ese
     archivo sin que nadie tenga que tocar código.
  --------------------------------------------------------- */
  function init(data) {
    cfg = data;
    renderBrand();
    renderAnnouncement();
    initPromoPopup();
    initPwaInstallBanner();
    renderFounder();
    renderGallery();
    renderContact();
    renderSocialLinks();
    renderWhatsappButtons();
    renderServices();
    renderPolicies();
    renderTestimonials();
    renderFAQ();
    initMobileNav();
    BookingFlow.init();
    initScrollReveal();

    // El contenido (barra de apertura, servicios, etc.) se dibuja después
    // de cargar config.json, así que si se entró con un #hash en la URL
    // (p. ej. desde la tarjeta digital) hay que reubicar el scroll una vez
    // que el layout final ya tiene su altura real.
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetch("data/config.json")
      .then((res) => res.json())
      .then(init)
      .catch((err) => {
        console.error("No se pudo cargar data/config.json", err);
      });
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
