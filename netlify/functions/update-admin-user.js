// Cambia el rol y las secciones visibles de una cuenta del panel. Solo una
// administradora puede hacer esto — ver Configuración → Usuarios y
// permisos. El cambio aplica la próxima vez que esa persona inicie sesión
// (o se le refresque el token), no de inmediato en una sesión ya abierta.
const { requireAdministrator, ALL_SECTIONS } = require("./_lib/requireAdmin");
const { updateIdentityUser } = require("./_lib/identityAdmin");

// El rol es sobre todo una etiqueta — el permiso real lo dan las
// secciones. Solo el valor exacto "administrador" tiene tratamiento
// especial (acceso total, no se puede restringir). Cualquier otro texto
// corto sirve como rol (Manager, Vendedora, o uno que la administradora
// invente, ej. "Recepción").
const ROLE_RE = /^[\p{L}0-9 ._-]{2,40}$/u;

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

  const { userId, role, sections, readOnlySections } = payload;
  if (!userId || typeof userId !== "string") return badRequest("Falta el usuario.");
  if (typeof role !== "string" || !ROLE_RE.test(role.trim())) {
    return badRequest("El rol debe tener entre 2 y 40 letras/números.");
  }
  const cleanRole = role.trim();
  if (!Array.isArray(sections) || sections.some((s) => typeof s !== "string")) {
    return badRequest("Las secciones deben ser una lista.");
  }
  if (readOnlySections !== undefined && (!Array.isArray(readOnlySections) || readOnlySections.some((s) => typeof s !== "string"))) {
    return badRequest("Las secciones de solo lectura deben ser una lista.");
  }

  // Nadie puede quitarse el rol de administradora a sí misma por error
  // desde este formulario — evita quedarse sin ninguna cuenta con acceso
  // total sin querer.
  if (requester.sub === userId && cleanRole !== "administrador") {
    return badRequest("No puedes quitarte tu propio rol de administradora desde aquí.");
  }

  // Una administradora siempre ve todo, en modo edición — no tiene caso
  // "restringirla" a medias, y así los checkboxes no importan si eligieron
  // ese rol.
  const isAdminRole = cleanRole === "administrador";
  const effectiveSections = isAdminRole ? ALL_SECTIONS : sections.filter((s) => ALL_SECTIONS.includes(s));
  const effectiveReadOnly = isAdminRole
    ? []
    : (readOnlySections || []).filter((s) => ALL_SECTIONS.includes(s) && effectiveSections.includes(s));

  try {
    const updated = await updateIdentityUser(context, userId, {
      roles: [cleanRole],
      sections: effectiveSections,
      readOnlySections: effectiveReadOnly,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({
        user: { id: updated.id, email: updated.email, role: cleanRole, sections: effectiveSections, readOnlySections: effectiveReadOnly },
      }),
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
