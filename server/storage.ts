// Storage helpers — soporta dos backends:
// 1. Manus Forge API (desarrollo en Manus, automático)
// 2. S3-compatible: Cloudflare R2, AWS S3, etc. (producción en Render)

import { ENV } from './_core/env';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── Backend Manus Forge ───────────────────────────────────────────────────────

type ForgeConfig = { baseUrl: string; apiKey: string };

function getForgeConfig(): ForgeConfig | null {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

// ── Backend Firebase Storage ──────────────────────────────────────────────────

function getFirebaseConfig() {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY;
  const bucket      = process.env.FIREBASE_STORAGE_BUCKET;
  if (!projectId || !clientEmail || !privateKey || !bucket) return null;
  return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n"), bucket };
}

async function storagePutFirebase(relKey: string, data: Buffer | Uint8Array | string, contentType: string): Promise<{ key: string; url: string }> {
  const cfg = getFirebaseConfig();
  if (!cfg) throw new Error("Firebase Storage not configured");

  const { initializeApp, cert, getApps, getApp } = await import("firebase-admin/app");
  const { getStorage } = await import("firebase-admin/storage");

  const app = getApps().length === 0
    ? initializeApp({ credential: cert({ projectId: cfg.projectId, clientEmail: cfg.clientEmail, privateKey: cfg.privateKey }), storageBucket: cfg.bucket })
    : getApp();

  const key    = normalizeKey(relKey);
  const body   = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data as any);
  const bucket = getStorage(app).bucket();
  const file   = bucket.file(key);

  await file.save(body, { contentType, public: true, metadata: { cacheControl: "public, max-age=31536000" } });

  const url = `https://storage.googleapis.com/${cfg.bucket}/${key}`;
  return { key, url };
}

// ── Backend S3-compatible (Cloudflare R2 / AWS S3) ───────────────────────────

function getS3Config() {
  const endpoint  = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket    = process.env.S3_BUCKET_NAME;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!endpoint || !accessKey || !secretKey || !bucket || !publicUrl) return null;
  return { endpoint, accessKey, secretKey, bucket, publicUrl };
}

async function storagePutS3(relKey: string, data: Buffer | Uint8Array | string, contentType: string): Promise<{ key: string; url: string }> {
  const cfg = getS3Config();
  if (!cfg) throw new Error("S3 storage not configured");

  const client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
  });

  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data as any);

  await client.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  const url = `${cfg.publicUrl.replace(/\/+$/, "")}/${key}`;
  return { key, url };
}

// ── Manus Forge config (legacy) ───────────────────────────────────────────────

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const cfg = getForgeConfig();
  if (!cfg) throw new Error("Storage not configured");
  return cfg;
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
  // Preferir Manus Forge API si está disponible (entorno de desarrollo Manus)
  const forge = getForgeConfig();
  if (forge) {
    const key = normalizeKey(relKey);
    const uploadUrl = buildUploadUrl(forge.baseUrl, key);
    const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildAuthHeaders(forge.apiKey),
      body: formData,
    });
    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Storage upload failed (${response.status}): ${message}`);
    }
    const url = (await response.json()).url;
    return { key, url };
  }

  // Fallback 1: Firebase Storage
  if (getFirebaseConfig()) {
    return storagePutFirebase(relKey, data, contentType);
  }

  // Fallback 2: S3-compatible (Cloudflare R2, AWS S3, etc.)
  if (getS3Config()) {
    return storagePutS3(relKey, data, contentType);
  }

  throw new Error(
    "Storage no configurado. Agrega FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
    "FIREBASE_PRIVATE_KEY y FIREBASE_STORAGE_BUCKET en las variables de entorno de Render."
  );
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

/**
 * Genera una URL presignada directamente desde S3 (sin CloudFront)
 * Útil para archivos privados que necesitan acceso temporal
 * Retorna una URL del tipo: https://bucket-name.s3.amazonaws.com/...
 */
export async function getPresignedS3Url(relKey: string, expiresIn: number = 3600): Promise<string> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  // Usar el endpoint de presigned URL que retorna URLs directas de S3
  const presignedApiUrl = new URL(
    'v1/storage/presignedUrl',
    ensureTrailingSlash(baseUrl)
  );
  presignedApiUrl.searchParams.set('path', key);
  presignedApiUrl.searchParams.set('expiresIn', String(expiresIn));
  
  const response = await fetch(presignedApiUrl, {
    method: 'GET',
    headers: buildAuthHeaders(apiKey),
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Storage] Presigned URL generation failed:', response.status, errorText);
    throw new Error(`Failed to generate presigned URL: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Validar que sea una URL de S3 directo, no CloudFront
  if (!data.url || typeof data.url !== 'string') {
    throw new Error('Invalid presigned URL response');
  }
  
  if (!data.url.includes('.s3.amazonaws.com') && !data.url.includes('.s3.') && !data.url.includes('s3-')) {
    console.warn('[Storage] Warning: Presigned URL may be from CloudFront:', data.url);
  }
  
  return data.url;
}

/**
 * Verifica si un archivo existe realmente en S3 usando HeadObjectCommand
 * Retorna true si existe, false si no existe
 * Esta es una verificación REAL, no solo una búsqueda en metadatos
 */
export async function checkFileExistsInS3(relKey: string): Promise<boolean> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  console.log(`[Storage] Verificando existencia real del archivo en S3: ${key}`);
  
  try {
    // Usar el endpoint de verificación HEAD que realiza HeadObjectCommand real
    const checkApiUrl = new URL(
      'v1/storage/head',
      ensureTrailingSlash(baseUrl)
    );
    checkApiUrl.searchParams.set('path', key);
    
    const response = await fetch(checkApiUrl, {
      method: 'HEAD',
      headers: buildAuthHeaders(apiKey),
    });
    
    // Status 200 = existe, 404 = no existe
    if (response.status === 200) {
      console.log(`[Storage] ✅ Archivo EXISTE en S3: ${key}`);
      return true;
    } else if (response.status === 404) {
      console.warn(`[Storage] ⚠️ Archivo NO EXISTE en S3: ${key}`);
      return false;
    } else {
      console.warn(`[Storage] Verificación de existencia retornó status ${response.status}`);
      return false;
    }
  } catch (error: any) {
    console.error(`[Storage] Error verificando existencia del archivo: ${error?.message}`);
    return false;
  }
}

/**
 * Genera una URL presignada directamente desde S3 (sin CloudFront)
 * Con verificación previa de existencia del archivo
 * Si el archivo no existe, retorna null
 */
export async function getPresignedS3UrlWithCheck(relKey: string, expiresIn: number = 3600): Promise<string | null> {
  const key = normalizeKey(relKey);
  
  console.log(`[Storage] Verificando existencia del archivo: ${key}`);
  
  // Verificar si el archivo existe
  const fileExists = await checkFileExistsInS3(key);
  
  if (!fileExists) {
    console.warn(`[Storage] Archivo no existe en S3: ${key}`);
    return null;
  }
  
  console.log(`[Storage] Archivo existe en S3, generando URL presignada`);
  
  try {
    const presignedUrl = await getPresignedS3Url(key, expiresIn);
    console.log(`[Storage] URL presignada generada exitosamente`);
    return presignedUrl;
  } catch (error: any) {
    console.error(`[Storage] Error generando URL presignada:`, error?.message);
    return null;
  }
}
