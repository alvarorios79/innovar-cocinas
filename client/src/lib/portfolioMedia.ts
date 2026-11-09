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

/**
 * Reduce la foto antes de subirla (máx. 2400 px, JPEG): una foto del celular de 4–8 MB queda en ~0,5–1 MB
 * y se ve igual de bien en redes. Si el navegador no la puede abrir (p. ej. HEIC en Chrome), se sube tal cual.
 */
export async function shrinkImage(file: File, maxSide = 2400): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob || file;
  } catch {
    return file;
  }
}

/** Sube una foto a un bloque del portafolio (Antes, Diseño, Instalación o Después). */
export async function uploadPortfolioPhoto(projectId: number, section: string, file: File): Promise<{ id: number; url: string }> {
  const body = await shrinkImage(file);
  const res = await fetch(`/api/portfolio/photos?projectId=${projectId}&section=${section}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": body.type || file.type || "image/jpeg" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo subir la foto");
  return data;
}
