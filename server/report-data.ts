/**
 * Datos para los informes imprimibles (PDF / Word) de Proyectos y Cotizaciones.
 * Los números salen de las mismas funciones que usa la pantalla (calculateProjectBalance),
 * para que el papel y el CRM digan lo mismo.
 */
import { and, desc, eq, isNull } from "drizzle-orm";
import { clients, expenses, payments, projects, quotations } from "../drizzle/schema";
import { calculateProjectBalance, getDb } from "./db";
import type { ProjectListRow, ProjectReportData, QuotationListRow } from "@shared/businessReports";

const num = (v: unknown) => Number(v ?? 0) || 0;

async function projectExpensesTotal(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, projectId: number) {
  const rows = await db.select({ amount: expenses.amount }).from(expenses)
    .where(and(eq(expenses.projectId, projectId), isNull(expenses.deletedAt), eq(expenses.dataOrigin, "manual")));
  return rows.reduce((s, r) => s + num(r.amount), 0);
}

export async function getProjectsListData(archived?: boolean): Promise<ProjectListRow[]> {
  const db = await getDb();
  if (!db) return [];
  let where = and(isNull(projects.deletedAt), eq(projects.dataOrigin, "manual"));
  if (archived !== undefined) where = and(where, eq(projects.isArchived, archived ? 1 : 0));
  const list = await db.select().from(projects).where(where).orderBy(desc(projects.createdAt));
  const clientRows = await db.select({ id: clients.id, name: clients.name }).from(clients);
  const clientMap = new Map(clientRows.map(c => [c.id, c.name]));

  const out: ProjectListRow[] = [];
  for (const p of list) {
    const bal = await calculateProjectBalance(p.id);
    const valor = bal.totalAmount + bal.totalSurcharges - bal.totalDiscounts;
    out.push({
      id: p.id,
      name: p.name,
      clientName: clientMap.get(p.clientId) || "",
      status: p.status,
      valor,
      pagado: bal.totalPaid,
      porCobrar: bal.dynamicBalance,
      gastos: await projectExpensesTotal(db, p.id),
      installDate: p.scheduledInstallDate ?? null,
    });
  }
  return out;
}

export async function getProjectReportData(projectId: number): Promise<ProjectReportData | null> {
  const db = await getDb();
  if (!db) return null;
  const [p] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!p) return null;
  const [client] = await db.select().from(clients).where(eq(clients.id, p.clientId)).limit(1);
  let quotationNumber = "";
  if (p.quotationId) {
    const [q] = await db.select({ n: quotations.quotationNumber }).from(quotations).where(eq(quotations.id, p.quotationId)).limit(1);
    quotationNumber = q?.n || "";
  }
  const bal = await calculateProjectBalance(projectId);
  const pays = await db.select().from(payments).where(eq(payments.projectId, projectId));
  const exps = await db.select().from(expenses)
    .where(and(eq(expenses.projectId, projectId), isNull(expenses.deletedAt), eq(expenses.dataOrigin, "manual")));

  return {
    project: {
      id: p.id,
      name: p.name,
      clientName: client?.name || "",
      quotationNumber,
      status: p.status,
      workType: p.workType,
      createdAt: p.createdAt,
      installDate: p.scheduledInstallDate ?? null,
      deliveredAt: p.deliveredAt ?? null,
    },
    balance: {
      totalAmount: bal.totalAmount,
      discounts: bal.totalDiscounts,
      surcharges: bal.totalSurcharges,
      valorFinal: bal.totalAmount + bal.totalSurcharges - bal.totalDiscounts,
      pagado: bal.totalPaid,
      porCobrar: bal.dynamicBalance,
    },
    payments: pays.map(x => ({
      date: x.receivedAt, movementType: x.movementType, type: x.type, method: x.method ?? "", notes: x.notes ?? "", amount: num(x.amount),
    })),
    expenses: exps.map(e => ({
      date: e.expenseDate, description: e.description, operativeCategory: e.operativeCategory, subcategory: e.subcategory,
      generalCategory: e.generalCategory, amount: num(e.amount),
    })),
  };
}

export async function getQuotationsListData(filters: { status?: string; dateFrom?: string; dateTo?: string; archived?: boolean }): Promise<QuotationListRow[]> {
  const db = await getDb();
  if (!db) return [];
  const all = await db.select().from(quotations).where(and(isNull(quotations.deletedAt), eq(quotations.dataOrigin, "manual")));
  const clientRows = await db.select({ id: clients.id, name: clients.name }).from(clients);
  const clientMap = new Map(clientRows.map(c => [c.id, c.name]));

  // Solo la última versión de cada cotización (como se ve en la lista del CRM)
  const latest = new Map<number, any>();
  for (const q of all as any[]) {
    const key = q.baseQuotationId || q.id;
    const cur = latest.get(key);
    if (!cur || num(q.versionNumber) > num(cur.versionNumber)) latest.set(key, q);
  }
  let list = Array.from(latest.values());
  if (filters.archived !== undefined) list = list.filter(q => !!q.isArchived === filters.archived);
  if (filters.status) list = list.filter(q => q.status === filters.status);
  if (filters.dateFrom) { const from = new Date(filters.dateFrom); list = list.filter(q => new Date(q.createdAt) >= from); }
  if (filters.dateTo) { const to = new Date(filters.dateTo); to.setHours(23, 59, 59, 999); list = list.filter(q => new Date(q.createdAt) <= to); }
  list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return list.map(q => ({
    quotationNumber: q.quotationNumber || `#${q.id}`,
    version: num(q.versionNumber) || 1,
    clientName: clientMap.get(q.clientId) || "",
    status: q.status || "",
    total: num(q.totalWithDiscount || q.total),
    createdAt: q.createdAt,
    hasProject: !!q.projectId,
  }));
}
