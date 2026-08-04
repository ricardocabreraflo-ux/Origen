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

module.exports = { requireAdmin };
