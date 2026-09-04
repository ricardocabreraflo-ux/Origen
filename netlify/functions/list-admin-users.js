// Lista las cuentas de Netlify Identity con acceso al panel, con su rol y
// qué secciones puede ver cada una — para la pantalla de Configuración →
// Usuarios y permisos.
const { requireAdministrator, getUserRole, getUserSections, getUserReadOnlySections } = require("./_lib/requireAdmin");
const { listIdentityUsers } = require("./_lib/identityAdmin");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    requireAdministrator(context);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: "unauthorized", message: err.message }) };
  }

  try {
    const identityUsers = await listIdentityUsers(context);
    const users = identityUsers
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName: (u.user_metadata && u.user_metadata.full_name) || "",
        confirmedAt: u.confirmed_at || null,
        role: getUserRole(u),
        sections: getUserSections(u),
        readOnlySections: getUserReadOnlySections(u),
      }))
      .sort((a, b) => a.email.localeCompare(b.email));

    return { statusCode: 200, body: JSON.stringify({ users }) };
  } catch (err) {
    console.error("list-admin-users error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: "No se pudo cargar la lista de usuarios." }) };
  }
};
