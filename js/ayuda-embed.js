// Cuando una página de admin/ayuda/*.html se abre incrustada dentro del
// panel (en el iframe del panel de Ayuda), el botón "← Volver al panel"
// no debe navegar dentro del iframe — el panel ya tiene su propio botón
// "✕ Cerrar" para eso. Si la página se abre suelta (visitada directo o
// compartida), el enlace se queda normal y sí navega.
(function () {
  "use strict";
  if (window.top === window.self) return;
  var backLink = document.querySelector(".tutorial-topbar .back-link");
  if (backLink) backLink.hidden = true;
})();
