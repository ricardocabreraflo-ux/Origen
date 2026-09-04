// Las 6 fotos migradas de data/config.json guardan su ruta absoluta tal
// cual (empieza con "/", un archivo del sitio en assets/) — las fotos
// nuevas subidas desde el panel solo guardan su nombre dentro del bucket
// "gallery" de Supabase Storage, así que hay que armarles la URL pública.
function buildPublicUrl(storagePath) {
  if (/^https?:\/\//.test(storagePath) || storagePath.startsWith("/")) return storagePath;
  const base = process.env.SUPABASE_URL;
  return `${base}/storage/v1/object/public/gallery/${storagePath}`;
}

// Solo las fotos subidas por este sistema viven dentro del bucket — las
// migradas son archivos del sitio (assets/) y nunca se deben borrar del
// storage de Supabase.
function isBucketFile(storagePath) {
  return !storagePath.startsWith("/") && !/^https?:\/\//.test(storagePath);
}

module.exports = { buildPublicUrl, isBucketFile };
