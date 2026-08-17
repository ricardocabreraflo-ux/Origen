// Aviso para instalar la app (PWA) — compartido entre index.html y
// tarjeta.html, para que aparezca sin importar por dónde entre la
// clienta. Independiente de config.json a propósito, así corre apenas
// carga el DOM sin esperar ningún fetch.
(function () {
  "use strict";

  const DISMISS_DAYS = 14;
  const DISMISS_KEY = "pwaInstallDismissedAt";

  function init() {
    const banner = document.getElementById("pwa-install-banner");
    if (!banner) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const daysSinceDismiss = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    if (dismissedAt && daysSinceDismiss < DISMISS_DAYS) return;

    const closeBtn = document.getElementById("pwa-install-close");
    const actionBtn = document.getElementById("pwa-install-action");
    const messageEl = document.getElementById("pwa-install-message");

    function dismiss() {
      banner.hidden = true;
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    closeBtn.addEventListener("click", dismiss);

    // No mostramos el aviso encima de la ventana emergente de promoción
    // (solo existe en index.html): esperamos a que se cierre antes de
    // mostrarlo, si es que existe en esta página.
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
