// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  const normalizedKey = normalizeKey(relKey);
  downloadApiUrl.searchParams.set("path", normalizedKey);
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  const data = await response.json();
  return data.url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

/**
 * Descarga un archivo directamente usando la API de storage con autenticación
 * Este método descarga el archivo a través del proxy de Manus, evitando problemas de URLs firmadas
 */
export async function storageDownloadDirect(relKey: string): Promise<{ buffer: Buffer; contentType: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  // Usar el endpoint de download directo
  const downloadUrl = new URL('v1/storage/download', ensureTrailingSlash(baseUrl));
  downloadUrl.searchParams.set('path', key);
  
  const response = await fetch(downloadUrl.toString(), {
    method: 'GET',
    headers: buildAuthHeaders(apiKey),
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Storage] Direct download failed:', response.status, errorText);
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

/**
 * Descarga el contenido de un archivo desde S3 usando las credenciales del servidor
 * Retorna el buffer del archivo y su content-type
 */
export async function storageDownload(relKey: string): Promise<{ buffer: Buffer; contentType: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  // Primero obtener la URL firmada
  const signedUrl = await buildDownloadUrl(baseUrl, key, apiKey);
  
  // Luego descargar el archivo
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

/**
 * Extrae la key relativa de una URL de CloudFront
 * Ejemplo: https://d2xsxph8kpxj0f.cloudfront.net/310519663292328262/XhEkCr8yXcaeDFyuQebdJQ/projects/390001/diseno/file.jpg
 * Retorna: projects/390001/diseno/file.jpg
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // La estructura es: /{appId}/{tenantId}/{relativeKey}
    // Buscamos el índice donde empieza la key real (después de los IDs)
    const projectsIndex = pathParts.findIndex(p => p === 'projects' || p === 'hardware' || p === 'materials' || p === 'quotations');
    if (projectsIndex !== -1) {
      return pathParts.slice(projectsIndex).join('/');
    }
    // Si no encontramos un patrón conocido, tomamos los últimos 4 segmentos
    if (pathParts.length >= 4) {
      return pathParts.slice(-4).join('/');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Regenera una URL firmada a partir de una URL de CloudFront existente
 * Útil cuando las URLs originales han expirado
 */
export async function refreshSignedUrl(originalUrl: string): Promise<string> {
  const key = extractKeyFromUrl(originalUrl);
  if (!key) {
    console.warn('[Storage] Could not extract key from URL:', originalUrl);
    return originalUrl; // Retornar la URL original si no podemos extraer la key
  }
  
  try {
    const { url } = await storageGet(key);
    return url;
  } catch (error) {
    console.error('[Storage] Error refreshing signed URL:', error);
    return originalUrl; // Retornar la URL original si falla
  }
}
