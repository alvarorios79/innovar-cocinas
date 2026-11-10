/**
 * POST /api/web/intake — la página web de Innovar (cocinasintegralespereira.co) entrega aquí cada contacto.
 *
 * Decisión de Álvaro (10 nov 2026): TODO lo que entra por la página va a este CRM (pantalla Interesados).
 * La página (repo de Robert, `app/api/contacto` y `app/api/asistente`) firma cada envío con la clave compartida:
 *   X-Webhook-Signature: sha256=<HMAC-SHA256 del cuerpo exacto con WEB_INTAKE_SECRET>
 * En la página la clave se llama CONTACT_WEBHOOK_SECRET y la dirección CONTACT_WEBHOOK_URL.
 *
 * Tipos que llegan (`tipo`): contacto · cotizador · visita (asistente "Elena") · derechos_datos (Ley 1581).
 * `prueba: true` (vista previa / localhost de la página) → se responde bien y NO se guarda nada.
 * Sin WEB_INTAKE_SECRET configurada en Render → 503 (nunca se acepta sin firma).
 */
import express, { type Express, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { normalizeLeadPhone } from "@shared/leads";
import { saveIncomingLead } from "./routers/leads";

/** Tipo de trabajo de la página → tipo del CRM. */
const WORK_FROM_WEB: Record<string, string> = {
  cocina: "cocina", closet: "closet", bano: "mueble_bano", entretenimiento: "centro_tv",
  puertas: "puertas", escaleras: "otro", empresa: "otro", otro: "otro",
};
const WORK_LABEL_EXTRA: Record<string, string> = { escaleras: "Escaleras", empresa: "Mobiliario de oficina" };
const FRANJA: Record<string, string> = { manana: "en la mañana", tarde: "en la tarde", cualquiera: "a cualquier hora" };
const MAX_AGE_MS = 15 * 60 * 1000;

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function signatureOk(raw: string, header: string | undefined, secret: string): boolean {
  const got = (header || "").replace(/^sha256=/i, "").trim();
  if (!/^[0-9a-f]{64}$/i.test(got)) return false;
  const want = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(want, Buffer.from(got, "hex"));
}

/** Quita las líneas técnicas que la página antepone ([AUTORIZACION …], [TIPO …]) y traduce [REFERIDO · X]. */
function cleanWebMessage(msg: string): { text: string; referido: string | null } {
  let referido: string | null = null;
  const lines = msg.split(/\r?\n/).filter((l) => {
    const m = l.match(/^\[REFERIDO\s*·\s*([^\]]+)\]/i);
    if (m) { referido = m[1].trim(); return false; }
    return !/^\[(AUTORIZACION|TIPO)\b/i.test(l.trim());
  });
  return { text: lines.join("\n").trim(), referido };
}

export type WebLead = { name: string; phone: string; workTypes: string | null; location: string | null; message: string; source: string };

/** Convierte lo que manda la página en un interesado del CRM. null = no se guarda (datos insuficientes). */
export function webPayloadToLead(p: Record<string, any>): WebLead | null {
  const name = str(p.nombre, 120);
  const phone = normalizeLeadPhone(str(p.telefono, 30));
  if (name.length < 2 || phone.length < 7) return null;
  const tipo = str(p.tipo, 30) || "contacto";
  const pagina = str(p.pagina, 300);
  const correo = str(p.correo, 254);
  const { text, referido: refFromMsg } = cleanWebMessage(str(p.mensaje));
  const referido = str(p.referido, 40) || refFromMsg;
  const lines: string[] = [];
  let workTypes: string | null = null;
  const location = [str(p.ciudad, 80), str(p.direccion, 200)].filter(Boolean).join(" · ") || null;

  if (tipo === "visita") {
    const t = str(p.tipoTrabajo, 30);
    workTypes = WORK_FROM_WEB[t] || null;
    let cuando = "";
    if (p.modo === "alternativa" && Array.isArray(p.diasPreferidos) && p.diasPreferidos.length) {
      cuando = `prefiere ${p.diasPreferidos.map((x: unknown) => str(x, 12)).filter(Boolean).join(", ")}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str(p.dia, 10))) {
      const [y, m, d] = str(p.dia, 10).split("-").map(Number);
      cuando = new Date(y, m - 1, d).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
    }
    lines.push(`🗓️ Pidió visita desde la asistente de la página${cuando ? `: ${cuando}` : ""}${FRANJA[str(p.franja, 12)] ? `, ${FRANJA[str(p.franja, 12)]}` : ""}. Confírmale la hora.`);
    if (WORK_LABEL_EXTRA[t]) lines.push(`Trabajo: ${WORK_LABEL_EXTRA[t]}`);
    if (typeof p.metros === "number" && p.metros > 0) lines.push(`Medida aproximada: ${p.metros} m`);
    if (typeof p.presupuesto === "number" && p.presupuesto > 0) lines.push(`Le mostramos un estimado desde $${Math.round(p.presupuesto).toLocaleString("es-CO")}`);
  } else if (tipo === "cotizador") {
    workTypes = "cocina";
    lines.push("🧮 Usó el cotizador de la página.");
  } else if (tipo === "derechos_datos") {
    lines.push(`⚖️ Solicitud sobre sus datos personales (Ley 1581)${str(p.derecho, 40) ? `: ${str(p.derecho, 40)}` : ""}. Hay que responderle por escrito.`);
  } else {
    lines.push(`✉️ Escribió desde la página${pagina ? ` (${pagina})` : ""}.`);
  }
  if (text) lines.push(text);
  if (correo) lines.push(`Correo: ${correo}`);
  if (referido) lines.push(`Recomendado con el código ${referido}`);

  return { name, phone, workTypes, location, message: lines.join("\n").slice(0, 3000), source: referido ? "referido" : "web" };
}

export function registerWebIntakeRoutes(app: Express) {
  // Va ANTES de express.json: la firma se verifica sobre el cuerpo exacto que mandó la página.
  app.post("/api/web/intake", express.text({ type: "*/*", limit: "32kb" }), async (req: Request, res: Response) => {
    const secret = process.env.WEB_INTAKE_SECRET?.trim();
    if (!secret) {
      console.warn("[Web] Llegó un contacto de la página pero falta WEB_INTAKE_SECRET en Render");
      return res.status(503).json({ ok: false, codigo: "sin_clave" });
    }
    const raw = typeof req.body === "string" ? req.body : "";
    if (!signatureOk(raw, req.header("x-webhook-signature"), secret)) {
      console.warn("[Web] Contacto rechazado: firma inválida");
      return res.status(401).json({ ok: false, codigo: "firma" });
    }
    let p: Record<string, any>;
    try {
      p = JSON.parse(raw);
      if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error("forma");
    } catch {
      return res.status(400).json({ ok: false, codigo: "cuerpo" });
    }
    const sentAt = Date.parse(str(p.recibidoEn, 40));
    if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_AGE_MS) {
      return res.status(400).json({ ok: false, codigo: "vencido" });
    }
    if (p.prueba === true) {
      console.log(`[Web] Contacto de prueba (${str(p.tipo, 30) || "contacto"}): no se guarda`);
      return res.json({ ok: true, prueba: true });
    }
    const lead = webPayloadToLead(p);
    if (!lead) return res.status(422).json({ ok: false, codigo: "datos" });
    try {
      const r = await saveIncomingLead(lead);
      console.log(`[Web] Interesado ${r.repeated ? "actualizado" : "nuevo"} #${r.id} desde la página (${str(p.tipo, 30) || "contacto"})`);
      return res.json({ ok: true, id: r.id });
    } catch (err) {
      console.error("[Web] No se pudo guardar el contacto:", err);
      return res.status(500).json({ ok: false, codigo: "guardar" });
    }
  });
}
