// Almacenamiento de archivos — backends (en este orden):
// 1. Firebase Storage (producción en Render)
// 2. S3-compatible: Cloudflare R2, AWS S3, etc.
// 3. Carpeta local .local-uploads/ (solo desarrollo)
// (El backend "Manus Forge" de la época Manus se quitó en nov 2026.)

import { ENV } from './_core/env';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";


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
  const { randomUUID } = await import("crypto");

  const app = getApps().length === 0
    ? initializeApp({ credential: cert({ projectId: cfg.projectId, clientEmail: cfg.clientEmail, privateKey: cfg.privateKey }), storageBucket: cfg.bucket })
    : getApp();

  const key    = normalizeKey(relKey);
  const body   = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data as any);
  const bucketObj = getStorage(app).bucket();
  const file   = bucketObj.file(key);

  // Generar token de descarga único (compatible con uniform bucket-level access)
  // predefinedAcl=publicRead falla con 403 en buckets con uniform access activado
  const downloadToken = randomUUID();

  await file.save(body, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  // URL con token de descarga — permanente, no expira, acceso público sin ACL
  const encodedKey = encodeURIComponent(key);
  const url = `https://firebasestorage.googleapis.com/v0/b/${cfg.bucket}/o/${encodedKey}?alt=media&token=${downloadToken}`;
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


// ── Backend local (solo NODE_ENV=development) ────────────────────────────────
// Guarda en <proyecto>/.local-uploads/ y se sirve en /local-uploads/ (ver _core/index.ts).
// Permite probar subidas en el Mac sin claves de Firebase/S3.

export const LOCAL_UPLOADS_DIR = ".local-uploads";

async function storagePutLocalDev(relKey: string, data: Buffer | Uint8Array | string): Promise<{ key: string; url: string }> {
  const { mkdir, writeFile } = await import("fs/promises");
  const path = await import("path");
  const key = normalizeKey(relKey).replace(/\.\.+/g, "_");
  const filePath = path.resolve(LOCAL_UPLOADS_DIR, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return { key, url: `/local-uploads/${key}` };
}

// ── Diagnóstico de storage ───────────────────────────────────────────────────

export function logStorageStatus() {
  const firebase = getFirebaseConfig();
  const s3 = getS3Config();
  if (firebase) {
    console.log('[Storage] ✅ Backend activo: Firebase Storage (bucket:', firebase.bucket, ')');
  } else if (s3) {
    console.log('[Storage] ✅ Backend activo: S3/R2 (endpoint:', s3.endpoint, ', bucket:', s3.bucket, ')');
  } else {
    console.error('[Storage] ❌ NINGÚN backend configurado — las subidas de archivos fallarán.');
    console.error('[Storage]    Configura en Render: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_PUBLIC_URL');
    console.error('[Storage]    O bien: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET');
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // 1. Firebase Storage
  if (getFirebaseConfig()) {
    return storagePutFirebase(relKey, data, contentType);
  }

  // 2. S3-compatible (Cloudflare R2, AWS S3, etc.)
  if (getS3Config()) {
    return storagePutS3(relKey, data, contentType);
  }

  // 3. (SOLO desarrollo local, nunca en Render): carpeta .local-uploads/
  if (process.env.NODE_ENV === "development") {
    return storagePutLocalDev(relKey, data);
  }

  throw new Error(
    "Storage no configurado. Agrega FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
    "FIREBASE_PRIVATE_KEY y FIREBASE_STORAGE_BUCKET en las variables de entorno de Render."
  );
}

