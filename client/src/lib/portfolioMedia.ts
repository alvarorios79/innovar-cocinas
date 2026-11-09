/**
 * Ayudas del Portafolio en el navegador: direcciones de fotos/videos y subida de videos.
 */

const PROXIED_HOSTS = ["firebasestorage.googleapis.com", "storage.googleapis.com"];

function isProxied(url: string): boolean {
  try {
    return PROXIED_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Dirección "del mismo sitio" para usar una foto en el lienzo (armar imágenes de redes).
 * Las fotos de Firebase pasan por /api/portfolio/media; las locales se usan tal cual.
 */
export function sameOriginMedia(url: string): string {
  return isProxied(url) ? `/api/portfolio/media?u=${encodeURIComponent(url)}` : url;
}

/** Enlace para descargar un archivo con su nombre. */
export function downloadMediaUrl(url: string, name: string): string {
  if (isProxied(url)) return `/api/portfolio/media?u=${encodeURIComponent(url)}&download=1&name=${encodeURIComponent(name)}`;
  return url;
}

/** Nombre corto para archivos: "Cocina Pérez" → "cocina-perez". */
export function slug(s: string): string {
  return (s || "proyecto")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "proyecto";
}

/** Sube un video del proyecto mostrando el avance (0–100). */
export function uploadProjectVideo(projectId: number, file: File, onProgress: (pct: number) => void): Promise<{ id: number; url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/portfolio/videos?projectId=${projectId}&name=${encodeURIComponent(file.name)}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: any = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { /* sin cuerpo */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || "No se pudo subir el video"));
    };
    xhr.onerror = () => reject(new Error("Se perdió la conexión mientras subía el video"));
    xhr.send(file);
  });
}

/** Guarda o comparte un archivo (en el celular abre "Compartir" para guardarlo en la galería). */
export async function saveOrShare(blob: Blob, fileName: string, preferShare = false): Promise<"shared" | "downloaded"> {
  const file = new File([blob], fileName, { type: blob.type });
  const nav: any = navigator;
  if (preferShare && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (e: any) {
      if (e?.name === "AbortError") return "shared";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "downloaded";
}
