// Cambia el rol y las secciones visibles de una cuenta del panel. Solo una
// administradora puede hacer esto — ver Configuración → Usuarios y
// permisos. El cambio aplica la próxima vez que esa persona inicie sesión
// (o se le refresque el token), no de inmediato en una sesión ya abierta.
const { requireAdministrator, ALL_SECTIONS } = require("./_lib/requireAdmin");
const { updateIdentityUser } = require("./_lib/identityAdmin");

const VALID_ROLES = ["administrador", "manager", "vendedor"];

function badRequest(message) {
  return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message }) };
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  let requester;
  try {
    requester = requireAdministrator(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized", message: err.message }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("JSON inválido.");
  }

  const { userId, role, sections } = payload;
  if (!userId || typeof userId !== "string") return badRequest("Falta el usuario.");
  if (!VALID_ROLES.includes(role)) return badRequest("Rol inválido.");
  if (!Array.isArray(sections) || sections.some((s) => typeof s !== "string")) {
    return badRequest("Las secciones deben ser una lista.");
  }

  // Nadie puede quitarse el rol de administradora a sí misma por error
  // desde este formulario — evita quedarse sin ninguna cuenta con acceso
  // total sin querer.
  if (requester.sub === userId && role !== "administrador") {
    return badRequest("No puedes quitarte tu propio rol de administradora desde aquí.");
  }

  // Una administradora siempre ve todo — no tiene caso "restringirla" a
  // medias, y así el checkbox de secciones no importa si eligieron ese rol.
  const effectiveSections = role === "administrador" ? ALL_SECTIONS : sections.filter((s) => ALL_SECTIONS.includes(s));

  try {
    const updated = await updateIdentityUser(context, userId, { roles: [role], sections: effectiveSections });
    return {
      statusCode: 200,
      body: JSON.stringify({ user: { id: updated.id, email: updated.email, role, sections: effectiveSections } }),
    };
  } catch (err) {
    console.error("update-admin-user error", err);
    const statusCode = err.statusCode === 404 ? 404 : 500;
    return {
      statusCode,
      body: JSON.stringify({ error: statusCode === 404 ? "not_found" : "server_error", message: "No se pudo actualizar el usuario." }),
    };
  }
};
