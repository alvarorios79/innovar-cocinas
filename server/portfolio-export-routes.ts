/**
 * GET /api/portfolio/export/:projectId?ts=<milisegundos>&sig=<hex>
 *
 * Puerta de LECTURA para que Claude Code (en el computador de Álvaro) pueda traer las fotos y videos de una galería
 * del Portafolio sin que Álvaro tenga que descargarlas a mano. Devuelve la lista de archivos con sus direcciones
 * (las de Firebase llevan su llave temporal), que se bajan después con un comando normal.
 *
 * Seguridad: solo lectura; la petición va firmada con HMAC-SHA256 de `${projectId}.${ts}` usando WEB_INTAKE_SECRET
 * (la misma clave que ya comparten la página web y el CRM) y caduca a los 5 minutos. Sin esa variable → 503.
 * No entrega datos del cliente ni de la cotización: solo nombre de la galería y archivos.
 */
import type { Express, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "./db";
import { loadPortfolio } from "./portfolio-data";

const MAX_AGE_MS = 5 * 60 * 1000;

export function exportSignature(projectId: number, ts: number, secret: string): string {
  return createHmac("sha256", secret).update(`${projectId}.${ts}`).digest("hex");
}

export function exportSignatureOk(projectId: number, ts: number, sig: string, secret: string, now = Date.now()): boolean {
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_AGE_MS) return false;
  if (!/^[0-9a-f]{64}$/i.test(sig || "")) return false;
  const want = Buffer.from(exportSignature(projectId, ts, secret), "hex");
  return timingSafeEqual(want, Buffer.from(sig, "hex"));
}

export function registerPortfolioExportRoutes(app: Express) {
  app.get("/api/portfolio/export/:projectId", async (req: Request, res: Response) => {
    const secret = process.env.WEB_INTAKE_SECRET?.trim();
    if (!secret) return res.status(503).json({ ok: false, codigo: "sin_clave" });
    const projectId = Number(req.params.projectId);
    const ts = Number(req.query.ts);
    const sig = String(req.query.sig || "");
    if (!Number.isInteger(projectId) || !exportSignatureOk(projectId, ts, sig, secret)) {
      return res.status(401).json({ ok: false, codigo: "firma_invalida" });
    }
    try {
      const db = await getDb();
      const [p] = await loadPortfolio(db, { projectIds: [projectId], includeEmpty: true, includeHidden: true });
      if (!p) return res.status(404).json({ ok: false, codigo: "no_encontrado" });
      const lista = (list: any[]) => list.map((m) => ({ id: m.id, source: m.source, url: m.url, createdAt: m.createdAt }));
      res.set("Cache-Control", "no-store");
      return res.json({
        ok: true,
        proyecto: { id: p.id, nombre: p.name },
        media: {
          antes: lista(p.media.antes), diseno: lista(p.media.diseno),
          instalacion: lista(p.media.instalacion), despues: lista(p.media.despues),
        },
        videos: (p.videos || []).map((v) => ({ id: v.id, url: v.url, archivo: v.fileName, bytes: v.sizeBytes })),
      });
    } catch (err) {
      console.error("[Portafolio] Error en la exportación:", err);
      return res.status(500).json({ ok: false, codigo: "error" });
    }
  });
}
