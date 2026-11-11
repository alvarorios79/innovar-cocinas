/**
 * Ajuste de garantías y seguimientos de postventa para proyectos que se entregaron ANTES del módulo
 * (pedido de Álvaro, 10 nov 2026). Solo super_admin. Primero se ve la vista previa; nada cambia hasta "Aplicar".
 *
 * Fecha real de entrega (la primera que exista, en este orden):
 *  1. projects.deliveredAt (registrada al marcar Entregado)
 *  2. historial: primera vez que el proyecto pasó a "entregado"
 *  3. la foto final más reciente (carpeta Entrega / Fotos finales)
 *  4. fecha de instalación programada o estimada (si ya pasó)
 *  5. aprobación de la cotización + 4 semanas (tiempo de entrega promedio de Innovar)
 *
 * Qué se crea (solo lo que falta; nunca se duplica ni se borra nada):
 *  - deliveredAt si el proyecto no lo tenía (para que la garantía de 6 meses se calcule con la fecha real)
 *  - Llamada de 30 días: solo si la garantía sigue vigente (si ya pasó la fecha, queda "para hacer hoy")
 *  - Revisión de un año (regalo para vender mantenimiento): siempre; si ya pasó el año, queda "para hacer hoy"
 * Los trabajos históricos del Portafolio (proyectos con deletedAt) no entran.
 */
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as db from "./db";
import {
  projects, clients, projectStatusHistory, projectPhotos, quotations, postventaReclamaciones, accountingClosureProjects,
} from "../drizzle/schema";
import { warrantyInfo, WARRANTY_DAYS } from "@shared/postventa";

const DAY = 86400000;

export type DateSource = "registrada" | "historial" | "fotos_finales" | "instalacion" | "cotizacion";
export const DATE_SOURCE_LABEL: Record<DateSource, string> = {
  registrada: "Entrega registrada",
  historial: "Historial de etapas",
  fotos_finales: "Fotos finales",
  instalacion: "Fecha de instalación",
  cotizacion: "Cotización aprobada + 4 semanas",
};

export type BackfillRow = {
  projectId: number;
  projectName: string;
  clientName: string;
  whatsappPhone: string | null;
  inClosure: boolean;
  deliveredAt: string | null;
  source: DateSource | null;
  setDeliveredAt: boolean;
  warrantyLabel: string;
  warrantyStatus: string;
  createFollowUp: { scheduledFor: string; overdue: boolean } | null;
  createAnnual: { scheduledFor: string; overdue: boolean } | null;
  note: string | null;
  /** El proyecto no tiene enlace del cliente: se le crea (los mensajes del mes y del año lo llevan). */
  needsToken: boolean;
};

const toIso = (v: any): string | null => {
  if (!v) return null;
  const d = new Date(String(v).includes("T") || String(v).endsWith("Z") ? v : String(v).replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export async function buildBackfill(now = new Date()): Promise<{ rows: BackfillRow[]; instalando: { projectId: number; projectName: string; clientName: string }[] }> {
  const d = await db.getDb();
  if (!d) throw new Error("Base de datos no disponible");

  const list = await d.select({
    id: projects.id, name: projects.name, status: projects.status, clientName: clients.name, phone: clients.whatsappPhone,
    deliveredAt: projects.deliveredAt, scheduledInstallDate: projects.scheduledInstallDate, estimatedInstallDate: projects.estimatedInstallDate,
    quotationApprovedAt: projects.quotationApprovedAt, quotationId: projects.quotationId, publicToken: projects.publicToken,
  }).from(projects).leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(isNull(projects.deletedAt), inArray(projects.status, ["entregado", "listo_instalacion"] as any)));

  const delivered = list.filter((p) => p.status === "entregado");
  const instalando = list.filter((p) => p.status === "listo_instalacion")
    .map((p) => ({ projectId: p.id, projectName: p.name, clientName: p.clientName || "" }));
  if (!delivered.length) return { rows: [], instalando };
  const ids = delivered.map((p) => p.id);

  const history = await d.select({ projectId: projectStatusHistory.projectId, at: projectStatusHistory.createdAt })
    .from(projectStatusHistory).where(and(inArray(projectStatusHistory.projectId, ids), eq(projectStatusHistory.toStatus, "entregado")))
    .orderBy(asc(projectStatusHistory.createdAt));
  const firstDelivered = new Map<number, string>();
  for (const h of history) if (!firstDelivered.has(h.projectId)) firstDelivered.set(h.projectId, h.at);

  const finals = await d.select({ projectId: projectPhotos.projectId, at: projectPhotos.createdAt })
    .from(projectPhotos).where(and(inArray(projectPhotos.projectId, ids), eq(projectPhotos.subcategory, "fotos_finales" as any)));
  const lastFinal = new Map<number, string>();
  for (const f of finals) if (!lastFinal.has(f.projectId) || f.at > lastFinal.get(f.projectId)!) lastFinal.set(f.projectId, f.at);

  const qIds = delivered.map((p) => p.quotationId).filter((x): x is number => !!x);
  const quoteApproved = new Map<number, string | null>();
  if (qIds.length) {
    for (const q of await d.select({ id: quotations.id, approvedAt: quotations.approvedAt }).from(quotations).where(inArray(quotations.id, qIds))) {
      quoteApproved.set(q.id, q.approvedAt);
    }
  }

  const closed = new Set((await d.select({ projectId: accountingClosureProjects.projectId }).from(accountingClosureProjects)
    .where(inArray(accountingClosureProjects.projectId, ids))).map((r) => r.projectId));

  const existing = await d.select({ projectId: postventaReclamaciones.projectId, type: postventaReclamaciones.type })
    .from(postventaReclamaciones).where(inArray(postventaReclamaciones.projectId, ids));
  const has = (pid: number, type: string) => existing.some((e) => e.projectId === pid && e.type === type);

  const rows: BackfillRow[] = delivered.map((p) => {
    let source: DateSource | null = null;
    let at: string | null = null;
    const pick = (s: DateSource, v: any) => { if (!at) { const iso = toIso(v); if (iso) { at = iso; source = s; } } };
    pick("registrada", p.deliveredAt);
    pick("historial", firstDelivered.get(p.id));
    pick("fotos_finales", lastFinal.get(p.id));
    const inst = toIso(p.scheduledInstallDate) || toIso(p.estimatedInstallDate);
    if (inst && new Date(inst) <= now) pick("instalacion", inst);
    const approved = toIso(p.quotationApprovedAt) || toIso(p.quotationId ? quoteApproved.get(p.quotationId) : null);
    if (approved) pick("cotizacion", new Date(new Date(approved).getTime() + 28 * DAY).toISOString());

    const w = warrantyInfo(at, now);
    let createFollowUp: BackfillRow["createFollowUp"] = null;
    let createAnnual: BackfillRow["createAnnual"] = null;
    let note: string | null = null;
    if (!at) {
      note = "Sin ninguna fecha: ponla a mano en el proyecto";
    } else {
      const start = new Date(at).getTime();
      if (!has(p.id, "seguimiento_30d") && now.getTime() - start < WARRANTY_DAYS * DAY) {
        const f = new Date(start + 30 * DAY);
        createFollowUp = { scheduledFor: f.toISOString(), overdue: f <= now };
      }
      if (!has(p.id, "revision_anual")) {
        const y = new Date(start + 365 * DAY);
        createAnnual = { scheduledFor: y.toISOString(), overdue: y <= now };
      }
      if (!createFollowUp && !createAnnual && !p.deliveredAt) note = "Ya tiene sus seguimientos; solo se guarda la fecha";
      else if (!createFollowUp && !createAnnual) note = "Ya estaba al día";
    }
    return {
      projectId: p.id, projectName: p.name, clientName: p.clientName || "", whatsappPhone: p.phone || null,
      inClosure: closed.has(p.id), deliveredAt: at, source, setDeliveredAt: !!at && !p.deliveredAt,
      warrantyLabel: w.label, warrantyStatus: w.status, createFollowUp, createAnnual, note, needsToken: !p.publicToken,
    };
  }).sort((a, b) => String(b.deliveredAt || "").localeCompare(String(a.deliveredAt || "")));

  return { rows, instalando };
}

/** Aplica lo que muestra la vista previa. Devuelve cuántas cosas cambió. */
export async function applyBackfill(userId: number, now = new Date()): Promise<{ fechas: number; llamadas: number; revisiones: number; paraHoy: number }> {
  const d = await db.getDb();
  if (!d) throw new Error("Base de datos no disponible");
  const { rows } = await buildBackfill(now);
  let fechas = 0, llamadas = 0, revisiones = 0, paraHoy = 0;
  for (const r of rows) {
    if (r.needsToken) {
      await d.update(projects).set({ publicToken: randomBytes(24).toString("hex") }).where(and(eq(projects.id, r.projectId), isNull(projects.publicToken)));
    }
    if (r.createFollowUp?.overdue || r.createAnnual?.overdue) paraHoy++;
    if (r.setDeliveredAt && r.deliveredAt) {
      await d.update(projects).set({ deliveredAt: r.deliveredAt }).where(and(eq(projects.id, r.projectId), isNull(projects.deliveredAt)));
      fechas++;
    }
    if (r.createFollowUp) {
      await db.createReclamacion({
        projectId: r.projectId, title: `Llamada de seguimiento — ${r.projectName}`,
        description: "Verificar satisfacción del cliente, revisar si hay ajustes pendientes y pedir la reseña en Google.",
        type: "seguimiento_30d", status: "pendiente", priority: "media", scheduledFor: r.createFollowUp.scheduledFor, createdBy: userId,
      } as any);
      llamadas++;
    }
    if (r.createAnnual) {
      await db.createReclamacion({
        projectId: r.projectId, title: `Revisión de un año (regalo) — ${r.projectName}`,
        description: "Regalarle una revisión general al cliente para ofrecerle un mantenimiento. Si se detectan arreglos o mejoras, se cotizan por separado.",
        type: "revision_anual", status: "pendiente", priority: "baja", scheduledFor: r.createAnnual.scheduledFor, createdBy: userId,
      } as any);
      revisiones++;
    }
  }
  console.log(`[Postventa] Ajuste de garantías: ${fechas} fecha(s), ${llamadas} llamada(s) de 30 días, ${revisiones} revisión(es) de un año`);
  return { fechas, llamadas, revisiones, paraHoy };
}

/**
 * Se corre al arrancar el servidor (decisión de Álvaro: acomodar una vez los proyectos que ya estaban, sin botones).
 * Es seguro repetirlo: solo agrega lo que falta. Si cambió algo, le deja el resumen a los super_admin en la campanita.
 */
export async function runPostventaBackfillOnStart(): Promise<void> {
  const owner = (await db.getUsersByRole("super_admin"))[0];
  if (!owner) return;
  const r = await applyBackfill(owner.id);
  if (!r.fechas && !r.llamadas && !r.revisiones) return;
  const { createAndSendNotification } = await import("./push-notifications");
  const body = `Acomodé los proyectos entregados: ${r.fechas} fecha(s) de entrega, ${r.llamadas} llamada(s) del mes y ${r.revisiones} revisión(es) del año. ${r.paraHoy} quedaron en "Para hacer hoy".`;
  for (const u of await db.getUsersByRole("super_admin")) {
    await createAndSendNotification(u.id, { title: "🛡️ Postventa al día", body, type: "proyecto", referenceType: "postventa_ajuste", url: "/postventa" });
  }
}
