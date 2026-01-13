import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  clients, 
  InsertClient,
  appointments,
  InsertAppointment,
  advisoryRequests,
  InsertAdvisoryRequest,
  priorEstimates,
  InsertPriorEstimate,
  quotations,
  InsertQuotation
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
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
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

  await db.update(clients).set(data).where(eq(clients.id, id));
}

// ============ APPOINTMENTS ============

export async function createAppointment(appointment: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(appointments).values(appointment);
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

  return await db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(desc(appointments.scheduledDate));
}

export async function getAllAppointments() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(appointments).set(data).where(eq(appointments.id, id));
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
    loginMethod: "manual",
    lastSignedIn: new Date(),
  });
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
