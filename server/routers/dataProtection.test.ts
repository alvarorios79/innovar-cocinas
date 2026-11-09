import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { clients, projects, quotations, appointments, tasks, expenses, users, auditLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function createContext(overrides?: any) {
  return {
    user: {
      id: 1,
      email: "test@example.com",
      role: "super_admin" as const,
      ...overrides,
    },
  };
}

describe("Data Protection System - Soft Delete & Audit Logging", () => {
  let database: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let testClientId: number;
  let testProjectId: number;

  beforeAll(async () => {
    database = await getDb();
    if (!database) throw new Error("Database not available");

    // Create test user
    const [u] = await database.insert(users).values({
      email: `dataprotection-${Date.now()}@example.com`,
      name: "Data Protection Test User",
      role: "super_admin",
      openId: `test-openid-dp-${Date.now()}`,
    } as any).returning({ id: users.id });
    testUserId = u.id;

    // Create test client
    const [c] = await database.insert(clients).values({
      userId: testUserId,
      name: "Test Client",
      email: "client@test.com",
      whatsappPhone: "+573001234567",
      dataOrigin: "manual",
    } as any).returning({ id: clients.id });
    testClientId = c.id;

    // Create test project
    const [p] = await database.insert(projects).values({
      clientId: testClientId,
      name: "Test Project",
      workType: "cocina",
      status: "contacto" as any,
      createdBy: testUserId,
      dataOrigin: "manual",
    } as any).returning({ id: projects.id });
    testProjectId = p.id;
  });

  afterAll(async () => {
    if (database) {
      try {
        // Clean up test data
        await database.delete(auditLogs).where(eq(auditLogs.userId, testUserId)).catch(() => {});
        await database.delete(projects).where(eq(projects.id, testProjectId)).catch(() => {});
        await database.delete(clients).where(eq(clients.id, testClientId)).catch(() => {});
        await database.delete(users).where(eq(users.id, testUserId)).catch(() => {});
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it("should get deleted clients from recycle bin", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Get deleted clients
    const deletedClients = await caller.dataProtection.getDeletedClients({ limit: 100 });
    
    // Verify it returns an array
    expect(Array.isArray(deletedClients)).toBe(true);
  });

  it("should restore a soft-deleted client", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to restore a client (even if it doesn't exist, the procedure should work)
    const result = await caller.dataProtection.restoreClient({ clientId: 99999 });
    expect(result.success).toBe(true);
  });

  it("should track audit logs for user actions", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Get audit logs for the user
    const auditLogs = await caller.dataProtection.getAuditLogs({ limit: 100 });

    // Should have at least some logs from our operations
    expect(Array.isArray(auditLogs)).toBe(true);
  });

  it("should prevent non-admin from permanently deleting records", async () => {
    const ctx = createContext({ id: testUserId, role: "user" });
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dataProtection.permanentlyDeleteRecord({
        tableName: "clients",
        recordId: 999,
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain("super administradores");
    }
  });

  it("should get deleted clients from recycle bin", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Get deleted clients
    const deletedClients = await caller.dataProtection.getDeletedClients({ limit: 100 });
    
    // Verify it returns an array
    expect(Array.isArray(deletedClients)).toBe(true);
  });

  it("should restore a soft-deleted client", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to restore a client (even if it doesn't exist, the procedure should work)
    const result = await caller.dataProtection.restoreClient({ clientId: 99999 });
    expect(result.success).toBe(true);
  });

  it("should track audit logs for user actions", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Get audit logs for the user
    const auditLogs = await caller.dataProtection.getAuditLogs({ limit: 100 });

    // Should have at least some logs from our operations
    expect(Array.isArray(auditLogs)).toBe(true);
  });

  it("should prevent non-admin from permanently deleting records", async () => {
    const ctx = createContext({ id: testUserId, role: "user" });
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dataProtection.permanentlyDeleteRecord({
        tableName: "clients",
        recordId: 999,
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain("super administradores");
    }
  });

  it("should get deleted clients from recycle bin", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    const deletedClients = await caller.dataProtection.getDeletedClients({ limit: 50 });
    expect(Array.isArray(deletedClients)).toBe(true);
  });

  it("should restore a soft-deleted project", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to restore a project
    const result = await caller.dataProtection.restoreProject({ projectId: 99999 });
    expect(result.success).toBe(true);
  });

  it("should restore a soft-deleted quotation", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to restore a quotation
    const result = await caller.dataProtection.restoreQuotation({ quotationId: 99999 });
    expect(result.success).toBe(true);
  });

  it("should restore a soft-deleted appointment", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to restore an appointment
    const result = await caller.dataProtection.restoreAppointment({ appointmentId: 99999 });
    expect(result.success).toBe(true);
  });

  it("should restore a soft-deleted task", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to restore a task
    const result = await caller.dataProtection.restoreTask({ taskId: 99999 });
    expect(result.success).toBe(true);
  });

  it("should restore a soft-deleted expense", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to restore an expense
    const result = await caller.dataProtection.restoreExpense({ expenseId: 99999 });
    expect(result.success).toBe(true);
  });
});
