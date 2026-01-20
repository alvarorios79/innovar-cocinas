import { eq, desc, and, gte, lte, gt, between, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  InsertReminder
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      // Solo actualizar rol si se proporciona explícitamente
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      // Asignar rol inicial solo para usuarios nuevos (insert)
      values.role = 'super_admin';
      // NO incluir en updateSet para no sobrescribir rol existente
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CLIENTS ============

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(clients).values(client);
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

export async function getClientByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filtrar valores undefined para evitar error "No values to set"
  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  
  if (Object.keys(filteredData).length === 0) {
    return; // No hay nada que actualizar
  }

  await db.update(clients).set(filteredData).where(eq(clients.id, id));
}

// ============ APPOINTMENTS ============

export async function createAppointment(appointment: InsertAppointment & { workTypes?: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workTypes, ...appointmentData } = appointment;
  const result = await db.insert(appointments).values(appointmentData);
  const appointmentId = result[0].insertId;
  
  // Si se proporcionan workTypes, crear los registros relacionados
  if (workTypes && workTypes.length > 0) {
    await Promise.all(
      workTypes.map(workType =>
        db.insert(appointmentWorkTypes).values({
          appointmentId,
          workType: workType as "cocina" | "closet" | "puertas" | "centro_tv"
        })
      )
    );
  }
  
  return appointmentId;
}

export async function createAppointmentWorkType(appointmentWorkType: InsertAppointmentWorkType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(appointmentWorkTypes).values(appointmentWorkType);
  return result[0].insertId;
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAppointmentsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  const appointmentsList = await db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(desc(appointments.scheduledDate));
  
  // Para cada cita, obtener sus workTypes
  const appointmentsWithWorkTypes = await Promise.all(
    appointmentsList.map(async (appointment) => {
      const workTypes = await db.select().from(appointmentWorkTypes).where(eq(appointmentWorkTypes.appointmentId, appointment.id));
      return {
        ...appointment,
        workTypes: workTypes.map(wt => wt.workType)
      };
    })
  );
  
  return appointmentsWithWorkTypes;
}

export async function getAllAppointments() {
  const db = await getDb();
  if (!db) return [];

  const appointmentsList = await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  
  // Para cada cita, obtener sus workTypes
  const appointmentsWithWorkTypes = await Promise.all(
    appointmentsList.map(async (appointment) => {
      const workTypes = await db.select().from(appointmentWorkTypes).where(eq(appointmentWorkTypes.appointmentId, appointment.id));
      return {
        ...appointment,
        workTypes: workTypes.map(wt => wt.workType)
      };
    })
  );
  
  return appointmentsWithWorkTypes;
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(appointments).set(data).where(eq(appointments.id, id));
}

/**
 * Verifica si ya existe una cita en la fecha/hora especificada (excluyendo citas canceladas)
 */
export async function isTimeSlotAvailable(scheduledDate: Date): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // Si no hay DB, permitir (fallback)

  const result = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.scheduledDate, scheduledDate),
        // Excluir citas canceladas
        eq(appointments.status, "pendiente") // Solo considerar pendientes
      )
    )
    .limit(1);

  return result.length === 0; // Disponible si no hay resultados
}

/**
 * Obtiene todas las citas de un día específico (excluyendo canceladas)
 */
export async function getAppointmentsByDate(date: Date) {
  const db = await getDb();
  if (!db) return [];

  // Inicio y fin del día
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await db
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.scheduledDate, startOfDay),
        lte(appointments.scheduledDate, endOfDay),
        // Excluir canceladas
        eq(appointments.status, "pendiente")
      )
    )
    .orderBy(appointments.scheduledDate);
}

// ============ ADVISORY REQUESTS ============

export async function createAdvisoryRequest(request: InsertAdvisoryRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(advisoryRequests).values(request);
  return result[0].insertId;
}

export async function getAdvisoryRequestsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(advisoryRequests).where(eq(advisoryRequests.clientId, clientId)).orderBy(desc(advisoryRequests.createdAt));
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

export async function getPriorEstimatesByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(priorEstimates).where(eq(priorEstimates.clientId, clientId)).orderBy(desc(priorEstimates.createdAt));
}

// ============ QUOTATIONS ============

export async function createQuotation(quotation: InsertQuotation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(quotations).values(quotation);
  return result[0].insertId;
}

export async function getQuotationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuotationsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(quotations).where(eq(quotations.clientId, clientId)).orderBy(desc(quotations.createdAt));
}

export async function getAllQuotations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(quotations).orderBy(desc(quotations.createdAt));
}

export async function updateQuotation(id: number, data: Partial<InsertQuotation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quotations).set(data).where(eq(quotations.id, id));
}

export async function getNextQuotationNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener el último número de cotización
  const lastQuotation = await db
    .select({ quotationNumber: quotations.quotationNumber })
    .from(quotations)
    .orderBy(desc(quotations.id))
    .limit(1);

  if (lastQuotation.length === 0) {
    // Primera cotización
    return "COT-2026-620";
  }

  // Extraer el número de la última cotización (COT-2026-620 -> 620)
  const lastNumber = parseInt(lastQuotation[0].quotationNumber.split("-")[2]);
  const nextNumber = lastNumber + 1;
  
  return `COT-2026-${nextNumber}`;
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

  return await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, quotationId))
    .orderBy(quotationItems.itemNumber);
}

export async function deleteQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
}

// User management functions
export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  try {
    const allUsers = await db.select().from(users);
    return allUsers;
  } catch (error) {
    console.error("[Database] Failed to get users:", error);
    return [];
  }
}

export async function updateUserRole(userId: number, newRole: "user" | "admin" | "super_admin") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user role: database not available");
    throw new Error("Database not available");
  }

  try {
    await db.update(users)
      .set({ role: newRole })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user role:", error);
    throw error;
  }
}

export async function createUser(userData: {
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  passwordHash?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Generate a unique openId for manually created users
  const openId = `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  await db.insert(users).values({
    openId,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    loginMethod: userData.passwordHash ? "password" : "manual",
    passwordHash: userData.passwordHash,
    lastSignedIn: new Date(),
  });
}

export async function updateUserLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

export async function deleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to delete user:", error);
    throw error;
  }
}

// ============ DELETE FUNCTIONS ============

export async function deleteAppointment(appointmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(appointments).where(eq(appointments.id, appointmentId));
  } catch (error) {
    console.error("[Database] Failed to delete appointment:", error);
    throw error;
  }
}

export async function deleteAdvisoryRequest(advisoryId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(advisoryRequests).where(eq(advisoryRequests.id, advisoryId));
  } catch (error) {
    console.error("[Database] Failed to delete advisory request:", error);
    throw error;
  }
}

export async function deleteQuotation(quotationId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(quotations).where(eq(quotations.id, quotationId));
  } catch (error) {
    console.error("[Database] Failed to delete quotation:", error);
    throw error;
  }
}

export async function deleteClient(clientId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(clients).where(eq(clients.id, clientId));
  } catch (error) {
    console.error("[Database] Failed to delete client:", error);
    throw error;
  }
}


// ============ PROJECTS ============

import { 
  projects, 
  InsertProject, 
  projectPhotos, 
  InsertProjectPhoto,
  projectDetails,
  InsertProjectDetail,
  tasks,
  InsertTask,
  projectStatusHistory,
  InsertProjectStatusHistory
} from "../drizzle/schema";

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(project);
  return result[0].insertId;
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects)
    .where(eq(projects.status, status as any))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects)
    .where(eq(projects.clientId, clientId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectsByDesignerId(designerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects)
    .where(eq(projects.designerId, designerId))
    .orderBy(desc(projects.createdAt));
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projects).where(eq(projects.id, id));
}

// ============ PROJECT PHOTOS ============

export async function createProjectPhoto(photo: InsertProjectPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectPhotos).values(photo);
  return result[0].insertId;
}

export async function getProjectPhotosByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projectPhotos)
    .where(eq(projectPhotos.projectId, projectId))
    .orderBy(desc(projectPhotos.createdAt));
}

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

export async function deleteProjectPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projectPhotos).where(eq(projectPhotos.id, id));
}

// ============ PROJECT DETAILS ============

export async function createProjectDetail(detail: InsertProjectDetail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectDetails).values(detail);
  return result[0].insertId;
}

export async function getProjectDetailsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projectDetails)
    .where(eq(projectDetails.projectId, projectId))
    .orderBy(desc(projectDetails.createdAt));
}

export async function updateProjectDetail(id: number, data: Partial<InsertProjectDetail>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projectDetails).set(data).where(eq(projectDetails.id, id));
}

export async function deleteProjectDetail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projectDetails).where(eq(projectDetails.id, id));
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

export async function getTasksByAssignedTo(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tasks)
    .where(eq(tasks.assignedTo, userId))
    .orderBy(desc(tasks.createdAt));
}

export async function getTasksByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.createdAt));
}

export async function getAllTasks() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
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

// ============ PROJECT STATUS HISTORY ============

export async function createProjectStatusHistory(history: InsertProjectStatusHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectStatusHistory).values(history);
  return result[0].insertId;
}

export async function getProjectStatusHistoryByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projectStatusHistory)
    .where(eq(projectStatusHistory.projectId, projectId))
    .orderBy(desc(projectStatusHistory.createdAt));
}

// ============ HELPER: Update user role with new roles ============

export async function updateUserRoleExtended(userId: number, newRole: "user" | "admin" | "super_admin" | "disenador" | "jefe_taller" | "operario") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users)
    .set({ role: newRole })
    .where(eq(users.id, userId));
  return true;
}

export async function createUserExtended(userData: {
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin" | "disenador" | "jefe_taller" | "operario";
  passwordHash?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const openId = `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const result = await db.insert(users).values({
    openId,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    loginMethod: userData.passwordHash ? "password" : "manual",
    passwordHash: userData.passwordHash,
    lastSignedIn: new Date(),
  });

  return result[0].insertId;
}

// ============ GET USERS BY ROLE ============

export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users)
    .where(eq(users.role, role as any))
    .orderBy(users.name);
}

// ============ PASSWORD RESET ============

export async function setPasswordResetToken(userId: number, token: string, expires: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ 
      passwordResetToken: token,
      passwordResetExpires: expires 
    })
    .where(eq(users.id, userId));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users)
    .where(and(
      eq(users.passwordResetToken, token),
      gt(users.passwordResetExpires, new Date())
    ))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ 
      passwordHash,
      loginMethod: "password"
    })
    .where(eq(users.id, userId));
}

export async function clearPasswordResetToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ 
      passwordResetToken: null,
      passwordResetExpires: null 
    })
    .where(eq(users.id, userId));
}


// ============ PUSH SUBSCRIPTIONS ============

import { 
  pushSubscriptions, 
  InsertPushSubscription,
  notifications,
  InsertNotification
} from "../drizzle/schema";

export async function createPushSubscription(subscription: InsertPushSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar si ya existe una suscripción con el mismo endpoint para este usuario
  const existing = await db.select().from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, subscription.userId),
      eq(pushSubscriptions.endpoint, subscription.endpoint)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Actualizar la existente
    await db.update(pushSubscriptions)
      .set({ p256dh: subscription.p256dh, auth: subscription.auth, userAgent: subscription.userAgent })
      .where(eq(pushSubscriptions.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(pushSubscriptions).values(subscription);
  return result[0].insertId;
}

export async function getPushSubscriptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pushSubscriptions);
}

// ============ NOTIFICATIONS ============

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(notification);
  return result[0].insertId;
}

export async function getNotificationsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationsCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.read, false)
    ));

  return result[0]?.count || 0;
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
}

export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notifications).where(eq(notifications.id, id));
}

export async function updateNotificationPushSent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ sentPush: true }).where(eq(notifications.id, id));
}

// ============ COLOMBIAN HOLIDAYS ============

export async function createColombianHoliday(holiday: InsertColombianHoliday) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(colombianHolidays).values(holiday);
  return result[0].insertId;
}

export async function getColombianHolidays(yearStart: number, yearEnd: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(colombianHolidays)
    .where(and(
      gte(colombianHolidays.year, yearStart),
      lte(colombianHolidays.year, yearEnd)
    ))
    .orderBy(colombianHolidays.date);
}

export async function getColombianHolidaysByYear(year: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(colombianHolidays)
    .where(eq(colombianHolidays.year, year))
    .orderBy(colombianHolidays.date);
}

// ============ REMINDERS ============

export async function createReminder(reminder: InsertReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reminders).values(reminder);
  return result[0].insertId;
}

export async function getRemindersByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(reminders)
    .where(eq(reminders.projectId, projectId))
    .orderBy(desc(reminders.dueDate));
}

export async function getRemindersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(reminders)
    .where(eq(reminders.assignedTo, userId))
    .orderBy(reminders.dueDate);
}

export async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  return await db.select().from(reminders)
    .where(and(
      eq(reminders.status, "pendiente"),
      lte(reminders.dueDate, now)
    ))
    .orderBy(reminders.dueDate);
}

export async function updateReminderStatus(id: number, status: "pendiente" | "enviado" | "completado" | "cancelado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: { status: typeof status; sentAt?: Date } = { status };
  if (status === "enviado") {
    updateData.sentAt = new Date();
  }

  await db.update(reminders).set(updateData).where(eq(reminders.id, id));
}

export async function deleteReminder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(reminders).where(eq(reminders.id, id));
}

export async function cancelProjectReminders(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reminders)
    .set({ status: "cancelado" })
    .where(and(
      eq(reminders.projectId, projectId),
      eq(reminders.status, "pendiente")
    ));
}


// ============ HARDWARE CATALOG ============

import { 
  hardwareCatalog, 
  projectMaterials, 
  projectHardwareSelections 
} from "../drizzle/schema";

export async function getHardwareCatalog(category?: "cocinas" | "closets" | "puertas") {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return await db.select().from(hardwareCatalog)
      .where(and(
        eq(hardwareCatalog.category, category),
        eq(hardwareCatalog.active, true)
      ))
      .orderBy(hardwareCatalog.sortOrder, hardwareCatalog.name);
  }

  return await db.select().from(hardwareCatalog)
    .where(eq(hardwareCatalog.active, true))
    .orderBy(hardwareCatalog.category, hardwareCatalog.sortOrder, hardwareCatalog.name);
}

export async function createHardwareItem(item: {
  category: "cocinas" | "closets" | "puertas";
  name: string;
  description?: string;
  options?: string;
  photoUrl?: string;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(hardwareCatalog).values({
    category: item.category,
    name: item.name,
    description: item.description,
    options: item.options,
    photoUrl: item.photoUrl,
    sortOrder: item.sortOrder || 0,
    active: true,
  });
  return result[0].insertId;
}

export async function updateHardwareItem(id: number, data: {
  name?: string;
  description?: string;
  options?: string;
  photoUrl?: string;
  sortOrder?: number;
  active?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(hardwareCatalog).set(data).where(eq(hardwareCatalog.id, id));
}

export async function deleteHardwareItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete - just mark as inactive
  await db.update(hardwareCatalog).set({ active: false }).where(eq(hardwareCatalog.id, id));
}

// ============ PROJECT MATERIALS ============

export async function getProjectMaterials(projectId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(projectMaterials)
    .where(eq(projectMaterials.projectId, projectId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function saveProjectMaterials(projectId: number, data: {
  woodType?: "rh" | "estandar";
  woodColor?: string;
  woodPhotoUrl?: string;
  countertopType?: "granito" | "cuarzo" | "sinterizado";
  countertopName?: string;
  countertopPhotoUrl?: string;
  sinkMeasure?: string;
  sinkPhotoUrl?: string;
  notes?: string;
}, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if materials already exist for this project
  const existing = await db.select().from(projectMaterials)
    .where(eq(projectMaterials.projectId, projectId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(projectMaterials)
      .set(data)
      .where(eq(projectMaterials.projectId, projectId));
    return existing[0].id;
  } else {
    // Create new
    const result = await db.insert(projectMaterials).values({
      projectId,
      ...data,
      createdBy,
    });
    return result[0].insertId;
  }
}

// ============ PROJECT HARDWARE SELECTIONS ============

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
    hardware: {
      id: hardwareCatalog.id,
      category: hardwareCatalog.category,
      name: hardwareCatalog.name,
      description: hardwareCatalog.description,
      options: hardwareCatalog.options,
      photoUrl: hardwareCatalog.photoUrl,
    }
  })
    .from(projectHardwareSelections)
    .innerJoin(hardwareCatalog, eq(projectHardwareSelections.hardwareId, hardwareCatalog.id))
    .where(eq(projectHardwareSelections.projectId, projectId));
}

export async function addProjectHardwareSelection(
  projectId: number, 
  hardwareId: number, 
  selectedOption?: string, 
  notes?: string,
  createdBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already selected
  const existing = await db.select().from(projectHardwareSelections)
    .where(and(
      eq(projectHardwareSelections.projectId, projectId),
      eq(projectHardwareSelections.hardwareId, hardwareId)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing selection
    await db.update(projectHardwareSelections)
      .set({ selectedOption, notes })
      .where(eq(projectHardwareSelections.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(projectHardwareSelections).values({
    projectId,
    hardwareId,
    selectedOption,
    notes,
    createdBy: createdBy || 0,
  });
  return result[0].insertId;
}

export async function removeProjectHardwareSelection(projectId: number, hardwareId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projectHardwareSelections)
    .where(and(
      eq(projectHardwareSelections.projectId, projectId),
      eq(projectHardwareSelections.hardwareId, hardwareId)
    ));
}
