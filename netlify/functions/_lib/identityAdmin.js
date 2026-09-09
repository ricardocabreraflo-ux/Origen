// Llama a la API de administración de Netlify Identity (GoTrue) para listar
// y editar usuarios — quién puede entrar al panel y qué rol/permisos tiene.
// context.clientContext.identity trae url + token (un JWT de admin de corta
// duración) que Netlify genera automáticamente en cada invocación; no hace
// falta ninguna llave aparte.
function getIdentityContext(context) {
  const identity = context.clientContext && context.clientContext.identity;
  if (!identity || !identity.url || !identity.token) {
    const err = new Error("No se pudo conectar con Identity.");
    err.statusCode = 500;
    throw err;
  }
  return identity;
}

async function identityFetch(context, path, options) {
  const identity = getIdentityContext(context);
  const res = await fetch(`${identity.url}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      ...(options && options.headers),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Identity API ${res.status}: ${text || res.statusText}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }
  return res.json();
}

// GoTrue pagina de 50 en 50 por default; para un equipo pequeño con pocas
// cuentas basta con juntar unas cuantas páginas.
async function listIdentityUsers(context) {
  const users = [];
  let page = 1;
  const perPage = 100;
  for (;;) {
    const data = await identityFetch(context, `/admin/users?page=${page}&per_page=${perPage}`);
    const batch = Array.isArray(data) ? data : data.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 10) break; // salvavidas: no debería haber cientos de cuentas
  }
  return users;
}

async function updateIdentityUser(context, userId, appMetadata) {
  return identityFetch(context, `/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({ app_metadata: appMetadata }),
  });
}

module.exports = { listIdentityUsers, updateIdentityUser };
