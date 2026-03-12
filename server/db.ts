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
  InsertAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';
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

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(user);
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

  return await db.select().from(users).where(and(isNull(users.deletedAt), eq(users.isTeamMember, 1))).orderBy(desc(users.createdAt));
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

  return await db.select().from(appointments).where(and(eq(appointments.clientId, clientId), isNull(appointments.deletedAt), eq(appointments.dataOrigin, 'manual'))).orderBy(desc(appointments.createdAt));
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

export async function createQuotation(quotation: InsertQuotation, dataOrigin: "manual" | "system" | "test" = "manual") {
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

  const result = await db.insert(quotations).values({ ...finalQuotation, dataOrigin });
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
      eq(quotations.status, 'aprobada'),
      eq(quotations.dataOrigin, 'manual')
    ))
    .orderBy(desc(quotations.version))
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
    lte(reminders.scheduledFor, now),
    eq(reminders.sent, 0)
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
  if (!db) return { projects: [], total: 0 };

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

  return { projects: projectsList, total };
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

  return await db.select().from(expenses).where(eq(expenses.projectId, projectId)).orderBy(desc(expenses.createdAt));
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
      const result = await db.delete(table).where(inArray(table.dataOrigin, ['test', 'system']));
      console.log(`[Cleanup] Deleted ${result.rowsAffected} records from ${name}`);
      deletedCount += result.rowsAffected || 0;
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

export async function withTransaction<T>(callback: () => Promise<T>): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    return await callback();
  });
}

import { asc } from "drizzle-orm";

// ============ MISSING FUNCTIONS ============

export async function upsertUser(user: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
  if (existing.length > 0) {
    await db.update(users).set(user).where(eq(users.openId, user.openId));
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

  const allProjects = await db.select().from(projects).where(and(isNull(projects.deletedAt), eq(projects.dataOrigin, 'manual')));
  
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

  return {
    totalRevenue,
    totalExpenses,
    balance: totalRevenue - totalExpenses
  };
}

export async function getCashFlowData() {
  const db = await getDb();
  if (!db) return [];

  const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
  
  const cashFlow: any[] = [];
  for (const payment of allPayments) {
    const project = await db.select().from(projects).where(eq(projects.id, payment.projectId)).limit(1);
    if (project.length > 0) {
      cashFlow.push({
        date: payment.createdAt,
        amount: payment.amount,
        type: payment.movementType,
        projectName: project[0].name
      });
    }
  }

  return cashFlow;
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
    openId: data.openId || '',
    password: data.password || '',
    role: data.role || 'user',
    isTeamMember: data.isTeamMember || 0,
    dataOrigin: data.dataOrigin || 'manual',
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
  status?: string;
  size?: number;
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
    password: passwordHash
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
  if (!db) return { quotations: [], total: 0 };

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
        client: quot.client || null,
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
  if (options?.archived === true) {
    grouped = grouped.filter(g => g.activeVersion?.isArchived === 1);
  } else if (options?.archived === false) {
    grouped = grouped.filter(g => g.activeVersion?.isArchived === 0);
  }

  const total = grouped.length;
  
  // Aplicar paginación DESPUÉS de agrupar
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;
  const paginatedQuotations = grouped.slice(offset, offset + limit);

  const groupedQuotations = paginatedQuotations ?? [];
  return { quotations: groupedQuotations, total };
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
        gte(payments.createdAt, startOfMonth),
        lte(payments.createdAt, endOfMonth)
      ));

    if (monthlyPayments.length === 0) return 0;

    // Obtener IDs únicos de proyectos
    const projectIds = [...new Set(monthlyPayments.map(p => p.projectId))];

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
