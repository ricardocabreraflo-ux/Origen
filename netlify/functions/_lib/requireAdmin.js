// Netlify valida el JWT de Identity automáticamente cuando el fetch del
// cliente manda "Authorization: Bearer <token>" y llena
// context.clientContext.user si es válido. Si no está presente, quien
// llama no inició sesión (o el token expiró/es inválido).
function requireAdmin(context) {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    const err = new Error("No autorizado");
    err.statusCode = 401;
    throw err;
  }
  return user;
}

const ALL_SECTIONS = ["citas", "clientas", "lealtad", "reportes", "finanzas", "contenido", "configuracion"];

// Antes de que existieran roles, cualquier persona con sesión iniciada
// tenía acceso completo — para no dejar fuera a cuentas ya existentes que
// nadie ha configurado todavía, una cuenta sin rol asignado se sigue
// tratando como administradora (acceso total) hasta que alguien le
// asigne un rol distinto desde Configuración.
function getUserRole(user) {
  const roles = user.app_metadata && user.app_metadata.roles;
  return Array.isArray(roles) && roles.length ? roles[0] : "administrador";
}

// Una administradora siempre ve todas las secciones — no se puede
// restringir por accidente y dejar el negocio sin nadie con acceso total.
function getUserSections(user) {
  if (getUserRole(user) === "administrador") return ALL_SECTIONS;
  const sections = user.app_metadata && user.app_metadata.sections;
  return Array.isArray(sections) ? sections : [];
}

function requireSection(context, section) {
  const user = requireAdmin(context);
  if (!getUserSections(user).includes(section)) {
    const err = new Error("Esta cuenta no tiene permiso para ver esta sección.");
    err.statusCode = 403;
    throw err;
  }
  return user;
}

// Secciones marcadas "solo lectura": la cuenta las puede ver (list-* sigue
// funcionando) pero no crear/editar/borrar nada ahí. Una administradora
// nunca es de solo lectura en ninguna sección.
function getUserReadOnlySections(user) {
  if (getUserRole(user) === "administrador") return [];
  const readOnly = user.app_metadata && user.app_metadata.readOnlySections;
  return Array.isArray(readOnly) ? readOnly : [];
}

function requireSectionWrite(context, section) {
  const user = requireSection(context, section);
  if (getUserReadOnlySections(user).includes(section)) {
    const err = new Error("Esta cuenta solo puede ver esta sección, no editarla.");
    err.statusCode = 403;
    throw err;
  }
  return user;
}

// Otorgar/quitar permisos es en sí una acción sensible — no basta con
// tener marcada la sección "configuracion" (esa también la puede tener,
// por ejemplo, quien solo sube fotos a la galería). Cambiar los permisos
// de alguien más requiere ser administradora.
function requireAdministrator(context) {
  const user = requireAdmin(context);
  if (getUserRole(user) !== "administrador") {
    const err = new Error("Solo una cuenta administradora puede hacer esto.");
    err.statusCode = 403;
    throw err;
  }
  return user;
}

module.exports = {
  requireAdmin,
  requireSection,
  requireSectionWrite,
  requireAdministrator,
  getUserRole,
  getUserSections,
  getUserReadOnlySections,
  ALL_SECTIONS,
};
