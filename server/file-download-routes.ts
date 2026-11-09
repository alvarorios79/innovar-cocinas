/**
 * GET /api/files/download?u=<url>&name=<nombre>
 *
 * Descarga un archivo del proyecto (PDF de despieces, fotos…) desde el mismo dominio del CRM.
 * Hace falta porque:
 *  - Firebase no deja bajar archivos "por código" desde otra página (CORS), y
 *  - el visor, al fallar, abría otra pestaña "tarde" (después de esperar) y el iPhone la bloqueaba.
 * Con este enlace el navegador descarga directo, con el nombre del archivo y su extensión.
 *
 * Para cualquier usuario del equipo con sesión (también jefe de taller y operario).
 * Solo direcciones del almacenamiento del CRM.
 */
import type { Express, Request, Response } from "express";
import { Readable } from "stream";
import { and, eq, isNull } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { projectDocShares, projectPhotos, projects } from "../drizzle/schema";

const STAFF_ROLES = ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario", "medidor", "contador"];

function allowedHosts(): string[] {
  const hosts = ["firebasestorage.googleapis.com", "storage.googleapis.com", "d2xsxph8kpxj0f.cloudfront.net"];
  try {
    if (process.env.S3_PUBLIC_URL) hosts.push(new URL(process.env.S3_PUBLIC_URL).hostname);
  } catch { /* sin S3 */ }
  return hosts;
}

const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov",
};

/** Nombre seguro para el archivo, con su extensión. */
export function downloadName(name: string, contentType: string | null, url: URL): string {
  let base = (name || "").replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "archivo";
  const fromPath = decodeURIComponent(url.pathname).split("/").pop() || "";
  const ext = (contentType && EXT_BY_TYPE[contentType.split(";")[0].trim()]) || (fromPath.match(/\.([a-z0-9]{2,5})$/i)?.[1] || "").toLowerCase();
  if (ext && !base.toLowerCase().endsWith(`.${ext}`)) base = `${base}.${ext}`;
  return base;
}

/** Pasa el archivo al navegador como descarga (nombre + extensión). */
async function streamDownload(res: Response, target: URL, rawName: string, logCtx: string) {
  const upstream = await fetch(target.toString());
  if (!upstream.ok) {
    console.warn(`[Descargas] ${logCtx}: el archivo respondió ${upstream.status}`);
    return res.status(upstream.status).send("No se pudo obtener el archivo");
  }
  const type = upstream.headers.get("content-type");
  const name = downloadName(rawName, type, target);
  if (type) res.setHeader("Content-Type", type);
  const len = upstream.headers.get("content-length");
  if (len) res.setHeader("Content-Length", len);
  const ascii = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_");
  res.setHeader("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  if (!upstream.body) return res.end();
  Readable.fromWeb(upstream.body as any).pipe(res);
}

export function registerFileDownloadRoutes(app: Express) {
  /**
   * GET /api/files/shared?project=X&token=Y&doc=ID — el CLIENTE descarga un plano/detalle que se le envió.
   * Sin sesión: valida el enlace del proyecto (token) y que ese archivo se le haya enviado y siga visible.
   */
  app.get("/api/files/shared", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.query.project);
      const token = String(req.query.token || "");
      const docId = Number(req.query.doc);
      if (!projectId || !token || !docId) return res.status(400).send("Enlace incompleto");
      const d = await getDb();
      if (!d) return res.status(500).send("No disponible");
      const [p] = await d.select({ token: projects.publicToken }).from(projects).where(eq(projects.id, projectId));
      if (!p?.token || p.token !== token) return res.status(403).send("Enlace inválido");
      const [row] = await d.select({ url: projectPhotos.photoUrl, name: projectPhotos.description, fileName: projectDocShares.fileName })
        .from(projectDocShares)
        .innerJoin(projectPhotos, eq(projectPhotos.id, projectDocShares.photoId))
        .where(and(eq(projectDocShares.projectId, projectId), eq(projectDocShares.photoId, docId), isNull(projectDocShares.hiddenAt)));
      if (!row) return res.status(404).send("Documento no disponible");
      if (row.url.startsWith("/")) return res.redirect(row.url); // archivo local (solo en desarrollo)
      let target: URL;
      try { target = new URL(row.url); } catch { return res.status(400).send("Documento no disponible"); }
      if (target.protocol !== "https:" || !allowedHosts().includes(target.hostname)) return res.redirect(row.url);
      await streamDownload(res, target, row.name || row.fileName || "Documento", `cliente proyecto ${projectId}`);
    } catch (err) {
      console.error("[Descargas] Error (cliente):", err);
      if (!res.headersSent) res.status(502).send("No se pudo obtener el archivo");
    }
  });
  app.get("/api/files/download", async (req: Request, res: Response) => {
    let user: any = null;
    try { user = await sdk.authenticateRequest(req); } catch { /* sin sesión */ }
    if (!user) return res.status(401).send("Inicia sesión de nuevo en el CRM");
    if (!STAFF_ROLES.includes(user.role)) return res.status(403).send("Sin acceso");

    let target: URL;
    try {
      target = new URL(String(req.query.u || ""));
    } catch {
      return res.status(400).send("Dirección inválida");
    }
    if (target.protocol !== "https:" || !allowedHosts().includes(target.hostname)) {
      return res.status(400).send("Dirección no permitida");
    }

    try {
      const upstream = await fetch(target.toString());
      if (!upstream.ok) {
        console.warn(`[Descargas] ${user.role} ${user.id}: el archivo respondió ${upstream.status}`);
        return res.status(upstream.status).send("No se pudo obtener el archivo");
      }
      const type = upstream.headers.get("content-type");
      const name = downloadName(String(req.query.name || ""), type, target);
      if (type) res.setHeader("Content-Type", type);
      const len = upstream.headers.get("content-length");
      if (len) res.setHeader("Content-Length", len);
      // filename* para tildes y ñ; filename simple como respaldo
      const ascii = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
      res.setHeader("Cache-Control", "private, max-age=3600");
      if (!upstream.body) return res.end();
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (err) {
      console.error("[Descargas] Error:", err);
      if (!res.headersSent) res.status(502).send("No se pudo obtener el archivo");
    }
  });
}
