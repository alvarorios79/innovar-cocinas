/**
 * GET /api/web/precios — precios VIGENTES del Motor de Cotización para el simulador y la asistente "Elena" de la página
 * (cocinasintegralespereira.co). Solo lectura, sin datos de clientes ni de proyectos, sin sesión.
 *
 * Motivo (13 nov 2026): la página tenía sus propias cifras (850.000/950.000/1.200.000 por metro) y mostraba ~1/3 de lo que
 * el CRM cotiza (el CRM cobra inferior Y superior por separado y suma mesón). Ahora el CRM es la única fuente: si Álvaro
 * cambia un precio en el Motor, la página lo recoge sola (la página guarda la respuesta unos minutos y tiene un respaldo).
 *
 * Solo se publican los códigos de PRECIOS_WEB (lista blanca): nunca el catálogo completo (herrajes, costos, etc.).
 */
import type { Express, Request, Response } from "express";
import { getAllPricingConfig } from "./db";
import { APPOINTMENT_CONFIG, getAvailableTimeSlots } from "./availability";
import { temasActivosParaWeb } from "./routers/elena";

/** Código del Motor → clave corta que lee la página. */
export const PRECIOS_WEB: Record<string, string> = {
  COCINA_ML_ESTANDAR: "mlEstandar",
  COCINA_ML_PREMIUM: "mlPremium",
  COCINA_ML_DELUXE: "mlDeluxe",
  MESON_GRANITO: "mesonGranito",
  MESON_CUARZO: "mesonCuarzo",
  MESON_SINTERIZADO: "mesonSinterizado",
  ISLA_ML: "islaMl",
  LED_ML: "ledMl",
};

export function buildWebPrices(rows: { code: string; value: unknown }[]): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const key = PRECIOS_WEB[r.code];
    const n = Number(r.value);
    if (key && Number.isFinite(n) && n > 0) out[key] = Math.round(n);
  }
  // Sin los tres precios base por metro no se publica nada: la página usa su respaldo antes que cifras a medias.
  return out.mlEstandar && out.mlPremium && out.mlDeluxe ? out : null;
}

/** YYYY-MM-DD de «hoy + n días» en hora de Colombia (UTC-5, sin horario de verano). */
function fechaColombia(sumarDias: number, ahora = new Date()): { iso: string; diaSemana: number } {
  const d = new Date(ahora.getTime() - 5 * 3600_000 + sumarDias * 86_400_000);
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { iso, diaSemana: d.getUTCDay() };
}

/**
 * Próximos días en que el CRM agenda citas (martes, jueves y viernes) y que todavía tienen al menos un horario libre,
 * empezando MAÑANA. `libres(fecha)` dice cuántos horarios quedan (en producción: `getAvailableTimeSlots`).
 */
export async function proximosDiasLibres(n: number, libres: (iso: string) => Promise<number>, ahora = new Date()): Promise<string[]> {
  const out: string[] = [];
  for (let i = 1; i <= 45 && out.length < n; i++) {
    const { iso, diaSemana } = fechaColombia(i, ahora);
    if (!APPOINTMENT_CONFIG.allowedDays.includes(diaSemana)) continue;
    if ((await libres(iso)) > 0) out.push(iso);
  }
  return out;
}

export function registerWebPricesRoutes(app: Express) {
  // Días de visita para la asistente de la página: los reales del calendario del CRM (sin datos de clientes).
  app.get("/api/web/dias-visita", async (req: Request, res: Response) => {
    try {
      const n = Math.min(6, Math.max(1, Number(req.query.n) || 3));
      const dias = await proximosDiasLibres(n, async (iso) => (await getAvailableTimeSlots(iso)).length);
      res.set("Cache-Control", "public, max-age=120");
      return res.json({ ok: true, dias });
    } catch (err) {
      console.error("[Web] No se pudieron calcular los días de visita:", err);
      return res.status(500).json({ ok: false, codigo: "error" });
    }
  });

  // Temas de «Conocimiento de Elena» que Álvaro mantiene en el CRM (solo los activos; sin datos de clientes).
  app.get("/api/web/elena-conocimiento", async (_req: Request, res: Response) => {
    try {
      res.set("Cache-Control", "public, max-age=120");
      return res.json({ ok: true, temas: await temasActivosParaWeb() });
    } catch (err) {
      console.error("[Web] No se pudo leer el conocimiento de Elena:", err);
      return res.status(500).json({ ok: false, codigo: "error" });
    }
  });

  app.get("/api/web/precios", async (_req: Request, res: Response) => {
    try {
      const precios = buildWebPrices(await getAllPricingConfig());
      if (!precios) return res.status(503).json({ ok: false, codigo: "sin_precios" });
      res.set("Cache-Control", "public, max-age=300");
      return res.json({ ok: true, version: 1, precios, actualizado: new Date().toISOString() });
    } catch (err) {
      console.error("[Web] No se pudieron leer los precios:", err);
      return res.status(500).json({ ok: false, codigo: "error" });
    }
  });
}
