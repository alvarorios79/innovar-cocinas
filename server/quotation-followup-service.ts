/**
 * Seguimiento de cotizaciones: calcula qué mensaje toca enviar a cada cliente, lo redacta y avisa al equipo
 * (campanita + push, con enlace directo a la cotización). Las reglas viven en shared/seguimientoCotizacion.ts.
 * Los mensajes los envía una persona desde WhatsApp (un toque); el sistema nunca escribe solo al cliente.
 */
import { and, eq, inArray, isNull, like, notInArray, or } from "drizzle-orm";
import * as db from "./db";
import { quotations, quotationFollowUps, projects, clients, notifications } from "../drizzle/schema";
import { esDiaHabil } from "@shared/festivosColombia";
import {
  siguientePaso, evaluarGrupo, mensajeSeguimiento, primerNombre, proponerExtension, ETIQUETA_PASO, TIPO_PRODUCTO_TEXTO,
  type PasoSeguimiento, type TipoSeguimiento, type EntradaSeguimiento,
} from "@shared/seguimientoCotizacion";

export const SEGUIMIENTO_REF = "cotizacion_seguimiento";
const ROLES_EQUIPO = ["super_admin", "admin", "comercial"];
const APP_URL = () => process.env.APP_URL || "https://innovar-cocinas.onrender.com";

export interface ItemSeguimiento {
  quotationId: number;
  numero: string;
  version: number;
  cliente: string;
  telefono: string | null;        // en formato internacional (solo dígitos)
  tipoTexto: string;
  total: number;
  estado: "sent" | "approved";
  tipo: TipoSeguimiento;
  step: PasoSeguimiento;
  etiqueta: string;
  due: string;                    // ISO
  porEnviar: boolean;
  validUntil: string | null;
  extension: string | null;       // nueva validez que se ofrece en este mensaje (solo aviso de vencimiento)
  mensaje: string;
  enlace: string | null;
  contactos: number;              // mensajes ya enviados
  ultimoContacto: string | null;  // ISO
}

const fechaLarga = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });
const pesos = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
const aFecha = (v: any): Date | null => (v ? new Date(String(v).includes("T") ? v : String(v).replace(" ", "T") + "Z") : null);
const telefonoIntl = (raw: string | null | undefined) => { const d = String(raw || "").replace(/\D/g, ""); return d ? (d.length > 10 ? d : "57" + d) : null; };

async function cargar(ids?: number[]) {
  const d = await db.getDb();
  if (!d) return [];
  // 1) Candidatas: enviadas o aprobadas (no copias históricas)
  const filtro = [isNull(quotations.deletedAt), eq(quotations.isHistoricalCopy, 0), inArray(quotations.status, ["sent", "approved"])];
  if (ids?.length) filtro.push(inArray(quotations.id, ids));
  const candidatas = await d.select({ q: quotations, clienteNombre: clients.name, clienteTel: clients.whatsappPhone })
    .from(quotations).leftJoin(clients, eq(clients.id, quotations.clientId)).where(and(...filtro));
  if (!candidatas.length) return [];
  // 2) Todas las versiones de esos grupos (V1, V2…) y los proyectos que ya existen en alguna de ellas
  const claves = Array.from(new Set(candidatas.map(c => c.q.baseQuotationId ?? c.q.id)));
  const versiones = await d.select({ id: quotations.id, baseId: quotations.baseQuotationId, version: quotations.versionNumber, status: quotations.status })
    .from(quotations).where(and(isNull(quotations.deletedAt), or(inArray(quotations.id, claves), inArray(quotations.baseQuotationId, claves))));
  const idsVersiones = Array.from(new Set([...versiones.map(v => v.id), ...candidatas.map(c => c.q.id)]));
  const conProyecto = new Set((await d.select({ qid: projects.quotationId }).from(projects).where(inArray(projects.quotationId, idsVersiones))).map(r => Number(r.qid)));
  const logs = await d.select().from(quotationFollowUps).where(inArray(quotationFollowUps.quotationId, idsVersiones));
  const porQ = new Map<number, typeof logs>();
  logs.forEach(l => { const a = porQ.get(l.quotationId) || []; a.push(l); porQ.set(l.quotationId, a); });
  return candidatas.map(c => {
    const g = evaluarGrupo(versiones, conProyecto, c.q.id);
    return { ...c, proyectoId: g.hayProyecto ? 1 : null, esUltima: g.esUltima, grupoAprobado: g.grupoAprobado, logs: porQ.get(c.q.id) || [] };
  });
}

function aItem(f: Awaited<ReturnType<typeof cargar>>[number], hoy: Date): ItemSeguimiento | null {
  const q = f.q;
  // Solo la última versión de la cotización; y una cotización enviada cuyo grupo ya fue aprobado (por enlace o por llamada) no se persigue
  if (!f.esUltima) return null;
  if (q.status === "sent" && f.grupoAprobado) return null;
  const entrada: EntradaSeguimiento = {
    status: q.status, sentAt: aFecha(q.sentAt), createdAt: aFecha(q.createdAt) || hoy, validUntil: aFecha(q.validUntil),
    approvedAt: aFecha((q as any).approvedAt), hayProyecto: !!f.proyectoId, archivado: q.isArchived === 1,
    logs: f.logs.map(l => ({ step: l.step, at: aFecha(l.createdAt) || hoy, extendedUntil: aFecha(l.extendedUntil) })),
  };
  const p = siguientePaso(entrada, hoy);
  if (!p) return null;
  const token = q.publicToken;
  const enlace = token ? `${APP_URL()}/cotizacion?token=${token}` : null;
  const vence = entrada.validUntil;
  const ctx = {
    nombre: primerNombre(f.clienteNombre), vendedor: primerNombre(q.vendorName), tipo: TIPO_PRODUCTO_TEXTO[q.productType] || "proyecto",
    enlace: enlace || "", vence: vence ? fechaLarga(vence) : undefined, nuevaFecha: p.extension ? fechaLarga(p.extension) : undefined,
    anticipo: pesos(Math.round(Number(q.total) * 0.6)),
  };
  const mensaje = mensajeSeguimiento(p.step, ctx).replace(/\n{3,}/g, "\n\n").trim();
  const enviados = f.logs.filter(l => l.action === "enviado");
  const ultimo = f.logs.map(l => aFecha(l.createdAt)).filter((x): x is Date => !!x).sort((a, b) => b.getTime() - a.getTime())[0] || null;
  return {
    quotationId: q.id, numero: q.quotationNumber, version: Number((q as any).versionNumber) || 1, cliente: f.clienteNombre || "Cliente", telefono: telefonoIntl(f.clienteTel),
    tipoTexto: ctx.tipo, total: Number(q.total), estado: q.status === "approved" ? "approved" : "sent", tipo: p.tipo, step: p.step,
    etiqueta: ETIQUETA_PASO[p.step], due: p.due.toISOString(), porEnviar: p.porEnviar, validUntil: vence ? vence.toISOString() : null,
    extension: p.extension ? p.extension.toISOString() : null, mensaje, enlace, contactos: enviados.length, ultimoContacto: ultimo ? ultimo.toISOString() : null,
  };
}

/** Todo lo que toca enviar hoy y lo que está programado, de más urgente a menos. */
export async function calcularSeguimientos(now = new Date(), ids?: number[]): Promise<{ porEnviar: ItemSeguimiento[]; programados: ItemSeguimiento[] }> {
  const items = (await cargar(ids)).map(f => aItem(f, now)).filter((x): x is ItemSeguimiento => !!x);
  const orden = (a: ItemSeguimiento, b: ItemSeguimiento) => (a.tipo === b.tipo ? a.due.localeCompare(b.due) : a.tipo === "anticipo" ? -1 : 1);
  return { porEnviar: items.filter(i => i.porEnviar).sort(orden), programados: items.filter(i => !i.porEnviar).sort((a, b) => a.due.localeCompare(b.due)) };
}

async function equipoIds(): Promise<number[]> {
  const ids = new Set<number>();
  for (const role of ROLES_EQUIPO) for (const u of await db.getUsersByRole(role)) ids.add(u.id);
  return Array.from(ids);
}

/** Borra los avisos de la campanita de esa cotización (a todo el equipo): ya se atendió. */
export async function limpiarAvisosSeguimiento(quotationId: number): Promise<void> {
  const d = await db.getDb();
  if (!d) return;
  await d.delete(notifications).where(and(like(notifications.referenceType, `${SEGUIMIENTO_REF}%`), eq(notifications.referenceId, quotationId)));
}

/** Registra un mensaje enviado u omitido; en el aviso de vencimiento puede ampliar la validez (mismo precio). */
export async function registrarPaso(p: { quotationId: number; step: string; accion: "enviado" | "omitido"; userId: number; extender?: boolean }): Promise<{ nuevaValidez: string | null }> {
  const d = await db.getDb();
  if (!d) throw new Error("Base de datos no disponible");
  const ahora = new Date();
  const { porEnviar, programados } = await calcularSeguimientos(ahora, [p.quotationId]);
  const actual = [...porEnviar, ...programados][0];
  if (!actual || actual.step !== p.step) throw new Error("ESTADO_CAMBIO");   // otra persona ya lo atendió o cambió el paso
  let extendedUntil: Date | null = null;
  if (p.step === "s4" && p.accion === "enviado" && p.extender && actual.extension) {
    extendedUntil = new Date(actual.extension);
    await d.update(quotations).set({ validUntil: extendedUntil.toISOString() } as any).where(eq(quotations.id, p.quotationId));
  }
  await d.insert(quotationFollowUps).values({ quotationId: p.quotationId, step: p.step, action: p.accion, sentBy: p.userId, extendedUntil: extendedUntil ? extendedUntil.toISOString() : null } as any);
  await limpiarAvisosSeguimiento(p.quotationId);
  return { nuevaValidez: extendedUntil ? extendedUntil.toISOString() : null };
}

/** El equipo decide no seguir escribiéndole (el cliente no quiere, ya decidió, etc.). */
export async function cerrarSeguimiento(quotationId: number, userId: number, motivo?: string): Promise<void> {
  const d = await db.getDb();
  if (!d) throw new Error("Base de datos no disponible");
  await d.insert(quotationFollowUps).values({ quotationId, step: "cierre", action: "cierre", sentBy: userId, note: motivo ? motivo.slice(0, 500) : null } as any);
  await limpiarAvisosSeguimiento(quotationId);
}

const TEXTO_AVISO: Record<TipoSeguimiento, string> = {
  seguimiento: "Hoy toca escribirle con calma. Toque para ver el mensaje ya redactado y enviarlo por WhatsApp.",
  anticipo: "Aprobó la cotización y falta el anticipo para iniciar el proyecto. Toque para ver el mensaje.",
};

/** Avisa al equipo (campanita + push) cada mensaje que ya toca enviar. Un aviso por cotización y paso: no se repite. */
export async function avisarSeguimientosPendientes(now = new Date()): Promise<number> {
  const d = await db.getDb();
  if (!d) return 0;
  const { porEnviar } = await calcularSeguimientos(now);
  // Avisos que ya no corresponden (la cotización se aprobó, tiene proyecto, fue reemplazada por otra versión…): se borran de la campanita
  try {
    const vigentes = porEnviar.map(i => i.quotationId);
    await d.delete(notifications).where(vigentes.length
      ? and(like(notifications.referenceType, `${SEGUIMIENTO_REF}%`), notInArray(notifications.referenceId, vigentes))
      : like(notifications.referenceType, `${SEGUIMIENTO_REF}%`));
  } catch (e) { console.error("[Seguimiento cotizaciones] No se pudieron limpiar avisos obsoletos:", e); }
  if (!porEnviar.length) return 0;
  const { createAndSendNotification } = await import("./push-notifications");
  const equipo = await equipoIds();
  let n = 0;
  for (const it of porEnviar) {
    const ref = `${SEGUIMIENTO_REF}_${it.step}`;
    const ya = await d.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.referenceType, ref), eq(notifications.referenceId, it.quotationId))).limit(1);
    if (ya.length) continue;
    for (const userId of equipo) {
      await createAndSendNotification(userId, {
        title: it.tipo === "anticipo" ? `✅ Aprobada, falta el anticipo: ${it.cliente}` : `💬 Seguimiento: ${it.cliente}`,
        body: `${it.numero} · ${TEXTO_AVISO[it.tipo]}`,
        type: "cotizacion", referenceId: it.quotationId, referenceType: ref, url: `/quotations?seguimiento=${it.quotationId}`,
      });
    }
    n++;
  }
  return n;
}

const horaBogota = (now: Date) => Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now)) % 24;
const diaBogota = (now: Date) => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };

export function startQuotationFollowUps(): void {
  const tick = async () => {
    try {
      const now = new Date();
      const h = horaBogota(now);
      if (h >= 8 && h < 17 && esDiaHabil(diaBogota(now))) {
        const n = await avisarSeguimientosPendientes(now);
        if (n) console.log(`[Seguimiento cotizaciones] ${n} aviso(s) enviados al equipo`);
      }
    } catch (err) {
      console.error("[Seguimiento cotizaciones] Error en los avisos:", err);
    }
  };
  setInterval(tick, 30 * 60 * 1000);
  setTimeout(tick, 120 * 1000);
  console.log("[Seguimiento cotizaciones] Avisos programados (días hábiles, 8 a. m. – 5 p. m. Colombia)");
}
