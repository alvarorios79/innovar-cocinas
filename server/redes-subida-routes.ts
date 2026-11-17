/**
 * POST /api/redes/subir?nombre=archivo.jpg&ts=<ms>&sig=<hex>      (cuerpo = el archivo tal cual)
 *
 * Puerta de subida para las publicaciones de redes: Claude Code (en el computador de Álvaro) manda una imagen o un
 * video, el CRM lo guarda en Firebase (carpeta redes/) y devuelve una dirección tipo «enlace único» (con llave
 * larga e imposible de adivinar, igual que la galería de clientes) que Metricool SÍ puede leer. Así las
 * publicaciones se programan solas, sin abrir pantallas ni compartir archivos de Drive.
 *
 * Seguridad: va firmada con HMAC-SHA256 de `${nombre}.${ts}` usando WEB_INTAKE_SECRET (la misma clave que ya
 * comparten la página web y el CRM); caduca a los 5 minutos; solo imágenes y videos; tamaño limitado.
 * Sin esa variable en Render → 503.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { storagePut } from "./storage";

const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_BYTES = 80 * 1024 * 1024;

const TIPOS: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  mp4: "video/mp4", mov: "video/quicktime",
};

export function subidaSignature(nombre: string, ts: number, secret: string): string {
  return createHmac("sha256", secret).update(`${nombre}.${ts}`).digest("hex");
}

export function subidaSignatureOk(nombre: string, ts: number, sig: string, secret: string, now = Date.now()): boolean {
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_AGE_MS) return false;
  if (!/^[0-9a-f]{64}$/i.test(sig || "")) return false;
  return timingSafeEqual(Buffer.from(subidaSignature(nombre, ts, secret), "hex"), Buffer.from(sig, "hex"));
}

/** Nombre seguro y tipo de contenido, o null si no es imagen/video permitido. */
export function nombreYTipo(nombre: string): { seguro: string; tipo: string } | null {
  const base = (nombre || "").split(/[\\/]/).pop() || "";
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  const tipo = TIPOS[ext];
  if (!tipo) return null;
  const sinExt = base.slice(0, base.length - ext.length - 1).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const limpio = sinExt.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "archivo";
  return { seguro: `${limpio}.${ext}`, tipo };
}

export function registerRedesSubidaRoutes(app: Express) {
  app.post(
    "/api/redes/subir",
    express.raw({ type: () => true, limit: MAX_BYTES }),
    async (req: Request, res: Response) => {
      const secret = process.env.WEB_INTAKE_SECRET?.trim();
      if (!secret) return res.status(503).json({ ok: false, codigo: "sin_clave" });
      const nombre = String(req.query.nombre || "");
      const ts = Number(req.query.ts);
      const sig = String(req.query.sig || "");
      if (!subidaSignatureOk(nombre, ts, sig, secret)) return res.status(401).json({ ok: false, codigo: "firma_invalida" });
      const info = nombreYTipo(nombre);
      if (!info) return res.status(400).json({ ok: false, codigo: "tipo_no_permitido" });
      const cuerpo = req.body as Buffer;
      if (!Buffer.isBuffer(cuerpo) || !cuerpo.length) return res.status(400).json({ ok: false, codigo: "archivo_vacio" });
      try {
        const mes = new Date().toISOString().slice(0, 7);
        const llave = `redes/${mes}/${randomBytes(6).toString("hex")}-${info.seguro}`;
        const r = await storagePut(llave, cuerpo, info.tipo);
        res.set("Cache-Control", "no-store");
        return res.json({ ok: true, url: r.url, bytes: cuerpo.length, tipo: info.tipo });
      } catch (err) {
        console.error("[Redes] Error guardando el archivo:", err);
        return res.status(500).json({ ok: false, codigo: "error" });
      }
    },
  );
}
