import { eq, desc, asc, and, or, gte, lte, gt, between, sql, inArray, isNull, isNotNull, like, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
// @ts-ignore
import { 
  InsertUser, 
  users, 
  clients, 
  InsertClient,
  appointments,
  InsertAppointment,
  appointmentWorkTypes,
  InsertAppointmentWorkType,
  advisoryRequests,
  InsertAdvisoryRequest,
  priorEstimates,
  InsertPriorEstimate,
  quotations,
  InsertQuotation,
  quotationItems,
  InsertQuotationItem,
  colombianHolidays,
  InsertColombianHoliday,
  reminders,
  InsertReminder,
  hardwareCatalog,
  projectHardwareSelections,
  projects,
  InsertProject,
  projectPhotos,
  InsertProjectPhoto,
  projectDetails,
  InsertProjectDetail,
  tasks,
  InsertTask,
  taskReminders,
  projectStatusHistory,
  InsertProjectStatusHistory,
  pushSubscriptions,
  InsertPushSubscription,
  notifications,
  InsertNotification,
  projectMaterials,
  payments,
  InsertPayment,
  pricingConfig,
  InsertPricingConfig,
  pricingHistory,
  InsertPricingHistory,
  expenses,
  InsertExpense,
  clientRevisionHistory,
  InsertClientRevisionHistory,
  financialAlerts,
  InsertFinancialAlert,
  financialSettings,
  InsertFinancialSettings,
  auditLogs,
  InsertAuditLog,
  accountingClosures,
  InsertAccountingClosure,
  accountingClosureProjects,
  InsertAccountingClosureProject,
  accountingClosureOperationalExpenses,
  InsertAccountingClosureOperationalExpense,
  closureAuditLog,
  InsertClosureAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { randomUUID } from 'crypto';
import { triggerAlertEvaluation } from './services/financialAlertMonitor';
import mysql from 'mysql2/promise';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

export async function getPool() {
  if (!_pool && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database Pool] Failed to connect:", error);
      _pool = null;
    }
  }
  return _pool;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Enforce dataOrigin separation: automatically set to 'system' if not specified.
 * This ensures test data is never mixed with operational data.
 */
export function enforceDataOrigin<T extends { dataOrigin?: string }>(data: T): T & { dataOrigin: string } {
  return {
    ...data,
    dataOrigin: data.dataOrigin || 'system'
  };
}

// ============ USERS ============

export async function createUser(user: Omit<InsertUser, 'openId'> & { openId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({ openId: user.openId || randomUUID(), ...user });
  return result[0].insertId;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(isNull(users.deletedAt)).orderBy(desc(users.createdAt));
}

export async function getAllTeamMembers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(and(isNull(users.deletedAt), ne(users.role, 'user'))).orderBy(desc(users.createdAt));
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ deletedAt: new Date().toISOString() }).where(eq(users.id, id));
}

// ============ CLIENTS ============

export async function createClient(client: InsertClient, dataOrigin: "manual" | "system" | "test" = "manual") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(clients).values({ ...client, dataOrigin });
  return result[0].insertId;
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getClientByWhatsApp(whatsappPhone: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(clients).where(eq(clients.whatsappPhone, whatsappPhone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(clients).where(and(isNull(clients.deletedAt), eq(clients.dataOrigin, 'manual'))).orderBy(desc(clients.createdAt));
}

export async function getAllClientsPaginated(options?: { page?: number; limit?: number; search?: string }) {
  const db = await getDb();
  if (!db) return { clients: [], total: 0, page: 1, limit: 50 };

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const offset = (page - 1) * limit;
  const search = options?.search?.trim();

  const whereConditions = search
    ? and(
        isNull(clients.deletedAt),
        or(
          like(clients.name, `%${search}%`),
          like(clients.whatsappPhone, `%${search}%`),
          like(clients.email, `%${search}%`)
        )
      )
    : isNull(clients.deletedAt);

  const [rows, countRows] = await Promise.all([
    db.select().from(clients)
      .where(whereConditions)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)` }).from(clients).where(whereConditions),
  ]);

  return {
    clients: rows,
    total: Number(countRows[0]?.count ?? 0),
    page,
    limit,
  };
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(clients).set({ deletedAt: new Date().toISOString() }).where(eq(clients.id, id));
}

// ============ APPOINTMENTS ============

export async function createAppointment(appointment: InsertAppointment, dataOrigin: "manual" | "system" | "test" = "manual") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(appointments).values({ ...appointment, dataOrigin });
  return result[0].insertId;
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(appointments).where(and(eq(appointments.id, id), isNull(appointments.deletedAt), eq(appointments.dataOrigin, 'manual'))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAppointments() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(appointments).where(and(isNull(appointments.deletedAt), eq(appointments.dataOrigin, 'manual'))).orderBy(desc(appointments.createdAt));
}

export async function getAppointmentsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  const appts = await db.select().from(appointments).where(and(eq(appointments.clientId, clientId), isNull(appointments.deletedAt), eq(appointments.dataOrigin, 'manual'))).orderBy(desc(appointments.createdAt));
  
  // Enriquecer cada cita con sus workTypes
  const enriched = await Promise.all(appts.map(async (apt) => {
    const workTypes = await db.select().from(appointmentWorkTypes).where(eq(appointmentWorkTypes.appointmentId, apt.id));
    return { ...apt, workTypes: workTypes.map(wt => wt.workType) };
  }));
  
  return enriched;
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(appointments).set(data).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(appointments).set({ deletedAt: new Date().toISOString() }).where(eq(appointments.id, id));
}

export async function createAppointmentWorkType(workType: InsertAppointmentWorkType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(appointmentWorkTypes).values(workType);
  return result[0].insertId;
}

export async function getAppointmentWorkTypes(appointmentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(appointmentWorkTypes).where(eq(appointmentWorkTypes.appointmentId, appointmentId));
}

export async function deleteAppointmentWorkTypes(appointmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(appointmentWorkTypes).where(eq(appointmentWorkTypes.appointmentId, appointmentId));
}

// ============ ADVISORY REQUESTS ============

export async function createAdvisoryRequest(advisoryRequest: InsertAdvisoryRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(advisoryRequests).values(advisoryRequest);
  return result[0].insertId;
}

export async function getAdvisoryRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(advisoryRequests).where(eq(advisoryRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAdvisoryRequests() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(advisoryRequests).orderBy(desc(advisoryRequests.createdAt));
}

export async function updateAdvisoryRequest(id: number, data: Partial<InsertAdvisoryRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(advisoryRequests).set(data).where(eq(advisoryRequests.id, id));
}

// ============ PRIOR ESTIMATES ============

export async function createPriorEstimate(estimate: InsertPriorEstimate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(priorEstimates).values(estimate);
  return result[0].insertId;
}

export async function getPriorEstimateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(priorEstimates).where(eq(priorEstimates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPriorEstimatesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(priorEstimates).where(eq(priorEstimates.clientId, clientId)).orderBy(desc(priorEstimates.createdAt));
}

export async function updatePriorEstimate(id: number, data: Partial<InsertPriorEstimate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(priorEstimates).set(data).where(eq(priorEstimates.id, id));
}

// ============ QUOTATIONS ============

export async function createQuotation(quotation: Omit<InsertQuotation, 'quotationNumber'> & { quotationNumber?: string }, dataOrigin: "manual" | "system" | "test" = "manual") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generar quotationNumber automáticamente si no se proporciona
  let finalQuotation = quotation;
  if (!quotation.quotationNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000000);
    finalQuotation = {
      ...quotation,
      quotationNumber: `COT-${new Date().getFullYear()}-${timestamp}-${random}`
    };
  }

  const result = await db.insert(quotations).values({ ...finalQuotation, dataOrigin } as any);
  return result[0].insertId;
}

export async function getQuotationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(quotations).where(and(eq(quotations.id, id), eq(quotations.dataOrigin, 'manual'))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuotationsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(quotations).where(and(eq(quotations.clientId, clientId), eq(quotations.dataOrigin, 'manual'))).orderBy(desc(quotations.createdAt));
}

export async function getAllQuotations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(quotations).where(and(isNull(quotations.deletedAt), eq(quotations.dataOrigin, 'manual'), eq(quotations.isArchived, 0))).orderBy(desc(quotations.createdAt));
}

export async function getLatestApprovedQuotationVersion(quotationId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(quotations)
    .where(and(
      eq(quotations.quotationNumber, (await db.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1))[0]?.quotationNumber || ''),
      eq(quotations.status, 'approved'),
      eq(quotations.dataOrigin, 'manual')
    ))
    .orderBy(desc(quotations.versionNumber))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateQuotation(id: number, data: Partial<InsertQuotation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quotations).set(data).where(eq(quotations.id, id));
}

export async function deleteQuotation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(quotations).where(eq(quotations.id, id));
}

// ============ QUOTATION ITEMS ============

export async function createQuotationItem(item: InsertQuotationItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(quotationItems).values(item);
  return result[0].insertId;
}

export async function getQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId)).orderBy(desc(quotationItems.createdAt));
}

export async function deleteQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
}

// ============ REMINDERS ============

export async function createReminder(reminder: InsertReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reminders).values(reminder);
  return result[0].insertId;
}

export async function getReminderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRemindersByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(reminders).where(eq(reminders.projectId, projectId)).orderBy(desc(reminders.createdAt));
}

export async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date().toISOString();
  return await db.select().from(reminders).where(and(
    lte(reminders.dueDate, now),
    eq(reminders.status, 'pendiente')
  )).orderBy(desc(reminders.createdAt));
}

export async function updateReminder(id: number, data: Partial<InsertReminder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reminders).set(data).where(eq(reminders.id, id));
}

// ============ PROJECTS ============

export async function createProject(project: InsertProject, dataOrigin: "manual" | "system" | "test" = "manual") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values({ ...project, dataOrigin });
  return result[0].insertId;
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  console.log("[DEBUG db.getProjectById] Buscando proyecto con ID:", id);
  const result = await db.select().from(projects).where(and(
    eq(projects.id, id), 
    isNull(projects.deletedAt), 
    or(eq(projects.dataOrigin, 'manual'), isNull(projects.dataOrigin))
  )).limit(1);
  console.log("[DEBUG db.getProjectById] Resultado:", result.length > 0 ? `Encontrado ${result[0].id}` : "No encontrado");
  if (result.length > 0) {
    console.log("[DEBUG db.getProjectById] dataOrigin:", result[0].dataOrigin, "deletedAt:", result[0].deletedAt);
  }
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects).where(and(isNull(projects.deletedAt), eq(projects.dataOrigin, 'manual'))).orderBy(desc(projects.createdAt));
}

export async function getProjectByQuotationId(quotationId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.quotationId, quotationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProjectsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects)
    .where(and(eq(projects.status, status as any), isNull(projects.deletedAt), eq(projects.dataOrigin, 'manual')))
    .orderBy(desc(projects.createdAt));
}

export async function getAllProjectsPaginated(options?: { page?: number; limit?: number; status?: string; archived?: boolean }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  let whereConditions = and(isNull(projects.deletedAt), eq(projects.dataOrigin, 'manual'));

  if (options?.status) {
    whereConditions = and(whereConditions, eq(projects.status, options.status as any));
  }

  if (options?.archived !== undefined) {
    whereConditions = and(whereConditions, eq(projects.isArchived, options.archived ? 1 : 0));
  }

  const projectsList = await db.select().from(projects)
    .where(whereConditions)
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(projects).where(whereConditions);
  const total = countResult[0]?.count || 0;

  // Calcular rentabilidad para cada proyecto
  const projectsWithRentability = await Promise.all(
    projectsList.map(async (project) => {
      try {
        // Obtener pagos del proyecto
        const projectPayments = await db.select().from(payments)
          .where(eq(payments.projectId, project.id));
        
        // Obtener gastos del proyecto
        const projectExpenses = await db.select().from(expenses)
          .where(and(eq(expenses.projectId, project.id), eq(expenses.dataOrigin, 'manual')));
        
        // Calcular ingresos recibidos (solo pagos, no devoluciones)
        const ingresosRecibidos = projectPayments
          .filter(p => p.movementType === 'payment')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
        
        // Calcular gastos totales
        const gastos = projectExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        
        // Calcular margen
        const margen = ingresosRecibidos - gastos;
        
        // Calcular rentabilidad: (margen / ingresosRecibidos) * 100
        const rentabilidad = ingresosRecibidos > 0 
          ? (margen / ingresosRecibidos) * 100
          : 0;
        
        return {
          ...project,
          rentabilidad: Math.round(rentabilidad * 100) / 100, // Redondear a 2 decimales
        };
      } catch (error) {
        console.error(`[getAllProjectsPaginated] Error calculando rentabilidad para proyecto ${project.id}:`, error);
        return {
          ...project,
          rentabilidad: 0,
        };
      }
    })
  );

  return { data: projectsWithRentability, total };
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set({ deletedAt: new Date().toISOString() }).where(eq(projects.id, id));
}

export async function getDesignerWithLeastActiveProjects() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users)
    .where(and(eq(users.role, 'disenador'), isNull(users.deletedAt)))
    .orderBy(asc(sql`(SELECT COUNT(*) FROM projects WHERE designerId = users.id AND status NOT IN ('entregado', 'cancelado'))`))
    .limit(1);

  return result.length > 0 ? result[0].id : undefined;
}

// ============ PROJECT DETAILS ============

export async function createProjectDetail(detail: InsertProjectDetail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectDetails).values(detail);
  return result[0].insertId;
}

export async function getProjectDetail(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProjectDetail(projectId: number, data: Partial<InsertProjectDetail>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projectDetails).set(data).where(eq(projectDetails.projectId, projectId));
}

// ============ PROJECT PHOTOS ============

export async function createProjectPhoto(photo: InsertProjectPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectPhotos).values(photo);
  return result[0].insertId;
}

export async function getProjectPhotos(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projectPhotos).where(eq(projectPhotos.projectId, projectId)).orderBy(desc(projectPhotos.createdAt));
}

export async function deleteProjectPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projectPhotos).where(eq(projectPhotos.id, id));
}

// ============ PROJECT MATERIALS ============

export async function createProjectMaterial(material: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectMaterials).values(material);
  return result[0].insertId;
}

export async function getProjectMaterials(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projectMaterials).where(eq(projectMaterials.projectId, projectId));
}

export async function deleteProjectMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projectMaterials).where(eq(projectMaterials.id, id));
}

// ============ PROJECT STATUS HISTORY ============

export async function createProjectStatusHistory(history: InsertProjectStatusHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectStatusHistory).values(history);
  return result[0].insertId;
}

export async function getProjectStatusHistory(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projectStatusHistory).where(eq(projectStatusHistory.projectId, projectId)).orderBy(desc(projectStatusHistory.createdAt));
}

// ============ TASKS ============

export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values(task);
  return result[0].insertId;
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTasksByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.createdAt));
}

export async function getTasksByAssignee(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tasks).where(eq(tasks.assignedTo, userId)).orderBy(desc(tasks.createdAt));
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tasks).where(eq(tasks.id, id));
}

// ============ NOTIFICATIONS ============

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(notification);
  return result[0].insertId;
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ read: 1 }).where(eq(notifications.id, id));
}

export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notifications).where(eq(notifications.id, id));
}

// ============ PAYMENTS ============

export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(payments).values(payment);
  return result[0].insertId;
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPaymentsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(payments).where(eq(payments.projectId, projectId)).orderBy(desc(payments.createdAt));
}

export async function getPaymentsByProjectId(projectId: number) {
  return getPaymentsByProject(projectId);
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(payments).set(data).where(eq(payments.id, id));
}

export async function deletePayment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(payments).where(eq(payments.id, id));
}

// ============ FINANCIAL CALCULATIONS ============

export async function calculateProjectBalance(projectId: number) {
  const db = await getDb();
  if (!db) return { totalAmount: 0, totalCobrado: 0, totalPaid: 0, totalDiscounts: 0, totalSurcharges: 0, dynamicBalance: 0 };

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project.length) {
    return { totalAmount: 0, totalCobrado: 0, totalPaid: 0, totalDiscounts: 0, totalSurcharges: 0, dynamicBalance: 0 };
  }

  const projectData = project[0];
  const totalAmount = parseFloat(projectData.totalAmount?.toString() || '0');

  // Get all payments for this project
  const projectPayments = await db.select().from(payments).where(eq(payments.projectId, projectId));

  // Calculate totals from movements
  let totalPayments = 0;
  let totalDiscounts = 0;
  let totalSurcharges = 0;

  for (const payment of projectPayments) {
    const amount = parseFloat(payment.amount?.toString() || '0');
    if (payment.movementType === 'payment') {
      totalPayments += amount;
    } else if (payment.movementType === 'discount') {
      totalDiscounts += amount;
    } else if (payment.movementType === 'surcharge') {
      totalSurcharges += amount;
    }
  }

  // Calculate adjusted total and balance
  const adjustedTotal = totalAmount + totalSurcharges - totalDiscounts;
  const balance = adjustedTotal - totalPayments;

  return {
    totalAmount,
    totalCobrado: totalPayments,
    totalPaid: totalPayments,
    totalDiscounts,
    totalSurcharges,
    dynamicBalance: balance
  };
}

// ============ PRICING ============

export async function createPricingConfig(config: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pricingConfig).values({
    category: config.category,
    code: config.code,
    name: config.name,
    description: config.description,
    descriptionTemplate: config.descriptionTemplate,
    value: String(config.value),
    unit: config.unit,
    sortOrder: config.sortOrder ?? 0,
  });
  return result[0].insertId;
}

export async function getAllPricingConfig() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pricingConfig)
    .where(eq(pricingConfig.active, 1))
    .orderBy(asc(pricingConfig.category), asc(pricingConfig.sortOrder));
}

export async function getPricingByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pricingConfig)
    .where(and(
      eq(pricingConfig.category, category as any),
      eq(pricingConfig.active, 1)
    ))
    .orderBy(asc(pricingConfig.sortOrder));
}

export async function getPricingByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(pricingConfig)
    .where(and(
      eq(pricingConfig.code, code),
      eq(pricingConfig.active, 1)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePricingConfig(id: number, value: number, updatedBy: number, reason?: string, descriptionTemplate?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current value to record history
  const current = await db.select().from(pricingConfig).where(eq(pricingConfig.id, id)).limit(1);
  if (current.length === 0) throw new Error("Precio no encontrado");

  const previousValue = current[0].value;

  // Update the price
  const updateData: any = { value: String(value), updatedBy };
  if (descriptionTemplate !== undefined) updateData.descriptionTemplate = descriptionTemplate;
  await db.update(pricingConfig).set(updateData).where(eq(pricingConfig.id, id));

  // Record history
  await db.insert(pricingHistory).values({
    pricingConfigId: id,
    previousValue: String(previousValue),
    newValue: String(value),
    changedBy: updatedBy,
    reason: reason ?? null,
  });
}

export async function deletePricingConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db.update(pricingConfig).set({ active: 0 } as any).where(eq(pricingConfig.id, id));
}

export async function getPricingHistory(pricingConfigId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pricingHistory)
    .where(eq(pricingHistory.pricingConfigId, pricingConfigId))
    .orderBy(desc(pricingHistory.createdAt));
}

export async function getAllPricingHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pricingHistory)
    .orderBy(desc(pricingHistory.createdAt))
    .limit(limit);
}

// Legacy alias for backward compatibility
export async function getPricingConfig() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(pricingConfig).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ EXPENSES ============

export async function createExpense(expense: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(expenses).values(expense);
  return result[0].insertId;
}

export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getExpensesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(expenses).where(and(eq(expenses.projectId, projectId), eq(expenses.dataOrigin, 'manual'))).orderBy(desc(expenses.createdAt));
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(expenses).where(eq(expenses.id, id));
}

// ============ AUDIT LOGS ============

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(auditLogs).values(log);
  return result[0].insertId;
}

export async function getAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ============ CLEANUP ============

export async function cleanupTestData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all test data (dataOrigin IN ('test', 'system'))
  // Order matters: delete child tables first to avoid foreign key constraints
  const tables = [
    { table: payments, name: 'payments' },
    { table: projectPhotos, name: 'projectPhotos' },
    { table: projectMaterials, name: 'projectMaterials' },
    { table: projectDetails, name: 'projectDetails' },
    { table: projectStatusHistory, name: 'projectStatusHistory' },
    { table: tasks, name: 'tasks' },
    { table: projects, name: 'projects' },
    { table: quotationItems, name: 'quotationItems' },
    { table: quotations, name: 'quotations' },
    { table: appointments, name: 'appointments' },
    { table: clients, name: 'clients' },
    { table: users, name: 'users' },
  ];

  let deletedCount = 0;
  for (const { table, name } of tables) {
    try {
      const result = await db.delete(table).where(inArray((table as any).dataOrigin, ['test', 'system']));
      const affected = (result as any)[0]?.affectedRows ?? (result as any).rowsAffected ?? 0;
      console.log(`[Cleanup] Deleted ${affected} records from ${name}`);
      deletedCount += affected;
    } catch (error) {
      console.error(`[Cleanup] Error deleting from ${name}:`, error);
    }
  }

  return deletedCount;
}

export async function countTestData() {
  const db = await getDb();
  if (!db) return {};

  const tables = [
    { table: projects, name: 'projects' },
    { table: quotations, name: 'quotations' },
    { table: clients, name: 'clients' },
    { table: appointments, name: 'appointments' },
    { table: users, name: 'users' },
  ];

  const counts: Record<string, number> = {};
  for (const { table, name } of tables) {
    try {
      const result = await db.select({ count: sql<number>`COUNT(*)` }).from(table).where(inArray(table.dataOrigin, ['test', 'system']));
      counts[name] = result[0]?.count || 0;
    } catch (error) {
      console.error(`[Count] Error counting ${name}:`, error);
      counts[name] = 0;
    }
  }

  return counts;
}

export async function withTransaction<T>(callback: (tx?: any) => Promise<T>): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    return await callback();
  });
}

// ============ MISSING FUNCTIONS ============

export async function upsertUser(user: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
  if (existing.length > 0) {
    // Preservar el rol existente si no se proporciona uno nuevo
    const updateData = { ...user };
    if (!updateData.role && existing[0].role) {
      updateData.role = existing[0].role;
    }
    await db.update(users).set(updateData).where(eq(users.openId, user.openId));
    return existing[0].id;
  } else {
    const result = await db.insert(users).values(user);
    return result[0].insertId;
  }
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.id, userId));
}

export async function getFinancialSettings() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(financialSettings).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateFinancialSettings(id: number, data: Partial<InsertFinancialSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(financialSettings).set(data).where(eq(financialSettings.id, id));
}

export async function getGlobalFinancialDashboard() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalExpenses: 0, balance: 0 };

  // Exclude projects that have been closed (accountingClosureId is not null)
  const allProjects = await db.select().from(projects).where(and(
    isNull(projects.deletedAt),
    eq(projects.dataOrigin, 'manual'),
    isNull(projects.accountingClosureId)
  ));
  
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const project of allProjects) {
    const projectPayments = await db.select().from(payments).where(eq(payments.projectId, project.id));
    for (const payment of projectPayments) {
      const amount = parseFloat(payment.amount?.toString() || '0');
      if (payment.movementType === 'payment') {
        totalRevenue += amount;
      }
    }

    const projectExpenses = await db.select().from(expenses).where(eq(expenses.projectId, project.id));
    for (const expense of projectExpenses) {
      const amount = parseFloat(expense.amount?.toString() || '0');
      totalExpenses += amount;
    }
  }

  // Include operational expenses (bodega) - expenses with projectId = NULL
  const operationalExpenses = await db.select().from(expenses).where(isNull(expenses.projectId));
  for (const expense of operationalExpenses) {
    const amount = parseFloat(expense.amount?.toString() || '0');
    totalExpenses += amount;
  }

  return {
    totalRevenue,
    totalExpenses,
    balance: totalRevenue - totalExpenses
  };
}

export async function getCashFlowData() {
  const db = await getDb();
  if (!db) return [];

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const now = new Date();

  // Build the last 6 months (oldest to newest)
  const months: { month: string; year: number; monthIndex: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: monthNames[d.getMonth()], year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  // Fetch all payments and expenses in one pass
  const allPayments = await db.select().from(payments);
  const allExpenses = await db.select().from(expenses);

  return months.map(({ month, year, monthIndex }) => {
    let inflow = 0;
    let outflow = 0;

    for (const p of allPayments) {
      if (!p.createdAt) continue;
      const d = new Date(p.createdAt); // Use createdAt for payments (no date field)
      if (d.getFullYear() === year && d.getMonth() === monthIndex && p.movementType === 'payment') {
        inflow += parseFloat(p.amount?.toString() || '0');
      }
    }

    for (const e of allExpenses) {
      if (!e.expenseDate) continue;
      const d = new Date(e.expenseDate); // Use expenseDate for expenses (real event date)
      if (d.getFullYear() === year && d.getMonth() === monthIndex) {
        outflow += parseFloat(e.amount?.toString() || '0');
      }
    }

    return { month, inflow, outflow };
  });
}


// ============ MISSING FUNCTIONS FOR AUTH AND BACKUPS ============

export async function createUserExtended(data: {
  name: string;
  email: string;
  openId?: string;
  password?: string;
  role?: string;
  isTeamMember?: number;
  dataOrigin?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    name: data.name,
    email: data.email,
    openId: data.openId || randomUUID(),
    passwordHash: data.password || '',
    role: (data.role || 'user') as any,
    dataOrigin: (data.dataOrigin || 'manual') as any,
    createdAt: new Date().toISOString(),
  });
  return result[0].insertId;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({
    passwordResetToken: token,
    passwordResetExpires: expiresAt.toISOString()
  }).where(eq(users.id, userId));
}

export async function recordBackupMetadata(data: {
  backupName: string;
  backupType: string;
  s3Key: string;
  s3Url?: string;
  status?: string;
  size?: number;
  fileSize?: number;
  rowCounts?: Record<string, number>;
  checksums?: Record<string, string>;
  dataOriginSummary?: Record<string, number>;
  createdBy?: number;
  retentionDays?: number;
  createdAt?: Date;
}) {
  // Placeholder implementation for backup metadata recording
  // This would typically store backup metadata in a backups table
  console.log("[Backup] Recording metadata:", data);
  return { success: true };
}

export async function getBackupHistory(limit: number = 50) {
  // Placeholder implementation for getting backup history
  // This would typically query a backups table
  console.log("[Backup] Getting history with limit:", limit);
  return [];
}

export async function getLatestBackup(backupType?: string) {
  // Placeholder implementation for getting latest backup
  // This would typically query a backups table
  console.log("[Backup] Getting latest backup of type:", backupType);
  return null;
}

export async function updateBackupStatus(backupId: string, status: string) {
  // Placeholder implementation for updating backup status
  console.log("[Backup] Updating backup status:", { backupId, status });
  return { success: true };
}

export async function deleteExpiredBackups() {
  // Placeholder implementation for deleting expired backups
  console.log("[Backup] Deleting expired backups");
  return { deletedCount: 0 };
}

export async function getClientByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.passwordResetToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({
    passwordHash: passwordHash
  }).where(eq(users.id, userId));
}

export async function clearPasswordResetToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({
    passwordResetToken: null,
    passwordResetExpires: null
  }).where(eq(users.id, userId));
}

export async function logAuditAction(action: string, details: any) {
  // Placeholder implementation for audit logging
  console.log("[Audit] Action:", action, "Details:", details);
  return { success: true };
}


export async function getAllQuotationsGroupedByBase(options?: { page?: number; limit?: number; status?: string; archived?: boolean }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  // Obtener todas las cotizaciones con filtros (SIN filtrar por isArchived aún)
  let whereConditions = and(isNull(quotations.deletedAt), eq(quotations.dataOrigin, 'manual'));
  
  if (options?.status) {
    whereConditions = and(whereConditions, eq(quotations.status, options.status as any));
  }

  // Obtener todas las cotizaciones ordenadas por número y fecha (más recientes primero)
  // El filtro archived se aplicará DESPUÉS de agrupar, basándose en activeVersion.isArchived
  const allQuotations = await db.select().from(quotations)
    .where(whereConditions)
    .orderBy(desc(quotations.quotationNumber), desc(quotations.createdAt));

  // Agrupar por número base y construir estructura esperada por el frontend
  const groupedMap = new Map<string, any>();
  
  for (const quot of allQuotations) {
    // Obtener número base eliminando solo la parte de versión "-v{n}" si existe
    const baseNumber = quot.quotationNumber?.replace(/-v\d+$/, '') ?? `unknown-${quot.id}`;
    
    if (baseNumber && !groupedMap.has(baseNumber)) {
      // Primera vez que vemos este número base - esta es la versión más reciente
      groupedMap.set(baseNumber, {
        baseQuotationId: quot.id,
        quotationNumber: baseNumber,
        client: (quot as any).client || null,
        status: quot.status,
        createdAt: quot.createdAt,
        activeVersion: quot, // La versión más reciente (primera en el orden)
        versions: [quot],
      });
    } else {
      // Versiones anteriores del mismo número base
      const group = groupedMap.get(baseNumber);
      if (group.versions) {
        group.versions.push(quot);
      } else {
        group.versions = [quot];
      }
    }
  }

  // Convertir a array y validar estructura
  let grouped = Array.from(groupedMap.values()).map(group => ({
    baseQuotationId: group.baseQuotationId ?? null,
    quotationNumber: group.quotationNumber ?? '',
    client: group.client ?? null,
    status: group.status ?? 'pendiente',
    createdAt: group.createdAt ?? new Date(),
    activeVersion: group.activeVersion ?? null,
    versions: group.versions ?? [],
  }));

  // Aplicar filtro archived DESPUÉS de agrupar, basándose en activeVersion.isArchived
  // Por defecto, devolver solo cotizaciones activas (no archivadas)
  if (options?.archived === true) {
    grouped = grouped.filter(g => g.activeVersion?.isArchived === 1);
  } else {
    // Si archived es false o undefined, devolver solo activas
    grouped = grouped.filter(g => g.activeVersion?.isArchived === 0);
  }

  const total = grouped.length;
  
  // Aplicar paginación DESPUÉS de agrupar
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;
  const paginatedQuotations = grouped.slice(offset, offset + limit);

  const groupedQuotations = paginatedQuotations ?? [];
  return { data: groupedQuotations, total };
}


export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    return result[0]?.count || 0;
  } catch (error) {
    // Si la tabla no existe o hay error, retornar 0
    return 0;
  }
}

export async function getAllTasks(options?: { status?: string }): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  let whereConditions = and(isNull(tasks.deletedAt), eq(tasks.dataOrigin, 'manual'));

  if (options?.status) {
    whereConditions = and(whereConditions, eq(tasks.status, options.status as any));
  }

  const tasksList = await db.select().from(tasks)
    .where(whereConditions)
    .orderBy(desc(tasks.createdAt));

  return tasksList ?? [];
}


/**
 * getCEOFinancialMetrics()
 * 
 * Calcula métricas financieras reales para el Panel CEO
 * Usa SQL aggregates para máxima eficiencia
 * 
 * Métricas calculadas:
 * - ingresosRecibidos: SUM(payments.amount) WHERE movementType = 'payment'
 * - totalVendido: SUM(projects.totalAmount) WHERE deletedAt IS NULL AND dataOrigin = 'manual'
 * - porCobrar: totalVendido - ingresosRecibidos
 * - gastos: SUM(expenses.amount)
 * - margen: ingresosRecibidos - gastos
 * - rentabilidad: (margen / ingresosRecibidos) * 100
 */
export async function getCEOFinancialMetrics() {
  const db = await getDb();
  if (!db) {
    return {
      ingresosRecibidos: 0,
      totalVendido: 0,
      porCobrar: 0,
      gastos: 0,
      margen: 0,
      rentabilidad: 0
    };
  }

  try {
    // 1️⃣ INGRESOS RECIBIDOS
    // SUM(payments.amount) WHERE movementType = 'payment'
    const paymentsResult = await db.select({
      total: sql<number>`SUM(CAST(payments.amount AS DECIMAL(12,2)))`
    }).from(payments)
      .where(eq(payments.movementType, 'payment'));
    
    const ingresosRecibidos = parseFloat(paymentsResult[0]?.total?.toString() || '0');

    // 2️⃣ TOTAL VENDIDO
    // SUM(projects.totalAmount) WHERE deletedAt IS NULL AND dataOrigin = 'manual'
    // NO filtrar por status de proyecto
    const projectsResult = await db.select({
      total: sql<number>`SUM(CAST(projects.totalAmount AS DECIMAL(12,2)))`
    }).from(projects)
      .where(and(
        isNull(projects.deletedAt),
        eq(projects.dataOrigin, 'manual')
      ));
    
    const totalVendido = parseFloat(projectsResult[0]?.total?.toString() || '0');

    // 3️⃣ GASTOS
    // SUM(expenses.amount)
    const expensesResult = await db.select({
      total: sql<number>`SUM(CAST(expenses.amount AS DECIMAL(12,2)))`
    }).from(expenses);
    
    const gastos = parseFloat(expensesResult[0]?.total?.toString() || '0');

    // 4️⃣ CÁLCULOS DERIVADOS
    const porCobrar = totalVendido - ingresosRecibidos;
    const margen = ingresosRecibidos - gastos;
    const rentabilidad = ingresosRecibidos > 0 
      ? ((margen / ingresosRecibidos) * 100)
      : 0;

    return {
      ingresosRecibidos,
      totalVendido,
      porCobrar,
      gastos,
      margen,
      rentabilidad
    };
  } catch (error) {
    console.error("[getCEOFinancialMetrics] Error:", error);
    return {
      ingresosRecibidos: 0,
      totalVendido: 0,
      porCobrar: 0,
      gastos: 0,
      margen: 0,
      rentabilidad: 0
    };
  }
}


/**
 * getMonthlyProjectsCount()
 * 
 * Calcula el número de proyectos que recibieron al menos un pago en el mes actual
 * 
 * Lógica:
 * - COUNT(DISTINCT payments.projectId)
 * - WHERE payments.movementType = 'payment'
 * - AND payments.deletedAt IS NULL
 * - AND payments.createdAt BETWEEN startOfMonth AND endOfMonth
 * - AND projects.deletedAt IS NULL
 * - AND projects.dataOrigin = 'manual'
 * 
 * Retorna: número de proyectos con al menos un pago en el mes actual
 */
export async function getMonthlyProjectsCount() {
  const db = await getDb();
  if (!db) return 0;

  try {
    const now = new Date();
    
    // Calcular rango del mes actual (sin usar MONTH() para preservar índices)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Obtener todos los pagos del mes actual que sean 'payment'
    const monthlyPayments = await db.select({
      projectId: payments.projectId
    }).from(payments)
      .where(and(
        eq(payments.movementType, 'payment'),
        gte(payments.createdAt, startOfMonth.toISOString()),
        lte(payments.createdAt, endOfMonth.toISOString())
      ));

    if (monthlyPayments.length === 0) return 0;

    // Obtener IDs únicos de proyectos
    const projectIds = Array.from(new Set(monthlyPayments.map(p => p.projectId)));

    // Verificar que los proyectos existan y sean válidos
    const validProjects = await db.select({
      id: projects.id
    }).from(projects)
      .where(and(
        inArray(projects.id, projectIds),
        isNull(projects.deletedAt),
        eq(projects.dataOrigin, 'manual')
      ));

    return validProjects.length;
  } catch (error) {
    console.error("[getMonthlyProjectsCount] Error:", error);
    return 0;
  }
}

// Get users by role
export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(users)
    .where(and(
      eq(users.role, role as any),
      isNull(users.deletedAt)
    ))
    .orderBy(asc(users.name));
}

// Update task reminder history (log that a reminder was sent for a task)
export async function updateTaskReminderHistory(taskId: number, sentBy: number) {
  const db = await getDb();
  if (!db) return;
  // Log the reminder in taskReminders table using system user (sentBy=0 means auto system)
  // sentBy must reference a valid user, so we skip insert if sentBy is 0 (system)
  if (sentBy > 0) {
    await db.insert(taskReminders).values({
      taskId,
      sentBy,
      sentTo: sentBy,
    });
  }
  // For system-generated reminders (sentBy=0), just log to console
  console.log(`[TaskReminders] Reminder logged for task ${taskId} by ${sentBy === 0 ? 'system' : `user ${sentBy}`}`);
}

// ============ FINANCIAL ALERTS ============

export async function getFinancialAlertByType(alertType: 'deliveredWithOutstanding' | 'lowCollectionRate') {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(financialAlerts)
    .where(eq(financialAlerts.alertType, alertType))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateFinancialAlert(
  alertType: 'deliveredWithOutstanding' | 'lowCollectionRate',
  data: { isActive?: number; lastTriggeredAt?: string; lastMessageSentAt?: string }
) {
  const db = await getDb();
  if (!db) return;

  // Upsert: update if exists, insert if not
  const existing = await getFinancialAlertByType(alertType);
  if (existing) {
    await db.update(financialAlerts)
      .set(data)
      .where(eq(financialAlerts.alertType, alertType));
  } else {
    await db.insert(financialAlerts).values({
      alertType,
      isActive: data.isActive ?? 0,
      lastTriggeredAt: data.lastTriggeredAt,
      lastMessageSentAt: data.lastMessageSentAt,
    });
  }
}

// ============ USER PROFILE UPDATES ============

export async function updateUserBirthDate(userId: number, birthDate: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ birthDate: birthDate ?? undefined })
    .where(eq(users.id, userId));
}

export async function updateUserPhone(userId: number, phone: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ phone: phone ?? undefined })
    .where(eq(users.id, userId));
}

// ============ USER MANAGEMENT - FUNCIONES FALTANTES ============

export async function updateUserRole(userId: number, newRole: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role: newRole as any }).where(eq(users.id, userId));
}

export async function getAppointmentsByClientId(clientId: number) {
  return getAppointmentsByClient(clientId);
}

export async function getQuotationsByClientId(clientId: number) {
  return getQuotationsByClient(clientId);
}

export async function getProjectsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.clientId, clientId));
}

export async function deleteProjectPhotos(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectPhotos).where(eq(projectPhotos.projectId, projectId));
}

export async function deleteProjectTasks(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.projectId, projectId));
}

export async function deleteProjectStatusHistory(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectStatusHistory).where(eq(projectStatusHistory.projectId, projectId));
}

export async function deleteProjectMaterials(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectMaterials).where(eq(projectMaterials.projectId, projectId));
}

export async function deletePriorEstimatesByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(priorEstimates).where(eq(priorEstimates.clientId, clientId));
}

export async function deleteAdvisoryRequestsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(advisoryRequests).where(eq(advisoryRequests.clientId, clientId));
}

export async function checkUserDependencies(userId: number) {
  const db = await getDb();
  if (!db) return { hasRealDependencies: false };
  // Verificar si el usuario creó o tiene proyectos activos asociados
  const createdProjects = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.createdBy, userId), isNull(projects.deletedAt)))
    .limit(1);
  return { hasRealDependencies: createdProjects.length > 0 };
}

export async function deletePushSubscriptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function deleteNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.userId, userId));
}

export async function getPushSubscriptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

// Alias: getTasksByAssignedTo → getTasksByAssignee
export async function getTasksByAssignedTo(userId: number) {
  return getTasksByAssignee(userId);
}

// Alias: getTasksByProjectId → getTasksByProject
export async function getTasksByProjectId(projectId: number) {
  return getTasksByProject(projectId);
}

// getAllTasksPaginated: paginación para tareas con filtros opcionales
export async function getAllTasksPaginated(options?: {
  page?: number;
  limit?: number;
  status?: string;
  assignedTo?: number;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions: any[] = [isNull(tasks.deletedAt), eq(tasks.dataOrigin, 'manual')];
  if (options?.status) {
    conditions.push(eq(tasks.status, options.status as any));
  }
  if (options?.assignedTo) {
    conditions.push(eq(tasks.assignedTo, options.assignedTo));
  }

  const whereClause = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.select().from(tasks).where(whereClause).orderBy(desc(tasks.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`COUNT(*)` }).from(tasks).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


export async function deleteAllNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(notifications).where(eq(notifications.userId, userId));
  const affected = (result as any)[0]?.affectedRows ?? (result as any).rowsAffected ?? 0;
  return { deletedCount: affected };
}

// ============ ALIAS Y FUNCIONES FALTANTES EN ROUTERS ============

export async function getProjectPhotosByProjectId(projectId: number) {
  return getProjectPhotos(projectId);
}

export async function getProjectPhotosByCategory(projectId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.category, category as any)))
    .orderBy(desc(projectPhotos.createdAt));
}

export async function getProjectPhotosByStage(projectId: number, stage: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.stage, stage as any)))
    .orderBy(desc(projectPhotos.createdAt));
}

export async function getProjectPhotoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectPhotos).where(eq(projectPhotos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProjectDetailsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId)).orderBy(desc(projectDetails.createdAt));
}

export async function deleteProjectDetail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectDetails).where(eq(projectDetails.id, id));
}

export async function saveProjectMaterials(projectId: number, data: any, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(projectMaterials).where(eq(projectMaterials.projectId, projectId)).limit(1);
  if (existing.length > 0) {
    await db.update(projectMaterials).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(projectMaterials.projectId, projectId));
    return existing[0].id;
  } else {
    const result = await db.insert(projectMaterials).values({ projectId, ...data, createdBy: userId });
    return result[0].insertId;
  }
}

export async function getProjectHardwareSelections(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(projectHardwareSelections)
    .where(eq(projectHardwareSelections.projectId, projectId));
  // Enriquecer con datos del catálogo de hardware
  const hardwareIds = Array.from(new Set(rows.map(r => r.hardwareId)));
  const hardwareItems = hardwareIds.length > 0
    ? await db.select().from(hardwareCatalog).where(inArray(hardwareCatalog.id, hardwareIds))
    : [];
  const hardwareMap = new Map(hardwareItems.map(h => [h.id, h]));
  return rows.map(r => ({ ...r, hardware: hardwareMap.get(r.hardwareId) ?? null }));
}

export async function addProjectHardwareSelection(projectId: number, hardwareId: number, selectedOption?: string, notes?: string, createdBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectHardwareSelections).values({
    projectId,
    hardwareId,
    selectedOption: selectedOption ?? null,
    notes: notes ?? null,
    createdBy: createdBy ?? 0,
  });
  return result[0].insertId;
}

export async function removeProjectHardwareSelection(projectId: number, hardwareId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectHardwareSelections)
    .where(and(eq(projectHardwareSelections.projectId, projectId), eq(projectHardwareSelections.hardwareId, hardwareId)));
}

// ============ ALIAS REMINDERS (usados en notifications.ts) ============

export async function getRemindersByProjectId(projectId: number) {
  return getRemindersByProject(projectId);
}

export async function getRemindersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reminders).where(eq(reminders.assignedTo, userId)).orderBy(desc(reminders.createdAt));
}

export async function updateReminderStatus(id: number, status: 'pendiente' | 'enviado' | 'completado' | 'cancelado') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reminders).set({ status }).where(eq(reminders.id, id));
}

// ============ ALIAS QUOTATIONS PAGINATED ============

export async function getAllQuotationsPaginated(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = params.limit ?? 20;
  const offset = ((params.page ?? 1) - 1) * limit;
  let query = db.select().from(quotations).orderBy(desc(quotations.createdAt));
  const allRows = await query;
  const filtered = allRows.filter(q => {
    if (params.status && q.status !== params.status) return false;
    return true;
  });
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

// ============ FUNCIONES FALTANTES EXPENSES ============

export async function getAllExpenses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).where(and(isNull(expenses.deletedAt), eq(expenses.dataOrigin, 'manual'))).orderBy(desc(expenses.createdAt));
}

export async function getExpensesByType(type: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses)
    .where(and(isNull(expenses.deletedAt), eq(expenses.expenseType, type as any), eq(expenses.dataOrigin, 'manual')))
    .orderBy(desc(expenses.createdAt));
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses)
    .where(and(
      isNull(expenses.deletedAt),
      eq(expenses.dataOrigin, 'manual'),
      gte(expenses.expenseDate, startDate.toISOString()),
      lte(expenses.expenseDate, endDate.toISOString())
    ))
    .orderBy(desc(expenses.createdAt));
}

export async function getExpensesByProjectId(projectId: number) {
  return getExpensesByProject(projectId);
}

export async function getAllExpensesPaginated(params: { page?: number; limit?: number; expenseType?: string }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const limit = params.limit ?? 50;
  const offset = ((params.page ?? 1) - 1) * limit;
  let allRows = await db.select().from(expenses).where(and(isNull(expenses.deletedAt), eq(expenses.dataOrigin, 'manual'))).orderBy(desc(expenses.createdAt));
  if (params.expenseType && params.expenseType !== 'all') {
    allRows = allRows.filter(e => e.expenseType === params.expenseType);
  }
  return { data: allRows.slice(offset, offset + limit), total: allRows.length };
}

export async function getExpensesSummaryByType() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(expenses).where(and(isNull(expenses.deletedAt), eq(expenses.dataOrigin, 'manual')));
  const map = new Map<string, number>();
  rows.forEach(e => {
    const key = e.expenseType;
    map.set(key, (map.get(key) ?? 0) + parseFloat(e.amount as string));
  });
  return Array.from(map.entries()).map(([type, total]) => ({ type, total: total.toString() }));
}

export async function getOperativeExpensesSummaryByCategory() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(expenses).where(and(isNull(expenses.deletedAt), eq(expenses.expenseType, 'gasto_operativo'), eq(expenses.dataOrigin, 'manual')));
  const map = new Map<string, number>();
  rows.forEach(e => {
    const key = e.operativeCategory ?? 'otro';
    map.set(key, (map.get(key) ?? 0) + parseFloat(e.amount as string));
  });
  return Array.from(map.entries()).map(([category, total]) => ({ category, total: total.toString() }));
}

export async function getProjectExpensesSummary() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(expenses).where(and(isNull(expenses.deletedAt), eq(expenses.expenseType, 'materiales_proyecto'), eq(expenses.dataOrigin, 'manual')));
  const map = new Map<string, number>();
  rows.forEach(e => {
    const key = e.projectClientName ?? 'Sin proyecto';
    map.set(key, (map.get(key) ?? 0) + parseFloat(e.amount as string));
  });
  return Array.from(map.entries()).map(([project, total]) => ({ project, total: total.toString() }));
}

export async function getExpensesSummaryByGeneralCategory() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(expenses).where(and(isNull(expenses.deletedAt), eq(expenses.dataOrigin, 'manual')));
  const map = new Map<string, number>();
  rows.forEach(e => {
    const key = e.generalCategory ?? 'otros';
    map.set(key, (map.get(key) ?? 0) + parseFloat(e.amount as string));
  });
  return Array.from(map.entries()).map(([category, total]) => ({ category, total: total.toString() }));
}

// ============ FUNCIONES FALTANTES DATA PROTECTION (soft-delete) ============

export async function getDeletedClients(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).where(isNotNull(clients.deletedAt)).orderBy(desc(clients.deletedAt)).limit(limit);
}

export async function getDeletedProjects(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(isNotNull(projects.deletedAt)).orderBy(desc(projects.deletedAt)).limit(limit);
}

export async function getDeletedQuotations(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(quotations).where(isNotNull(quotations.deletedAt)).orderBy(desc(quotations.deletedAt)).limit(limit);
}

export async function getDeletedAppointments(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(appointments).where(isNotNull(appointments.deletedAt)).orderBy(desc(appointments.deletedAt)).limit(limit);
}

export async function getDeletedTasks(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(isNotNull(tasks.deletedAt)).orderBy(desc(tasks.deletedAt)).limit(limit);
}

export async function getDeletedExpenses(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).where(isNotNull(expenses.deletedAt)).orderBy(desc(expenses.deletedAt)).limit(limit);
}

export async function restoreClient(id: number, _userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ deletedAt: null }).where(eq(clients.id, id));
}

export async function restoreProject(id: number, _userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, id));
}

export async function restoreQuotation(id: number, _userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotations).set({ deletedAt: null }).where(eq(quotations.id, id));
}

export async function restoreAppointment(id: number, _userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(appointments).set({ deletedAt: null }).where(eq(appointments.id, id));
}

export async function restoreTask(id: number, _userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set({ deletedAt: null }).where(eq(tasks.id, id));
}

export async function restoreExpense(id: number, _userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set({ deletedAt: null }).where(eq(expenses.id, id));
}

export async function getAuditLogsByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getAuditLogsForRecord(tableName: string, recordId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs)
    .where(and(eq(auditLogs.tableName, tableName), eq(auditLogs.recordId, recordId)))
    .orderBy(desc(auditLogs.createdAt));
}

export async function permanentlyDeleteRecord(tableName: string, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Solo permite borrado permanente de registros ya en papelera
  switch (tableName) {
    case 'clients': await db.delete(clients).where(and(eq(clients.id, id), isNotNull(clients.deletedAt))); break;
    case 'projects': await db.delete(projects).where(and(eq(projects.id, id), isNotNull(projects.deletedAt))); break;
    case 'quotations': await db.delete(quotations).where(and(eq(quotations.id, id), isNotNull(quotations.deletedAt))); break;
    case 'appointments': await db.delete(appointments).where(and(eq(appointments.id, id), isNotNull(appointments.deletedAt))); break;
    case 'tasks': await db.delete(tasks).where(and(eq(tasks.id, id), isNotNull(tasks.deletedAt))); break;
    case 'expenses': await db.delete(expenses).where(and(eq(expenses.id, id), isNotNull(expenses.deletedAt))); break;
    default: throw new Error(`Tabla no permitida para borrado permanente: ${tableName}`);
  }
}

export async function emptyRecycleBin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Respetar orden de foreign keys: primero hijos, luego padres
  // 1. Eliminar items de cotizaciones (hijo de quotations)
  const deletedQuotationIds = await db.select({ id: quotations.id }).from(quotations).where(isNotNull(quotations.deletedAt));
  if (deletedQuotationIds.length > 0) {
    const ids = deletedQuotationIds.map(q => q.id);
    await db.delete(quotationItems).where(inArray(quotationItems.quotationId, ids));
  }
  // 2. Eliminar cotizaciones soft-deleted
  await db.delete(quotations).where(isNotNull(quotations.deletedAt));
  // 3. Eliminar hijos de projects soft-deleted
  const deletedProjectIds = await db.select({ id: projects.id }).from(projects).where(isNotNull(projects.deletedAt));
  if (deletedProjectIds.length > 0) {
    const ids = deletedProjectIds.map(p => p.id);
    await db.delete(expenses).where(and(inArray(expenses.projectId, ids), isNotNull(expenses.deletedAt)));
    await db.delete(tasks).where(and(inArray(tasks.projectId, ids), isNotNull(tasks.deletedAt)));
  }
  // 4. Eliminar tasks y expenses soft-deleted sin proyecto
  await db.delete(tasks).where(isNotNull(tasks.deletedAt));
  await db.delete(expenses).where(isNotNull(expenses.deletedAt));
  // 5. Eliminar projects soft-deleted (ANTES de clients porque projects tiene FK a clients)
  await db.delete(projects).where(isNotNull(projects.deletedAt));
  // 6. Eliminar hijos de clients soft-deleted (respetar FK: advisoryRequests, appointments, priorEstimates, quotations)
  const deletedClientIds = await db.select({ id: clients.id }).from(clients).where(isNotNull(clients.deletedAt));
  if (deletedClientIds.length > 0) {
    const ids = deletedClientIds.map(c => c.id);
    // Eliminar advisory requests de esos clientes
    await db.delete(advisoryRequests).where(inArray(advisoryRequests.clientId, ids));
    // Eliminar prior estimates de esos clientes
    await db.delete(priorEstimates).where(inArray(priorEstimates.clientId, ids));
    // Eliminar appointments de esos clientes
    await db.delete(appointments).where(inArray(appointments.clientId, ids));
    // Eliminar quotation items de cotizaciones de esos clientes
    const clientQuotations = await db.select({ id: quotations.id }).from(quotations).where(inArray(quotations.clientId, ids));
    if (clientQuotations.length > 0) {
      await db.delete(quotationItems).where(inArray(quotationItems.quotationId, clientQuotations.map(q => q.id)));
    }
    // Eliminar quotations de esos clientes
    await db.delete(quotations).where(inArray(quotations.clientId, ids));
  }
  // 7. Eliminar appointments soft-deleted sin cliente
  await db.delete(appointments).where(isNotNull(appointments.deletedAt));
  // 8. Finalmente eliminar clients soft-deleted
  await db.delete(clients).where(isNotNull(clients.deletedAt));
}

// ============ FUNCIONES FALTANTES PUBLIC GALLERY ============

export async function createClientRevision(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientRevisionHistory).values(data);
  return result[0].insertId;
}

// ============ FUNCIONES FALTANTES APPOINTMENTS ============

export async function getAllAppointmentsPaginated(options?: { page?: number; limit?: number; status?: string }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page: 1, limit: 50 };
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const offset = (page - 1) * limit;
  const whereConditions = options?.status
    ? and(isNull(appointments.deletedAt), eq(appointments.status, options.status as any))
    : isNull(appointments.deletedAt);
  const [rows, countRows] = await Promise.all([
    db.select().from(appointments)
      .where(whereConditions)
      .orderBy(desc(appointments.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)` }).from(appointments).where(whereConditions),
  ]);
  return {
    data: rows,
    total: Number(countRows[0]?.count ?? 0),
    page,
    limit,
  };
}

export async function getAppointmentsByDate(date: Date) {
  const db = await getDb();
  if (!db) return [];
  // Buscar citas del día dado (comparando por prefijo de fecha)
  const dateStr = date.toISOString().split('T')[0]; // "YYYY-MM-DD"
  return await db.select().from(appointments)
    .where(and(
      isNull(appointments.deletedAt),
      like(appointments.scheduledDate, `${dateStr}%`)
    ))
    .orderBy(appointments.scheduledDate);
}

// ============ HARDWARE CATALOG ============
export async function getHardwareCatalog(category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions: any = eq(hardwareCatalog.active, 1);
  if (category) {
    conditions = and(eq(hardwareCatalog.active, 1), eq(hardwareCatalog.category, category as any));
  }
  
  return await db.select().from(hardwareCatalog)
    .where(conditions)
    .orderBy(asc(hardwareCatalog.sortOrder));
}
export async function getAllHardware() {
  return getHardwareCatalog();
}

export async function createHardwareItem(data: typeof hardwareCatalog.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(hardwareCatalog).values(data);
  return result[0].insertId;
}
export async function updateHardwareItem(id: number, data: Partial<typeof hardwareCatalog.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hardwareCatalog).set(data).where(eq(hardwareCatalog.id, id));
}
export async function deleteHardwareItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hardwareCatalog).where(eq(hardwareCatalog.id, id));
}

// ============ PUSH SUBSCRIPTIONS ============
export async function createPushSubscription(data: {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pushSubscriptions).values({
    userId: data.userId,
    endpoint: data.endpoint,
    p256Dh: data.p256dh,
    auth: data.auth,
    userAgent: data.userAgent ?? null,
  });
  return result[0].insertId;
}
export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// ============ NOTIFICATIONS ALIASES ============
export async function getNotificationsByUserId(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ read: 1 }).where(eq(notifications.userId, userId));
}
export async function deleteNotificationsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return { deletedCount: 0 };
  await db.delete(notifications).where(inArray(notifications.id, ids));
  return { deletedCount: ids.length };
}

// ============ ADVISORY ALIASES ============
export async function getAdvisoryRequestsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(advisoryRequests)
    .where(eq(advisoryRequests.clientId, clientId))
    .orderBy(desc(advisoryRequests.createdAt));
}
export async function deleteAdvisoryRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(advisoryRequests).where(eq(advisoryRequests.id, id));
}
export async function getPriorEstimatesByClientId(clientId: number) {
  return getPriorEstimatesByClient(clientId);
}

// ============ COLOMBIAN HOLIDAYS ============
export async function getColombianHolidays(year?: number) {
  const db = await getDb();
  if (!db) return [];
  if (year !== undefined) {
    return await db.select().from(colombianHolidays)
      .where(eq(colombianHolidays.year, year))
      .orderBy(asc(colombianHolidays.date));
  }
  return await db.select().from(colombianHolidays).orderBy(asc(colombianHolidays.date));
}
export async function createColombianHoliday(data: InsertColombianHoliday) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(colombianHolidays).values(data);
  return result[0].insertId;
}

// ============ REMINDERS ALIASES ============
export async function cancelProjectReminders(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reminders)
    .set({ status: 'cancelado' } as any)
    .where(eq(reminders.projectId as any, projectId));
}

export async function updateNotificationPushSent(notificationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ sentPush: 1 }).where(eq(notifications.id, notificationId));
}


// ============ ACCOUNTING CLOSURES ============

/**
 * Get archived projects that are not yet included in any closure
 * Only projects with status 'entregado' and isArchived=1 can be closed
 */
export async function getPendingClosureProjects() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(projects)
    .where(
      and(
        eq(projects.isArchived, 1),
        eq(projects.status, 'entregado'),
        isNull(projects.accountingClosureId),
        eq(projects.dataOrigin, 'manual')
      )
    )
    .orderBy(desc(projects.createdAt));
}

/**
 * Create a new accounting closure
 */
export async function createAccountingClosure(data: {
  periodStart: string | Date;
  periodEnd: string | Date;
  createdBy: number;
  projectIds: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Start transaction
  const result = await db.transaction(async (tx) => {
    // Create closure record
    // Convert dates to string format if needed
    const formatDate = (date: string | Date): string => {
      if (typeof date === 'string') return date;
      return date.toISOString().split('T')[0];
    };
    
    const closureResult = await tx.insert(accountingClosures).values({
      periodStart: formatDate(data.periodStart),
      periodEnd: formatDate(data.periodEnd),
      status: 'draft',
      createdBy: data.createdBy,
      projectCount: data.projectIds.length,
      totalSales: 0,
      totalExpenses: 0,
      totalProfit: 0,
    } as any);
    
    const closureId = closureResult[0].insertId;
    
    // Get project details for closure
    const projectsData = await tx.select()
      .from(projects)
      .where(inArray(projects.id, data.projectIds));
    
    let totalSales = 0;
    let totalExpenses = 0;
    let totalProfit = 0;
    
    // Get operational expenses (bodega) to include in closure
    const operationalExpenses = await tx.select()
      .from(expenses)
      .where(
        and(
          eq(expenses.expenseType, 'gasto_operativo'),
          eq(expenses.dataOrigin, 'manual'),
          isNull(expenses.deletedAt)
        )
      );
    
    const totalOperationalExpenses = operationalExpenses.reduce((sum, exp) => {
      return sum + (exp.amount ? parseFloat(exp.amount.toString()) : 0);
    }, 0);
    
    // Add projects to closure
    for (const project of projectsData) {
      const projectValue = project.totalAmount ? parseFloat(project.totalAmount.toString()) : 0;
      const totalPaid = project.advanceAmount ? parseFloat(project.advanceAmount.toString()) : 0;
      
      // Get project expenses
      const projectExpenses = await tx.select()
        .from(expenses)
        .where(
          and(
            eq(expenses.projectId, project.id),
            eq(expenses.dataOrigin, 'manual')
          )
        );
      
      const totalProjectExpenses = projectExpenses.reduce((sum, exp) => {
        return sum + (exp.amount ? parseFloat(exp.amount.toString()) : 0);
      }, 0);
      
      const profit = projectValue - totalProjectExpenses;
      
      await tx.insert(accountingClosureProjects).values({
        closureId,
        projectId: project.id,
        projectName: project.name,
        projectValue: projectValue,
        totalPaid: totalPaid,
        totalExpenses: totalProjectExpenses,
        profit: profit,
      } as any);
      
      // Update project with closure reference
      await tx.update(projects)
        .set({ accountingClosureId: closureId })
        .where(eq(projects.id, project.id));
      
      totalSales += projectValue;
      totalExpenses += totalProjectExpenses;
      totalProfit += profit;
    }
    
    // Add operational expenses to closure (using raw SQL due to schema sync)
    const pool = await getPool();
    if (pool) {
      for (const expense of operationalExpenses) {
        const conn = await pool.getConnection();
        try {
          await conn.execute(
            `INSERT INTO accountingClosureOperationalExpenses 
            (closureId, expenseId, category, description, amount, expenseDate) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              closureId,
              expense.id,
              expense.operativeCategory || 'otro',
              expense.description,
              expense.amount,
              expense.expenseDate
            ]
          );
        } finally {
          conn.release();
        }
      }
    }
    
    // Update closure totals (include operational expenses)
    const finalTotalExpenses = totalExpenses + totalOperationalExpenses;
    const finalTotalProfit = totalSales - finalTotalExpenses;
    
    await tx.update(accountingClosures)
      .set({
        totalSales: totalSales,
        totalExpenses: finalTotalExpenses,
        totalProfit: finalTotalProfit,
      } as any)
      .where(eq(accountingClosures.id, closureId));
    
    return closureId;
  });
  
  return result;
}

/**
 * Get accounting closures with filtering
 */
export async function getAccountingClosures(filters?: {
  status?: 'draft' | 'confirmed';
  createdBy?: number;
  periodStart?: string | Date;
  periodEnd?: string | Date;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions: any[] = [];
  
  if (filters?.status) {
    conditions.push(eq(accountingClosures.status, filters.status));
  }
  
  if (filters?.createdBy) {
    conditions.push(eq(accountingClosures.createdBy, filters.createdBy));
  }
  
  if (filters?.periodStart) {
    const startStr = typeof filters.periodStart === 'string' 
      ? filters.periodStart 
      : filters.periodStart.toISOString().split('T')[0];
    conditions.push(gte(accountingClosures.periodEnd, startStr));
  }
  
  if (filters?.periodEnd) {
    const endStr = typeof filters.periodEnd === 'string' 
      ? filters.periodEnd 
      : filters.periodEnd.toISOString().split('T')[0];
    conditions.push(lte(accountingClosures.periodStart, endStr));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  return await db.select()
    .from(accountingClosures)
    .where(whereClause)
    .orderBy(desc(accountingClosures.createdAt));
}

/**
 * Get operational expenses for a closure
 */
export async function getClosureOperationalExpenses(closureId: number) {
  const pool = await getPool();
  if (!pool) return [];
  
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT * FROM accountingClosureOperationalExpenses 
       WHERE closureId = ? 
       ORDER BY expenseDate DESC`,
      [closureId]
    );
    return rows as any[];
  } finally {
    conn.release();
  }
}

/**
 * Get closure details with projects
 */
export async function getClosureDetails(closureId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const closure = await db.select()
    .from(accountingClosures)
    .where(eq(accountingClosures.id, closureId))
    .limit(1);
  
  if (!closure.length) return null;
  
  const closureProjects = await db.select()
    .from(accountingClosureProjects)
    .where(eq(accountingClosureProjects.closureId, closureId));
  
  return {
    ...closure[0],
    projects: closureProjects,
  };
}

/**
 * Confirm an accounting closure
 */
export async function confirmAccountingClosure(closureId: number, confirmedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(accountingClosures)
    .set({
      status: 'confirmed',
      confirmedBy: confirmedBy,
      confirmedAt: new Date().toISOString(),
    } as any)
    .where(eq(accountingClosures.id, closureId));
}

/**
 * Get projects included in a closure
 */
export async function getClosureProjects(closureId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(accountingClosureProjects)
    .where(eq(accountingClosureProjects.closureId, closureId));
}


/**
 * Get closure reports by period with filtering
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @param status - Filter by status: 'draft' | 'confirmed' | 'all'
 */
export async function getClosureReportsByPeriod(
  startDate?: string,
  endDate?: string,
  status: 'draft' | 'confirmed' | 'all' = 'all'
) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  // Add date filters if provided
  if (startDate) {
    conditions.push(gte(accountingClosures.periodStart, startDate));
  }
  if (endDate) {
    conditions.push(lte(accountingClosures.periodEnd, endDate));
  }

  // Add status filter
  if (status !== 'all') {
    conditions.push(eq(accountingClosures.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const closures = whereClause
    ? await db.select().from(accountingClosures).where(whereClause).orderBy(desc(accountingClosures.periodStart))
    : await db.select().from(accountingClosures).orderBy(desc(accountingClosures.periodStart));

  return closures;
}

/**
 * Get closure summary statistics
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export async function getClosureSummary(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) {
    return {
      totalClosures: 0,
      totalSales: 0,
      totalExpenses: 0,
      totalProfit: 0,
      averageProfitMargin: 0,
    };
  }

  const conditions: any[] = [eq(accountingClosures.status, 'confirmed')];

  if (startDate) {
    conditions.push(gte(accountingClosures.periodStart, startDate));
  }
  if (endDate) {
    conditions.push(lte(accountingClosures.periodEnd, endDate));
  }

  const closures = await db.select().from(accountingClosures).where(and(...conditions));


  let totalSales = 0;
  let totalExpenses = 0;
  let totalProfit = 0;

  for (const closure of closures) {
    totalSales += parseFloat(closure.totalSales?.toString() || '0');
    totalExpenses += parseFloat(closure.totalExpenses?.toString() || '0');
    totalProfit += parseFloat(closure.totalProfit?.toString() || '0');
  }

  const averageProfitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  return {
    totalClosures: closures.length,
    totalSales,
    totalExpenses,
    totalProfit,
    averageProfitMargin,
  };
}

/**
 * Get monthly closure summary for charts
 * @param months - Number of months to retrieve (default: 6)
 */
export async function getMonthlyClosureSummary(months: number = 6) {
  const db = await getDb();
  if (!db) return [];

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const now = new Date();

  // Build the last N months (oldest to newest)
  const monthsData: { month: string; year: number; monthIndex: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsData.push({
      month: monthNames[d.getMonth()],
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
    });
  }

  // Fetch all confirmed closures
  const allClosures = await db
    .select()
    .from(accountingClosures)
    .where(eq(accountingClosures.status, 'confirmed'));

  return monthsData.map(({ month, year, monthIndex }) => {
    let sales = 0;
    let expenses = 0;
    let profit = 0;

    for (const closure of allClosures) {
      if (!closure.periodStart) continue;
      const d = new Date(closure.periodStart);
      if (d.getFullYear() === year && d.getMonth() === monthIndex) {
        sales += parseFloat(closure.totalSales?.toString() || '0');
        expenses += parseFloat(closure.totalExpenses?.toString() || '0');
        profit += parseFloat(closure.totalProfit?.toString() || '0');
      }
    }

    return {
      month: `${month} ${year}`,
      sales,
      expenses,
      profit,
    };
  });
}


/**
 * Generate PDF for accounting closure
 * @param closureId - ID of the closure to generate PDF for
 */
export async function generateClosurePDF(closureId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Get closure details
  const closure = await getClosureDetails(closureId);
  if (!closure) throw new Error("Closure not found");

  // Get closure projects
  const projects = await getClosureProjects(closureId);

  // Get creator and confirmer info
  const creator = await db.select().from(users).where(eq(users.id, closure.createdBy)).limit(1);
  const confirmer = closure.confirmedBy
    ? await db.select().from(users).where(eq(users.id, closure.confirmedBy)).limit(1)
    : null;

  // Format data for PDF
  const closureDate = new Date(closure.periodStart);
  const closureDateStr = closureDate.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const periodStartStr = new Date(closure.periodStart).toLocaleDateString("es-CO");
  const periodEndStr = new Date(closure.periodEnd).toLocaleDateString("es-CO");

  // Create HTML for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cierre Contable ${closureId}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #0d9488;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #0d9488;
          font-size: 28px;
          margin-bottom: 10px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        .closure-info {
          background: #f0fdf4;
          border-left: 4px solid #0d9488;
          padding: 15px;
          margin-bottom: 30px;
          border-radius: 4px;
        }
        .closure-info h2 {
          color: #0d9488;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .info-label {
          font-weight: 600;
          color: #333;
        }
        .info-value {
          color: #666;
        }
        .projects-section {
          margin-bottom: 30px;
        }
        .projects-section h3 {
          color: #0d9488;
          font-size: 16px;
          margin-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        th {
          background: #f3f4f6;
          color: #333;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #d1d5db;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        tr:hover {
          background: #f9fafb;
        }
        .text-right {
          text-align: right;
        }
        .summary-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .summary-label {
          font-weight: 600;
          color: #333;
        }
        .summary-value {
          color: #0d9488;
          font-weight: 600;
          font-size: 16px;
        }
        .summary-row.total {
          border-top: 2px solid #d1d5db;
          padding-top: 12px;
          margin-top: 12px;
        }
        .summary-value.total {
          color: #059669;
          font-size: 18px;
        }
        .signature-section {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        .signature-row {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
        }
        .signature-box {
          width: 45%;
          text-align: center;
          font-size: 12px;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-bottom: 5px;
          height: 40px;
        }
        .signature-name {
          font-weight: 600;
          color: #333;
        }
        .signature-role {
          color: #666;
          font-size: 11px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #999;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-confirmed {
          background: #d1fae5;
          color: #065f46;
        }
        .status-draft {
          background: #fef3c7;
          color: #92400e;
        }
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>📊 Reporte de Cierre Contable</h1>
          <p>INNOVAR Cocinas Integrales</p>
        </div>

        <!-- Closure Info -->
        <div class="closure-info">
          <h2>Información del Cierre</h2>
          <div class="info-row">
            <span class="info-label">Número de Cierre:</span>
            <span class="info-value">#${closureId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Período:</span>
            <span class="info-value">${periodStartStr} - ${periodEndStr}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="info-value">
              <span class="status-badge ${closure.status === "confirmed" ? "status-confirmed" : "status-draft"}">
                ${closure.status === "confirmed" ? "✓ Confirmado" : "◐ Borrador"}
              </span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Creado por:</span>
            <span class="info-value">${creator[0]?.name || "Sistema"}</span>
          </div>
          ${closure.confirmedBy && confirmer ? `
          <div class="info-row">
            <span class="info-label">Confirmado por:</span>
            <span class="info-value">${confirmer[0]?.name || "Sistema"}</span>
          </div>
          ` : ""}
          <div class="info-row">
            <span class="info-label">Fecha de Generación:</span>
            <span class="info-value">${closureDateStr}</span>
          </div>
        </div>

        <!-- Projects Section -->
        <div class="projects-section">
          <h3>Proyectos Incluidos (${projects.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th class="text-right">Valor</th>
                <th class="text-right">Gastos</th>
                <th class="text-right">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              ${projects
                .map(
                  (p: any) => `
              <tr>
                <td>${p.projectName}</td>
                <td class="text-right">$${Number(p.projectValue).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</td>
                <td class="text-right">$${Number(p.totalExpenses).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</td>
                <td class="text-right">$${Number(p.profit).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</td>
              </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Summary Section -->
        <div class="summary-section">
          <h3 style="color: #0d9488; margin-bottom: 15px;">Resumen Financiero</h3>
          <div class="summary-row">
            <span class="summary-label">Total Ventas:</span>
            <span class="summary-value">$${Number(closure.totalSales).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Gastos:</span>
            <span class="summary-value">$${Number(closure.totalExpenses).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
          </div>
          <div class="summary-row total">
            <span class="summary-label">Ganancia Neta:</span>
            <span class="summary-value total">$${Number(closure.totalProfit).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <h3 style="color: #0d9488; margin-bottom: 30px;">Firmas Autorizadas</h3>
          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-name">${creator[0]?.name || "Responsable"}</div>
              <div class="signature-role">Creador del Cierre</div>
              <div class="signature-role">${new Date(closure.createdAt).toLocaleDateString("es-CO")}</div>
            </div>
            ${closure.confirmedBy && confirmer ? `
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-name">${confirmer[0]?.name || "Responsable"}</div>
              <div class="signature-role">Confirmador del Cierre</div>
              <div class="signature-role">${new Date(closure.confirmedAt || new Date()).toLocaleDateString("es-CO")}</div>
            </div>
            ` : ""}
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Este documento es un reporte oficial del cierre contable generado por INNOVAR Cocinas Integrales.</p>
          <p>Fecha de generación: ${new Date().toLocaleString("es-CO")}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return htmlContent;
}


/**
 * Send notification to owner when closure is confirmed
 */
export async function notifyOwnerClosureConfirmed(closureId: number, confirmedBy: number): Promise<boolean> {
  try {
    const { notifyOwner } = await import("./_core/notification");
    const closure = await getClosureDetails(closureId);
    
    if (!closure) {
      console.error("[Notification] Closure not found:", closureId);
      return false;
    }

    const projectIds = await getClosureProjects(closureId);

    const content = `
Cierre Contable Confirmado

Período: ${closure.periodStart} a ${closure.periodEnd}
Estado: ${closure.status}
Número de Proyectos: ${projectIds.length}

Totales:
- Ventas: $${closure.totalSales}
- Gastos: $${closure.totalExpenses}
- Ganancia: $${closure.totalProfit}

Confirmado por: Usuario #${confirmedBy}
Fecha: ${new Date().toLocaleString()}
    `.trim();

    const notifyResult = await notifyOwner({
      title: `Cierre Contable #${closureId} Confirmado`,
      content,
    });

    return notifyResult === true;
  } catch (error) {
    console.error("[Notification] Error notifying owner:", error);
    return false;
  }
}

/**
 * Generate Excel file for closure export
 */
export async function generateClosureExcel(closureId: number): Promise<Buffer> {
  try {
    const XLSX = await import("xlsx");
    const closure = await getClosureDetails(closureId);
    
    if (!closure) {
      throw new Error("Closure not found");
    }

    const projectIds = await getClosureProjects(closureId);
    const monthlySummary = await getMonthlyClosureSummary(6);

    // Sheet 1: Summary
    const summaryData = [
      ["Cierre Contable #" + closureId],
      [],
      ["Período", closure.periodStart + " a " + closure.periodEnd],
      ["Estado", closure.status],
      ["Número de Proyectos", projectIds.length],
      [],
      ["Totales"],
      ["Ventas", closure.totalSales],
      ["Gastos", closure.totalExpenses],
      ["Ganancia", closure.totalProfit],
      ["Margen", ((Number(closure.totalProfit) / Number(closure.totalSales)) * 100).toFixed(2) + "%"],
      [],
      ["Creado por", "Usuario #" + closure.createdBy],
      ["Confirmado por", closure.confirmedBy ? "Usuario #" + closure.confirmedBy : "N/A"],
    ];

    // Sheet 2: Projects
    const projectsData = [
      ["Proyectos Incluidos en el Cierre"],
      ["ID Proyecto", "Nombre", "Estado"],
      ...projectIds.map((id) => [id, "Proyecto #" + id, "Incluido"]),
    ];

    // Sheet 3: Monthly Summary
    const monthlySummaryData = [
      ["Resumen Mensual (Últimos 6 Meses)"],
      ["Mes", "Total Cierres", "Ventas", "Gastos", "Ganancia"],
      ...monthlySummary.map((m: any) => [
        m.month || "N/A",
        m.closureCount || 0,
        m.totalSales || 0,
        m.totalExpenses || 0,
        m.totalProfit || 0,
      ]),
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    const ws2 = XLSX.utils.aoa_to_sheet(projectsData);
    const ws3 = XLSX.utils.aoa_to_sheet(monthlySummaryData);

    XLSX.utils.book_append_sheet(workbook, ws1, "Resumen");
    XLSX.utils.book_append_sheet(workbook, ws2, "Proyectos");
    XLSX.utils.book_append_sheet(workbook, ws3, "Histórico Mensual");

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    return buffer;
  } catch (error) {
    console.error("[Excel] Error generating Excel:", error);
    throw error;
  }
}


// ============================================================================
// FASE 6: AUDIT LOG FUNCTIONS
// ============================================================================

export async function logClosureAudit(
  closureId: number,
  action: 'created' | 'confirmed' | 'deleted',
  performedBy: number,
  actionDetails?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[AUDIT LOG] Database not available");
    return;
  }

  try {
    await db.insert(closureAuditLog).values({
      closureId,
      action,
      performedBy,
      actionDetails: actionDetails || {},
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error(`[AUDIT LOG] Error logging closure ${action}:`, error);
    // Don't throw - audit log failure shouldn't break the operation
  }
}

export async function getClosureAuditLog(
  closureId?: number,
  action?: 'created' | 'confirmed' | 'deleted',
  startDate?: string,
  endDate?: string
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [];
    
    if (closureId) {
      conditions.push(eq(closureAuditLog.closureId, closureId));
    }
    if (action) {
      conditions.push(eq(closureAuditLog.action, action));
    }
    if (startDate) {
      conditions.push(gte(closureAuditLog.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(closureAuditLog.timestamp, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const logs = await db
      .select()
      .from(closureAuditLog)
      .where(whereClause)
      .orderBy(desc(closureAuditLog.timestamp));
    
    return logs.map(log => ({
      ...log,
      actionDetails: log.actionDetails || {},
    }));
  } catch (error) {
    console.error('[AUDIT LOG] Error retrieving audit logs:', error);
    return [];
  }
}

export async function getClosureAuditSummary(closureId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const logs = await db
      .select()
      .from(closureAuditLog)
      .where(eq(closureAuditLog.closureId, closureId))
      .orderBy(asc(closureAuditLog.timestamp));

    return {
      closureId,
      totalActions: logs.length,
      createdAt: logs.find(l => l.action === 'created')?.timestamp,
      createdBy: logs.find(l => l.action === 'created')?.performedBy,
      confirmedAt: logs.find(l => l.action === 'confirmed')?.timestamp,
      confirmedBy: logs.find(l => l.action === 'confirmed')?.performedBy,
      deletedAt: logs.find(l => l.action === 'deleted')?.timestamp,
      deletedBy: logs.find(l => l.action === 'deleted')?.performedBy,
      timeline: logs,
    };
  } catch (error) {
    console.error('[AUDIT LOG] Error retrieving audit summary:', error);
    return null;
  }
}

export async function getUserAuditActions(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  try {
    const logs = await db
      .select()
      .from(closureAuditLog)
      .where(eq(closureAuditLog.performedBy, userId))
      .orderBy(desc(closureAuditLog.timestamp))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('[AUDIT LOG] Error retrieving user audit actions:', error);
    return [];
  }
}
