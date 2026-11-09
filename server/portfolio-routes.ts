/**
 * Rutas del Portafolio que no caben en tRPC:
 *
 * POST /api/portfolio/videos?projectId=N&name=archivo.mp4
 *   Sube un video (el cuerpo es el archivo tal cual). Se va pasando al almacenamiento mientras llega,
 *   sin cargarlo completo en memoria. Solo super_admin, admin y comercial.
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
import { projects, projectVideos } from "../drizzle/schema";
import { storagePutStream } from "./storage";
import { MAX_VIDEO_BYTES, canEditPortfolio, canViewPortfolio } from "@shared/portfolio";

const ALLOWED_MEDIA_HOSTS = ["firebasestorage.googleapis.com", "storage.googleapis.com"];

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

export function registerPortfolioRoutes(app: Express) {
  app.post("/api/portfolio/videos", async (req: Request, res: Response) => {
    const user: any = await userOf(req);
    if (!user) return res.status(401).json({ error: "Inicia sesión de nuevo" });
    if (!canEditPortfolio(user.role)) return res.status(403).json({ error: "No tienes permisos para subir videos" });

    const projectId = Number(req.query.projectId);
    const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const declared = Number(req.headers["content-length"] || 0);
    if (!projectId) return res.status(400).json({ error: "Falta el proyecto" });
    if (!contentType.startsWith("video/")) return res.status(400).json({ error: "El archivo no es un video" });
    if (declared > MAX_VIDEO_BYTES) return res.status(413).json({ error: "El video pesa más de 1 GB" });

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Base de datos no disponible" });
    const [proj] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
    if (!proj) return res.status(404).json({ error: "Proyecto no encontrado" });

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
      if (err?.message === "VIDEO_TOO_LARGE") return res.status(413).json({ error: "El video pesa más de 1 GB" });
      console.error("[Portafolio] Error subiendo video:", err);
      return res.status(500).json({ error: "No se pudo subir el video. Intenta de nuevo." });
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
