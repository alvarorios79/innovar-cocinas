import { eq, desc, and, or, gte, lte, gt, between, sql, inArray, isNull, isNotNull, asc } from "drizzle-orm";
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

export async function updateUserBirthDate(id: number, birthDate: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ birthDate }).where(eq(users.id, id));
}

export async function updateUserPhone(id: number, phone: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ phone }).where(eq(users.id, id));
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

export async function getAllAppointmentsPaginated(options?: { page?: number; limit?: number; status?: string }) {
  const db = await getDb();
  if (!db) return { appointments: [], total: 0, page: 1, limit: 50 };

  const limit = options?.limit || 50;
  const page = options?.page || 1;
  const offset = (page - 1) * limit;
  const status = options?.status;

  let whereConditions = and(isNull(appointments.deletedAt), eq(appointments.dataOrigin, 'manual'));
  
  if (status) {
    whereConditions = and(whereConditions, eq(appointments.status, status));
  }

  const data = await db.select()
    .from(appointments)
    .where(whereConditions)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(appointments.createdAt));

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(whereConditions);

  const total = countResult[0]?.count || 0;

  return { appointments: data, total, page, limit };
}

export async function getAppointmentsByDate(date: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await db.select()
    .from(appointments)
    .where(and(
      isNull(appointments.deletedAt),
      eq(appointments.dataOrigin, 'manual'),
      gte(appointments.scheduledDate, startOfDay.toISOString()),
      lte(appointments.scheduledDate, endOfDay.toISOString())
    ))
    .orderBy(asc(appointments.scheduledDate));
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

export async function getAllQuotationsPaginated(options?: { page?: number; limit?: number; status?: string }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page: 1, limit: 50 };
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;
  let query = db.select().from(quotations).where(
    and(
      isNull(quotations.deletedAt),
      eq(quotations.dataOrigin, 'manual'),
      eq(quotations.isArchived, 0),
      options?.status ? eq(quotations.status, options.status as any) : undefined
    )
  ).$dynamic();
  const allRows = await query.orderBy(desc(quotations.createdAt));
  const total = allRows.length;
  const data = allRows.slice(offset, offset + limit);
  return { data, total, page, limit };
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

export async function createPricingConfig(config: InsertPricingConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pricingConfig).values(config);
  return result[0].insertId;
}

export async function getPricingConfig() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(pricingConfig).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePricingConfig(id: number, data: Partial<InsertPricingConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(pricingConfig).set(data).where(eq(pricingConfig.id, id));
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
      const result = await db.delete(table).where(inArray((table as any).dataOrigin, ['test', 'system']));
      const affected = (result as any)?.affectedRows ?? (result as any)?.rowsAffected ?? 0;
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

export async function withTransaction<T>(callback: ((tx?: any) => Promise<T>) | (() => Promise<T>)): Promise<T> {
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
    passwordHash: data.password ? data.password : undefined,
    role: (data.role || 'user') as any,
    isTeamMember: data.isTeamMember || 0,
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19).replace('T', ' ');
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString().slice(0, 19).replace('T', ' ');

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

// ============ TASK REMINDER HISTORY ============

/**
 * Actualiza el historial de recordatorios de una tarea.
 * Incrementa reminderCount, actualiza lastReminderSentAt y lastReminderSentBy.
 * userId = 0 indica que fue enviado automáticamente por el sistema.
 */
export async function updateTaskReminderHistory(taskId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(tasks)
    .set({
      lastReminderSentAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      lastReminderSentBy: userId || null,
      reminderCount: sql`COALESCE(${tasks.reminderCount}, 0) + 1`,
    })
    .where(eq(tasks.id, taskId));
}

// ============ USERS BY ROLE ============

/**
 * Obtiene todos los usuarios activos con un rol específico.
 * Útil para enviar notificaciones a admins, diseñadores, etc.
 */
export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users)
    .where(and(
      isNull(users.deletedAt),
      eq(users.role, role as any)
    ))
    .orderBy(desc(users.createdAt));
}

// ============ FINANCIAL ALERTS ============

/**
 * Obtiene una alerta financiera por su tipo.
 */
export async function getFinancialAlertByType(alertType: 'deliveredWithOutstanding' | 'lowCollectionRate') {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(financialAlerts)
    .where(eq(financialAlerts.alertType, alertType))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Actualiza o crea una alerta financiera por su tipo.
 */
export async function updateFinancialAlert(
  alertType: 'deliveredWithOutstanding' | 'lowCollectionRate',
  data: {
    isActive?: number;
    lastTriggeredAt?: string;
    lastMessageSentAt?: string;
  }
) {
  const db = await getDb();
  if (!db) return;

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

// ============ USER MANAGEMENT HELPERS ============

/**
 * Actualiza el rol de un usuario.
 */
export async function updateUserRole(id: number, role: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role: role as any }).where(eq(users.id, id));
}

/**
 * Obtiene citas de un cliente por su ID (alias de getAppointmentsByClient).
 */
export async function getAppointmentsByClientId(clientId: number) {
  return getAppointmentsByClient(clientId);
}

/**
 * Obtiene cotizaciones de un cliente por su ID (alias de getQuotationsByClient).
 */
export async function getQuotationsByClientId(clientId: number) {
  return getQuotationsByClient(clientId);
}

/**
 * Obtiene proyectos de un cliente por su ID.
 */
export async function getProjectsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(
    and(eq(projects.clientId, clientId), isNull(projects.deletedAt))
  );
}

/**
 * Elimina todas las fotos de un proyecto.
 */
export async function deleteProjectPhotos(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectPhotos).where(eq(projectPhotos.projectId, projectId));
}

/**
 * Elimina todas las tareas de un proyecto.
 */
export async function deleteProjectTasks(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.projectId, projectId));
}

/**
 * Elimina todo el historial de estados de un proyecto.
 */
export async function deleteProjectStatusHistory(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectStatusHistory).where(eq(projectStatusHistory.projectId, projectId));
}

/**
 * Elimina todos los materiales de un proyecto.
 */
export async function deleteProjectMaterials(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectMaterials).where(eq(projectMaterials.projectId, projectId));
}

/**
 * Elimina todos los estimados previos de un cliente.
 */
export async function deletePriorEstimatesByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(priorEstimates).where(eq(priorEstimates.clientId, clientId));
}

/**
 * Elimina todas las solicitudes de asesoría de un cliente.
 */
export async function getAdvisoryRequestsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(advisoryRequests)
    .where(and(eq(advisoryRequests.clientId, clientId), isNull(advisoryRequests.deletedAt)))
    .orderBy(desc(advisoryRequests.createdAt));
}

export async function deleteAdvisoryRequestsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(advisoryRequests).where(eq(advisoryRequests.clientId, clientId));
}

/**
 * Verifica si un usuario tiene dependencias en datos reales (no de prueba).
 * Devuelve hasRealDependencies: true si el usuario está asociado a proyectos o clientes reales.
 */
export async function checkUserDependencies(userId: number): Promise<{ hasRealDependencies: boolean }> {
  const db = await getDb();
  if (!db) return { hasRealDependencies: false };

  // Verificar si el usuario creó proyectos activos
  const userProjects = await db.select().from(projects).where(
    and(eq(projects.createdBy, userId), isNull(projects.deletedAt))
  ).limit(1);

  return { hasRealDependencies: userProjects.length > 0 };
}

/**
 * Elimina todas las suscripciones push de un usuario.
 */
export async function deletePushSubscriptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

/**
 * Elimina todas las notificaciones de un usuario.
 */
export async function deleteNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.userId, userId));
}

// ============ TASKS PAGINATION ALIAS ============

/**
 * Alias paginado de getAllTasks para el router de tareas.
 */
export async function getAllTasksPaginatedResult(options?: {
  page?: number;
  limit?: number;
  status?: string;
  assignedTo?: number;
}): Promise<{ data: any[]; total: number; page: number; limit: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page: 1, limit: 50 };

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  let whereConditions = and(isNull(tasks.deletedAt), eq(tasks.dataOrigin, 'manual'));

  if (options?.status) {
    whereConditions = and(whereConditions, eq(tasks.status, options.status as any));
  }
  if (options?.assignedTo) {
    whereConditions = and(whereConditions, eq(tasks.assignedTo, options.assignedTo));
  }

  const allTasks = await db.select().from(tasks)
    .where(whereConditions)
    .orderBy(desc(tasks.createdAt));

  const total = allTasks.length;
  const offset = (page - 1) * limit;
  const data = allTasks.slice(offset, offset + limit);

  return { data, total, page, limit };
}

// Alias for getProjectPhotos (backward compatibility)
export async function getProjectPhotosByProjectId(projectId: number) {
  return getProjectPhotos(projectId);
}

// Create a client revision history entry
export async function createClientRevision(revision: InsertClientRevisionHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientRevisionHistory).values(revision);
  return result[0].insertId;
}

// Add a hardware selection to a project
export async function addProjectHardwareSelection(
  projectId: number,
  hardwareId: number,
  selectedOption: string | null,
  notes: string | null,
  createdBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectHardwareSelections).values({
    projectId,
    hardwareId,
    selectedOption,
    notes,
    createdBy,
  });
  return result[0].insertId;
}

// Remove a hardware selection from a project
export async function removeProjectHardwareSelection(projectId: number, hardwareId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectHardwareSelections)
    .where(and(
      eq(projectHardwareSelections.projectId, projectId),
      eq(projectHardwareSelections.hardwareId, hardwareId)
    ));
}

// Save (upsert) project materials - creates or updates the materials record for a project
export async function saveProjectMaterials(projectId: number, data: Partial<{
  woodType: string;
  woodColor: string;
  woodPhotoUrl: string;
  countertopType: string;
  countertopName: string;
  countertopPhotoUrl: string;
  sinkMeasure: string;
  sinkPhotoUrl: string;
  notes: string;
}>, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if a record already exists for this project
  const existing = await db.select().from(projectMaterials).where(eq(projectMaterials.projectId, projectId)).limit(1);
  if (existing.length > 0) {
    // Update existing record
    await db.update(projectMaterials).set(data as any).where(eq(projectMaterials.projectId, projectId));
    return existing[0].id;
  } else {
    // Create new record
    const result = await db.insert(projectMaterials).values({ projectId, createdBy, ...data } as any);
    return result[0].insertId;
  }
}

// Get all hardware selections for a project with hardware catalog details
export async function getProjectHardwareSelections(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: projectHardwareSelections.id,
    projectId: projectHardwareSelections.projectId,
    hardwareId: projectHardwareSelections.hardwareId,
    selectedOption: projectHardwareSelections.selectedOption,
    notes: projectHardwareSelections.notes,
    createdBy: projectHardwareSelections.createdBy,
    createdAt: projectHardwareSelections.createdAt,
    quantity: projectHardwareSelections.quantity,
    priceAtQuotation: projectHardwareSelections.priceAtQuotation,
    hardwareName: hardwareCatalog.name,
    hardwareCategory: hardwareCatalog.category,
    hardwarePrice: hardwareCatalog.price,
    hardwareUnit: hardwareCatalog.unit,
  })
  .from(projectHardwareSelections)
  .leftJoin(hardwareCatalog, eq(projectHardwareSelections.hardwareId, hardwareCatalog.id))
  .where(and(
    eq(projectHardwareSelections.projectId, projectId),
    isNotNull(hardwareCatalog.id)
  ));
}

// Get project photos filtered by category
export async function getProjectPhotosByCategory(projectId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projectPhotos)
    .where(and(
      eq(projectPhotos.projectId, projectId),
      eq(projectPhotos.category, category as any)
    ))
    .orderBy(desc(projectPhotos.createdAt));
}

// Get project photos filtered by stage
export async function getProjectPhotosByStage(projectId: number, stage: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projectPhotos)
    .where(and(
      eq(projectPhotos.projectId, projectId),
      eq(projectPhotos.stage, stage as any)
    ))
    .orderBy(desc(projectPhotos.createdAt));
}

// Get a single project photo by id
export async function getProjectPhotoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectPhotos).where(eq(projectPhotos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Get all project details by projectId (returns array, not single record)
export async function getProjectDetailsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projectDetails)
    .where(eq(projectDetails.projectId, projectId))
    .orderBy(desc(projectDetails.createdAt));
}

// Delete a project detail by id
export async function deleteProjectDetail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectDetails).where(eq(projectDetails.id, id));
}

// ============ PRICING CONFIG EXTENDED ============

// Get all pricing configs (full list)
export async function getAllPricingConfig() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pricingConfig).where(eq(pricingConfig.active, 1)).orderBy(pricingConfig.category, pricingConfig.sortOrder);
}

// Get pricing configs by category
export async function getPricingByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pricingConfig)
    .where(and(eq(pricingConfig.category, category as any), eq(pricingConfig.active, 1)))
    .orderBy(pricingConfig.sortOrder);
}

// Get a single pricing config by code
export async function getPricingByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricingConfig)
    .where(and(eq(pricingConfig.code, code), eq(pricingConfig.active, 1)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Update a pricing config value with history tracking
export async function updatePricingConfigWithHistory(id: number, newValue: number, changedBy: number, reason?: string, descriptionTemplate?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get current value for history
  const current = await db.select().from(pricingConfig).where(eq(pricingConfig.id, id)).limit(1);
  if (current.length === 0) throw new Error("Pricing config not found");
  const previousValue = current[0].value;
  // Update config
  const updateData: any = { value: newValue.toString(), updatedBy: changedBy };
  if (descriptionTemplate !== undefined) updateData.descriptionTemplate = descriptionTemplate;
  await db.update(pricingConfig).set(updateData).where(eq(pricingConfig.id, id));
  // Record history
  await db.insert(pricingHistory).values({
    pricingConfigId: id,
    previousValue: previousValue,
    newValue: newValue.toString(),
    changedBy,
    reason: reason || null,
  });
}

// Get pricing history for a specific config
export async function getPricingHistory(pricingConfigId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pricingHistory)
    .where(eq(pricingHistory.pricingConfigId, pricingConfigId))
    .orderBy(desc(pricingHistory.createdAt));
}

// Get all pricing history with limit
export async function getAllPricingHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pricingHistory)
    .orderBy(desc(pricingHistory.createdAt))
    .limit(limit);
}

// Soft delete a pricing config
export async function deletePricingConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricingConfig).set({ active: 0 }).where(eq(pricingConfig.id, id));
}

// Update reminder status (completado, cancelado, pendiente, enviado)
export async function updateReminderStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reminders).set({ status: status as any }).where(eq(reminders.id, id));
}

// Get reminders by user ID (assigned to a specific user)
export async function getRemindersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reminders)
    .where(eq(reminders.assignedTo, userId))
    .orderBy(desc(reminders.createdAt));
}

// ============ NOTIFICATIONS EXTENDED ============

// Get notifications by user ID (alias of getNotificationsByUser)
export async function getNotificationsByUserId(userId: number) {
  return getNotificationsByUser(userId);
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ read: 1 }).where(
    and(eq(notifications.userId, userId), eq(notifications.read, 0))
  );
}

// Delete notifications by array of IDs
export async function deleteNotificationsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db.delete(notifications).where(inArray(notifications.id, ids));
}

// Delete all notifications for a user (alias with clearer name)
export async function deleteAllNotificationsByUserId(userId: number) {
  return deleteNotificationsByUserId(userId);
}

// Update notification to mark push as sent
export async function updateNotificationPushSent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ sentPush: 1 }).where(eq(notifications.id, id));
}

// Get reminders by project ID (alias of getRemindersByProject)
export async function cancelProjectReminders(projectId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(reminders)
    .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
    .where(and(
      eq(reminders.projectId, projectId),
      eq(reminders.status, 'pending')
    ));
}

export async function getRemindersByProjectId(projectId: number) {
  return getRemindersByProject(projectId);
}

// ============ PUSH SUBSCRIPTIONS EXTENDED ============

// Create a push subscription
export async function createPushSubscription(data: InsertPushSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pushSubscriptions).values(data);
  return result[0].insertId;
}

// Get push subscriptions by user ID
export async function getPushSubscriptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, 1)));
}

// Delete a single push subscription by ID
export async function deletePushSubscription(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
}

// ============ HARDWARE CATALOG CRUD ============

// Update a hardware catalog item
export async function updateHardwareItem(id: number, data: Partial<{
  name: string;
  description: string | null;
  options: string | null;
  photoUrl: string | null;
  sortOrder: number;
  active: boolean | number;
  price: string | number;
  unit: string;
  category: "cocinas" | "closets" | "puertas";
}>) {
  const { active: rawActive, price: rawPrice, ...rest } = data as any;
  const normalizedData: any = { ...rest };
  if (rawActive !== undefined) normalizedData.active = typeof rawActive === 'boolean' ? (rawActive ? 1 : 0) : rawActive;
  if (rawPrice !== undefined) normalizedData.price = String(rawPrice);
  data = normalizedData;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hardwareCatalog).set({ ...data, updatedAt: new Date().toISOString().slice(0, 19).replace("T", " ") }).where(eq(hardwareCatalog.id, id));
}

// Delete a hardware catalog item (soft delete via active=0)
export async function deleteHardwareItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hardwareCatalog).set({ active: 0, updatedAt: new Date().toISOString().slice(0, 19).replace("T", " ") }).where(eq(hardwareCatalog.id, id));
}

// Get hardware catalog items, optionally filtered by category
export async function getHardwareCatalog(category?: "cocinas" | "closets" | "puertas") {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return await db.select().from(hardwareCatalog)
      .where(and(eq(hardwareCatalog.category, category), eq(hardwareCatalog.active, 1)))
      .orderBy(hardwareCatalog.sortOrder);
  }
  return await db.select().from(hardwareCatalog)
    .where(eq(hardwareCatalog.active, 1))
    .orderBy(hardwareCatalog.sortOrder);
}

// Create a new hardware catalog item
export async function createHardwareItem(data: {
  category: "cocinas" | "closets" | "puertas";
  name: string;
  description?: string;
  options?: string;
  price?: number;
  photoUrl?: string;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(hardwareCatalog).values({
    category: data.category,
    name: data.name,
    description: data.description || null,
    options: data.options || null,
    price: data.price !== undefined ? String(data.price) : "0",
    photoUrl: data.photoUrl || null,
    sortOrder: data.sortOrder || 0,
    active: 1,
  });
  return result[0].insertId;
}

// ============ EXPENSES AGGREGATION & QUERIES ============

// Get all expenses
export async function getAllExpenses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).orderBy(expenses.expenseDate);
}

// Get all expenses paginated
export async function getAllExpensesPaginated(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses)
    .orderBy(expenses.expenseDate)
    .limit(limit)
    .offset(offset);
}

// Get expenses by date range
export async function getExpensesByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses)
    .where(and(
      gte(expenses.expenseDate, startDate),
      lte(expenses.expenseDate, endDate)
    ))
    .orderBy(expenses.expenseDate);
}

// Get expenses by type (material vs operative)
export async function getExpensesByType() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses)
    .where(ne(expenses.expenseType, null))
    .orderBy(expenses.expenseType);
}

// Get expenses by type with summary
export async function getExpensesSummaryByType() {
  const db = await getDb();
  if (!db) return [];
  // Simple aggregation by expenseType
  const allExpenses = await db.select().from(expenses);
  const grouped: any = {};
  for (const exp of allExpenses) {
    const type = exp.expenseType || 'unknown';
    if (!grouped[type]) grouped[type] = { expenseType: type, total: '0', count: 0 };
    grouped[type].total = String(parseFloat(grouped[type].total) + parseFloat(exp.amount || '0'));
    grouped[type].count++;
  }
  return Object.values(grouped);
}

// Get operative expenses summary by category
export async function getOperativeExpensesSummaryByCategory() {
  const db = await getDb();
  if (!db) return [];
  const allExpenses = await db.select().from(expenses)
    .where(eq(expenses.expenseType, 'gasto_operativo'));
  const grouped: any = {};
  for (const exp of allExpenses) {
    const cat = exp.operativeCategory || 'sin_categoría';
    if (!grouped[cat]) grouped[cat] = { operativeCategory: cat, total: '0', count: 0 };
    grouped[cat].total = String(parseFloat(grouped[cat].total) + parseFloat(exp.amount || '0'));
    grouped[cat].count++;
  }
  return Object.values(grouped);
}

// Get project expenses summary
export async function getProjectExpensesSummary() {
  const db = await getDb();
  if (!db) return [];
  const allExpenses = await db.select().from(expenses)
    .where(ne(expenses.projectId, null));
  const grouped: any = {};
  for (const exp of allExpenses) {
    const pid = exp.projectId || 0;
    if (!grouped[pid]) grouped[pid] = { projectId: pid, projectClientName: exp.projectClientName, total: '0', count: 0 };
    grouped[pid].total = String(parseFloat(grouped[pid].total) + parseFloat(exp.amount || '0'));
    grouped[pid].count++;
  }
  return Object.values(grouped);
}

// Get expenses summary by general category
export async function getExpensesSummaryByGeneralCategory() {
  const db = await getDb();
  if (!db) return [];
  const allExpenses = await db.select().from(expenses);
  const grouped: any = {};
  for (const exp of allExpenses) {
    const cat = exp.generalCategory || 'otros';
    if (!grouped[cat]) grouped[cat] = { generalCategory: cat, total: '0', count: 0 };
    grouped[cat].total = String(parseFloat(grouped[cat].total) + parseFloat(exp.amount || '0'));
    grouped[cat].count++;
  }
  return Object.values(grouped);
}

// Alias for getExpensesByProject
export async function getExpensesByProjectId(projectId: number) {
  return getExpensesByProject(projectId);
}

// ============ DATA PROTECTION & AUDIT LOG ============

// Get audit logs for a specific record
export async function getAuditLogsForRecord(recordType: string, recordId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs)
    .where(and(
      eq(auditLogs.recordType, recordType),
      eq(auditLogs.recordId, recordId)
    ))
    .orderBy(auditLogs.timestamp);
}

// Get audit logs by user
export async function getAuditLogsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(auditLogs.timestamp);
}

// Permanently delete a record (hard delete)
export async function permanentlyDeleteRecord(recordType: string, recordId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // This is a placeholder - actual implementation depends on the table structure
  // In a real scenario, you would identify the table and delete from it
  console.log(`[DataProtection] Permanently deleting ${recordType} with id ${recordId}`);
}

// Empty recycle bin (delete all soft-deleted records)
export async function emptyRecycleBin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // This is a placeholder - actual implementation depends on which tables have soft deletes
  console.log("[DataProtection] Emptying recycle bin");
}

// ============ RESTORE FUNCTIONS ============

// Restore a quotation from recycle bin
export async function restoreQuotation(quotationId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(quotations)
    .set({ deletedAt: null })
    .where(eq(quotations.id, quotationId));
  
  // Log to audit log if userId provided
  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "restore",
      recordType: "quotations",
      recordId: quotationId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Restore an appointment from recycle bin
export async function restoreAppointment(appointmentId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(appointments)
    .set({ deletedAt: null })
    .where(eq(appointments.id, appointmentId));
  
  // Log to audit log if userId provided
  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "restore",
      recordType: "appointments",
      recordId: appointmentId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Restore a task from recycle bin
export async function restoreTask(taskId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(tasks)
    .set({ deletedAt: null })
    .where(eq(tasks.id, taskId));
  
  // Log to audit log if userId provided
  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "restore",
      recordType: "tasks",
      recordId: taskId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Restore an expense from recycle bin
export async function restoreExpense(expenseId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(expenses)
    .set({ deletedAt: null })
    .where(eq(expenses.id, expenseId));
  
  // Log to audit log if userId provided
  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "restore",
      recordType: "expenses",
      recordId: expenseId,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============ GET DELETED RECORDS ============

// Get all deleted tasks
export async function getDeletedTasks() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(tasks)
    .where(isNotNull(tasks.deletedAt))
    .orderBy(desc(tasks.deletedAt));
}

// Get all deleted expenses
export async function getDeletedExpenses() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(expenses)
    .where(isNotNull(expenses.deletedAt))
    .orderBy(desc(expenses.deletedAt));
}

// Get all deleted quotations
export async function getDeletedQuotations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(quotations)
    .where(isNotNull(quotations.deletedAt))
    .orderBy(desc(quotations.deletedAt));
}

// Get all deleted appointments
export async function getDeletedAppointments() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(appointments)
    .where(isNotNull(appointments.deletedAt))
    .orderBy(desc(appointments.deletedAt));
}

// Restore a client from recycle bin
export async function restoreClient(clientId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clients)
    .set({ deletedAt: null })
    .where(eq(clients.id, clientId));
  
  // Log to audit log if userId provided
  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "restore",
      recordType: "clients",
      recordId: clientId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Restore a project from recycle bin
export async function restoreProject(projectId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(projects)
    .set({ deletedAt: null })
    .where(eq(projects.id, projectId));
  
  // Log to audit log if userId provided
  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "restore",
      recordType: "projects",
      recordId: projectId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Get all deleted clients
export async function getDeletedClients() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(clients)
    .where(isNotNull(clients.deletedAt))
    .orderBy(desc(clients.deletedAt));
}

// Get all deleted projects
export async function getDeletedProjects() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(projects)
    .where(isNotNull(projects.deletedAt))
    .orderBy(desc(projects.deletedAt));
}

// Delete an advisory request
export async function deleteAdvisoryRequest(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(advisoryRequests)
    .where(eq(advisoryRequests.id, requestId));
}

// Get all deleted quotations

// Get all clients with pagination
export async function getAllClientsPaginated(options?: { page?: number; limit?: number; search?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const limit = options?.limit || 50;
  const page = options?.page || 1;
  const offset = (page - 1) * limit;
  const search = options?.search?.toLowerCase() || "";
  
  let whereConditions = isNull(clients.deletedAt);
  
  if (search) {
    whereConditions = and(
      whereConditions,
      or(
        like(clients.name, `%${search}%`),
        like(clients.email, `%${search}%`),
        like(clients.phone, `%${search}%`)
      )
    );
  }
  
  const data = await db.select()
    .from(clients)
    .where(whereConditions)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(clients.createdAt));
  
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(whereConditions);
  
  const total = countResult[0]?.count || 0;
  
  return { clients: data, total, page, limit };
}

export async function getColombianHolidays(fromYear: number, toYear: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(colombianHolidays)
    .where(and(
      gte(colombianHolidays.year, fromYear),
      lte(colombianHolidays.year, toYear)
    ))
    .orderBy(asc(colombianHolidays.date));
}

export async function createColombianHoliday(data: { date: Date | string; name: string; year: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const dateStr = data.date instanceof Date ? data.date.toISOString() : data.date;
  const [result] = await db.insert(colombianHolidays).values({
    date: dateStr,
    name: data.name,
    year: data.year,
  });
  return (result as any).insertId as number;
}
