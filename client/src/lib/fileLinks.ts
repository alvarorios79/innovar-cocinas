/**
 * Archivos del proyecto (fotos, PDF de despieces…): reconocer PDF y armar enlaces de descarga.
 */

/** ¿Es PDF? Las direcciones de Firebase traen "?alt=media&token=…" al final y la ruta codificada (%2F). */
export function isPdfUrl(url?: string | null): boolean {
  if (!url) return false;
  let path = url.split("?")[0];
  try { path = decodeURIComponent(path); } catch { /* deja la ruta como está */ }
  return path.toLowerCase().endsWith(".pdf") || url.includes("application/pdf");
}

const DOWNLOAD_HOSTS = ["firebasestorage.googleapis.com", "storage.googleapis.com", "d2xsxph8kpxj0f.cloudfront.net"];

/**
 * Enlace de descarga por el propio CRM (/api/files/download): evita el bloqueo de Firebase (CORS)
 * y el de ventanas en el iPhone. null si el archivo no es del almacenamiento del CRM.
 */
export function downloadHref(url: string, name: string): string | null {
  try {
    if (!DOWNLOAD_HOSTS.includes(new URL(url).hostname)) return null;
  } catch {
    return null;
  }
  return `/api/files/download?u=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
}
