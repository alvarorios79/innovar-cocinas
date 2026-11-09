/**
 * Rutas del Portafolio que no caben en tRPC:
 *
 * POST /api/portfolio/videos?projectId=N&name=archivo.mp4
 *   Sube un video (el cuerpo es el archivo tal cual). Se va pasando al almacenamiento mientras llega,
 *   sin cargarlo completo en memoria. Solo super_admin, admin y comercial.
 *
 * POST /api/portfolio/photos?projectId=N&section=antes|diseno|instalacion|despues
 *   Sube una foto a un bloque del portafolio (ya reducida en el navegador). Queda guardada en la
 *   carpeta del proyecto que corresponde (Fotos iniciales, Renders, Instalación, Fotos finales),
 *   SIN cambiar la etapa del proyecto. Solo super_admin, admin y comercial.
 *
 * GET /api/portfolio/media?u=<url>[&download=1&name=archivo]
 *   Entrega una foto o video guardado en Firebase desde el mismo dominio del CRM. Hace falta para
 *   que el navegador pueda armar las imágenes de redes (el lienzo no deja usar fotos de otro sitio)
 *   y para descargar los videos con su nombre. Solo usuarios con acceso al portafolio y solo
 *   direcciones del almacenamiento del CRM.
 */
import type { Express, Request, Response } from "express";
import { Readable, Transform } from "stream";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { projectPhotos, projects, projectVideos } from "../drizzle/schema";
import { storagePut, storagePutStream } from "./storage";
import {
  MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, SECTION_UPLOAD_TARGET, canEditPortfolio, canViewPortfolio, type PortfolioSection,
} from "@shared/portfolio";

const ALLOWED_MEDIA_HOSTS = ["firebasestorage.googleapis.com", "storage.googleapis.com"];

/** Responde con error y lo deja en los registros de Render (para saber por qué falló una subida). */
function reject(res: Response, status: number, error: string, ctx: string) {
  console.warn(`[Portafolio] ${ctx} rechazada (${status}): ${error}`);
  return res.status(status).json({ error });
}

async function userOf(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4", "video/quicktime": "mov", "video/x-m4v": "m4v", "video/webm": "webm", "video/3gpp": "3gp",
};

/** Corta la subida si pasa del límite. */
function byteLimit(max: number) {
  let total = 0;
  const t = new Transform({
    transform(chunk, _enc, cb) {
      total += chunk.length;
      if (total > max) return cb(new Error("VIDEO_TOO_LARGE"));
      cb(null, chunk);
    },
  });
  return { stream: t, size: () => total };
}

const PHOTO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

async function readBody(req: Request, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const c of req) {
    total += (c as Buffer).length;
    if (total > max) throw new Error("PHOTO_TOO_LARGE");
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}

export function registerPortfolioRoutes(app: Express) {
  app.post("/api/portfolio/photos", async (req: Request, res: Response) => {
    const user: any = await userOf(req);
    if (!user) return reject(res, 401, "Inicia sesión de nuevo", `Foto proyecto ${req.query.projectId}`);
    if (!canEditPortfolio(user.role)) return reject(res, 403, "No tienes permisos para subir fotos al portafolio", `Foto proyecto ${req.query.projectId}`);

    const projectId = Number(req.query.projectId);
    const section = String(req.query.section || "") as PortfolioSection;
    const target = SECTION_UPLOAD_TARGET[section];
    const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase() || "image/jpeg";
    if (!projectId || !target) return reject(res, 400, "Falta el proyecto o el bloque", `Foto proyecto ${req.query.projectId}`);
    if (!contentType.startsWith("image/")) return reject(res, 400, "El archivo no es una foto", `Foto proyecto ${req.query.projectId}`);

    const db = await getDb();
    if (!db) return reject(res, 500, "Base de datos no disponible", `Foto proyecto ${req.query.projectId}`);
    const [proj] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
    if (!proj) return reject(res, 404, "Proyecto no encontrado", `Foto proyecto ${req.query.projectId}`);

    try {
      const body = await readBody(req, MAX_PHOTO_BYTES);
      if (!body.length) return reject(res, 400, "La foto llegó vacía", `Foto proyecto ${req.query.projectId}`);
      const ext = PHOTO_EXT[contentType] || "jpg";
      const key = `projects/${projectId}/portafolio/${section}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { url } = await storagePut(key, body, contentType);
      const [row] = await db.insert(projectPhotos).values({
        projectId, photoUrl: url, uploadedBy: user.id, description: "Subida desde el Portafolio",
        stage: target.stage, category: target.category, subcategory: target.subcategory,
      } as any).returning({ id: projectPhotos.id });
      console.log(`[Portafolio] Foto subida al proyecto ${projectId} (${section}, ${Math.round(body.length / 1024)} KB, ${contentType})`);
      return res.json({ id: row.id, url });
    } catch (err: any) {
      if (err?.message === "PHOTO_TOO_LARGE") return reject(res, 413, "La foto pesa demasiado", `Foto proyecto ${req.query.projectId}`);
      console.error("[Portafolio] Error subiendo foto:", err);
      return reject(res, 500, "No se pudo subir la foto. Intenta de nuevo.", `Foto proyecto ${req.query.projectId}`);
    }
  });
  app.post("/api/portfolio/videos", async (req: Request, res: Response) => {
    const user: any = await userOf(req);
    if (!user) return reject(res, 401, "Inicia sesión de nuevo", `Video proyecto ${req.query.projectId}`);
    if (!canEditPortfolio(user.role)) return reject(res, 403, "No tienes permisos para subir videos", `Video proyecto ${req.query.projectId}`);

    const projectId = Number(req.query.projectId);
    const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase() || "video/mp4";
    const declared = Number(req.headers["content-length"] || 0);
    if (!projectId) return reject(res, 400, "Falta el proyecto", `Video proyecto ${req.query.projectId}`);
    if (!contentType.startsWith("video/")) return reject(res, 400, "El archivo no es un video", `Video proyecto ${req.query.projectId}`);
    if (declared > MAX_VIDEO_BYTES) return reject(res, 413, "El video pesa más de 1 GB", `Video proyecto ${req.query.projectId}`);

    const db = await getDb();
    if (!db) return reject(res, 500, "Base de datos no disponible", `Video proyecto ${req.query.projectId}`);
    const [proj] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
    if (!proj) return reject(res, 404, "Proyecto no encontrado", `Video proyecto ${req.query.projectId}`);

    const rawName = String(req.query.name || "video").slice(0, 120);
    const ext = VIDEO_EXT[contentType] || (rawName.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const key = `projects/${projectId}/videos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    try {
      const limit = byteLimit(MAX_VIDEO_BYTES);
      const { url } = await storagePutStream(key, req.pipe(limit.stream), contentType);
      const [row] = await db.insert(projectVideos).values({
        projectId, url, storageKey: key, fileName: rawName, sizeBytes: limit.size(), contentType, uploadedBy: user.id,
      }).returning({ id: projectVideos.id });
      console.log(`[Portafolio] Video subido al proyecto ${projectId} (${Math.round(limit.size() / 1048576)} MB)`);
      return res.json({ id: row.id, url });
    } catch (err: any) {
      if (err?.message === "VIDEO_TOO_LARGE") return reject(res, 413, "El video pesa más de 1 GB", `Video proyecto ${req.query.projectId}`);
      console.error("[Portafolio] Error subiendo video:", err);
      return reject(res, 500, "No se pudo subir el video. Intenta de nuevo.", `Video proyecto ${req.query.projectId}`);
    }
  });

  app.get("/api/portfolio/media", async (req: Request, res: Response) => {
    const user: any = await userOf(req);
    if (!user) return res.status(401).send("Inicia sesión de nuevo");
    if (!canViewPortfolio(user.role)) return res.status(403).send("Sin acceso");

    let target: URL;
    try {
      target = new URL(String(req.query.u || ""));
    } catch {
      return res.status(400).send("Dirección inválida");
    }
    if (target.protocol !== "https:" || !ALLOWED_MEDIA_HOSTS.includes(target.hostname)) {
      return res.status(400).send("Dirección no permitida");
    }

    try {
      const headers: Record<string, string> = {};
      if (req.headers.range) headers.range = String(req.headers.range);
      const upstream = await fetch(target.toString(), { headers });
      if (!upstream.ok && upstream.status !== 206) return res.status(upstream.status).send("No se pudo obtener el archivo");
      res.status(upstream.status);
      for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }
      res.setHeader("Cache-Control", "private, max-age=86400");
      if (req.query.download) {
        const name = String(req.query.name || "archivo").replace(/[^\w.\- ]+/g, "_").slice(0, 100);
        res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
      }
      if (!upstream.body) return res.end();
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (err) {
      console.error("[Portafolio] Error entregando archivo:", err);
      if (!res.headersSent) res.status(502).send("No se pudo obtener el archivo");
    }
  });
}
