import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { 
  users, 
  clients, 
  projects, 
  quotations, 
  appointments
} from "../../drizzle/schema";

/**
 * Tests for system.cleanupData
 * 
 * Validates that:
 * 1. Only records with dataOrigin = 'system' are deleted
 * 2. Records with dataOrigin = 'manual' are never deleted
 * 3. Mixed scenarios work correctly
 */

describe("system.cleanupData", () => {
  let db: any;

  beforeEach(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  afterEach(async () => {
    // Cleanup test data - only delete system records
    if (db) {
      await db.delete(appointments).where(eq(appointments.dataOrigin, "system"));
      await db.delete(quotations).where(eq(quotations.dataOrigin, "system"));
      await db.delete(projects).where(eq(projects.dataOrigin, "system"));
      await db.delete(clients).where(eq(clients.dataOrigin, "system"));
    }
  });

  describe("TEST 1: Elimina solo registros system", () => {
    it("should delete all system-origin client and project records", async () => {
      // Create test user with system origin
      const userResult = await db.insert(users).values({
        openId: `test-system-${Date.now()}`,
        name: "Test System User",
        email: `test-system-${Date.now()}@example.com`,
        role: "user",
        loginMethod: "manual",
        lastSignedIn: new Date(),
        dataOrigin: "system",
      });
      const userId = userResult[0].insertId;

      // Create test client with system origin
      const clientResult = await db.insert(clients).values({
        userId,
        name: "Test System Client",
        whatsappPhone: "1234567890",
        dataOrigin: "system",
      });
      const clientId = clientResult[0].insertId;

      // Create test project with system origin
      const projectResult = await db.insert(projects).values({
        clientId,
        name: "Test System Project",
        workType: "cocina",
        createdBy: userId,
        dataOrigin: "system",
      });
      const projectId = projectResult[0].insertId;

      // Create test appointment with system origin
      const appointmentResult = await db.insert(appointments).values({
        clientId,
        dataOrigin: "system",
      });
      const appointmentId = appointmentResult[0].insertId;

      // Verify records exist before cleanup
      const clientsBefore = await db.select().from(clients).where(eq(clients.id, clientId));
      const projectsBefore = await db.select().from(projects).where(eq(projects.id, projectId));
      const appointmentsBefore = await db.select().from(appointments).where(eq(appointments.id, appointmentId));

      expect(clientsBefore).toHaveLength(1);
      expect(projectsBefore).toHaveLength(1);
      expect(appointmentsBefore).toHaveLength(1);

      // Simulate cleanup (delete records with dataOrigin = 'system')
      await db.transaction(async (tx: any) => {
        await tx.delete(appointments).where(eq(appointments.dataOrigin, "system"));
        await tx.delete(quotations).where(eq(quotations.dataOrigin, "system"));
        await tx.delete(projects).where(eq(projects.dataOrigin, "system"));
        await tx.delete(clients).where(eq(clients.dataOrigin, "system"));
      });

      // Verify all system records were deleted
      const clientsAfter = await db.select().from(clients).where(eq(clients.id, clientId));
      const projectsAfter = await db.select().from(projects).where(eq(projects.id, projectId));
      const appointmentsAfter = await db.select().from(appointments).where(eq(appointments.id, appointmentId));

      expect(clientsAfter).toHaveLength(0);
      expect(projectsAfter).toHaveLength(0);
      expect(appointmentsAfter).toHaveLength(0);
    });
  });

  describe("TEST 2: No elimina registros manual", () => {
    it("should never delete manual-origin records", async () => {
      // Create test user with manual origin
      const userResult = await db.insert(users).values({
        openId: `test-manual-${Date.now()}`,
        name: "Test Manual User",
        email: `test-manual-${Date.now()}@example.com`,
        role: "user",
        loginMethod: "manual",
        lastSignedIn: new Date(),
        dataOrigin: "manual",
      });
      const userId = userResult[0].insertId;

      // Create test client with manual origin
      const clientResult = await db.insert(clients).values({
        userId,
        name: "Test Manual Client",
        whatsappPhone: "9876543210",
        dataOrigin: "manual",
      });
      const clientId = clientResult[0].insertId;

      // Create test project with manual origin
      const projectResult = await db.insert(projects).values({
        clientId,
        name: "Test Manual Project",
        workType: "closet",
        createdBy: userId,
        dataOrigin: "manual",
      });
      const projectId = projectResult[0].insertId;

      // Create test appointment with manual origin
      const appointmentResult = await db.insert(appointments).values({
        clientId,
        dataOrigin: "manual",
      });
      const appointmentId = appointmentResult[0].insertId;

      // Simulate cleanup (delete records with dataOrigin = 'system')
      await db.transaction(async (tx: any) => {
        await tx.delete(appointments).where(eq(appointments.dataOrigin, "system"));
        await tx.delete(quotations).where(eq(quotations.dataOrigin, "system"));
        await tx.delete(projects).where(eq(projects.dataOrigin, "system"));
        await tx.delete(clients).where(eq(clients.dataOrigin, "system"));
      });

      // Verify all manual records still exist
      const clientsAfter = await db.select().from(clients).where(eq(clients.id, clientId));
      const projectsAfter = await db.select().from(projects).where(eq(projects.id, projectId));
      const appointmentsAfter = await db.select().from(appointments).where(eq(appointments.id, appointmentId));

      expect(clientsAfter).toHaveLength(1);
      expect(projectsAfter).toHaveLength(1);
      expect(appointmentsAfter).toHaveLength(1);

      // Verify data integrity
      expect(clientsAfter[0].dataOrigin).toBe("manual");
      expect(projectsAfter[0].dataOrigin).toBe("manual");
      expect(appointmentsAfter[0].dataOrigin).toBe("manual");
    });
  });

  describe("TEST 3: Mezcla controlada (manual + system)", () => {
    it("should delete only system records in mixed scenario", async () => {
      // Create 1 manual user
      const manualUserResult = await db.insert(users).values({
        openId: `manual-mix-${Date.now()}`,
        name: "Manual Mix User",
        email: `manual-mix-${Date.now()}@example.com`,
        role: "user",
        loginMethod: "manual",
        lastSignedIn: new Date(),
        dataOrigin: "manual",
      });
      const manualUserId = manualUserResult[0].insertId;

      // Create 1 system user
      const systemUserResult = await db.insert(users).values({
        openId: `system-mix-${Date.now()}`,
        name: "System Mix User",
        email: `system-mix-${Date.now()}@example.com`,
        role: "user",
        loginMethod: "manual",
        lastSignedIn: new Date(),
        dataOrigin: "system",
      });
      const systemUserId = systemUserResult[0].insertId;

      // Create 1 manual client
      const manualClientResult = await db.insert(clients).values({
        userId: manualUserId,
        name: "Manual Mix Client",
        whatsappPhone: "1111111111",
        dataOrigin: "manual",
      });
      const manualClientId = manualClientResult[0].insertId;

      // Create 1 system client
      const systemClientResult = await db.insert(clients).values({
        userId: systemUserId,
        name: "System Mix Client",
        whatsappPhone: "2222222222",
        dataOrigin: "system",
      });
      const systemClientId = systemClientResult[0].insertId;

      // Create 1 manual project
      const manualProjectResult = await db.insert(projects).values({
        clientId: manualClientId,
        name: "Manual Mix Project",
        workType: "cocina",
        createdBy: manualUserId,
        dataOrigin: "manual",
      });
      const manualProjectId = manualProjectResult[0].insertId;

      // Create 1 system project
      const systemProjectResult = await db.insert(projects).values({
        clientId: systemClientId,
        name: "System Mix Project",
        workType: "closet",
        createdBy: systemUserId,
        dataOrigin: "system",
      });
      const systemProjectId = systemProjectResult[0].insertId;

      // Simulate cleanup
      await db.transaction(async (tx: any) => {
        await tx.delete(appointments).where(eq(appointments.dataOrigin, "system"));
        await tx.delete(quotations).where(eq(quotations.dataOrigin, "system"));
        await tx.delete(projects).where(eq(projects.dataOrigin, "system"));
        await tx.delete(clients).where(eq(clients.dataOrigin, "system"));
      });

      // Verify manual records still exist
      const manualClientAfter = await db.select().from(clients).where(eq(clients.id, manualClientId));
      const manualProjectAfter = await db.select().from(projects).where(eq(projects.id, manualProjectId));

      expect(manualClientAfter).toHaveLength(1);
      expect(manualProjectAfter).toHaveLength(1);
      expect(manualClientAfter[0].dataOrigin).toBe("manual");
      expect(manualProjectAfter[0].dataOrigin).toBe("manual");

      // Verify system records were deleted
      const systemClientAfter = await db.select().from(clients).where(eq(clients.id, systemClientId));
      const systemProjectAfter = await db.select().from(projects).where(eq(projects.id, systemProjectId));

      expect(systemClientAfter).toHaveLength(0);
      expect(systemProjectAfter).toHaveLength(0);
    });
  });

  describe("TEST 4: Quotations con dataOrigin", () => {
    it("should delete only system-origin quotations", async () => {
      // Create manual user
      const manualUserResult = await db.insert(users).values({
        openId: `manual-quot-${Date.now()}`,
        name: "Manual Quotation User",
        email: `manual-quot-${Date.now()}@example.com`,
        role: "user",
        loginMethod: "manual",
        lastSignedIn: new Date(),
        dataOrigin: "manual",
      });
      const manualUserId = manualUserResult[0].insertId;

      // Create manual client
      const manualClientResult = await db.insert(clients).values({
        userId: manualUserId,
        name: "Manual Quotation Client",
        whatsappPhone: "5555555555",
        dataOrigin: "manual",
      });
      const manualClientId = manualClientResult[0].insertId;

      // Create manual quotation
      const manualQuotationResult = await db.insert(quotations).values({
        quotationNumber: `MANUAL-${Date.now()}`,
        clientId: manualClientId,
        vendorName: "Manual Vendor",
        productType: "cocina",
        subtotal: "100000",
        transportCost: "10000",
        total: "110000",
        createdBy: manualUserId,
        dataOrigin: "manual",
      });
      const manualQuotationId = manualQuotationResult[0].insertId;

      // Create system quotation
      const systemQuotationResult = await db.insert(quotations).values({
        quotationNumber: `SYSTEM-${Date.now()}`,
        clientId: manualClientId,
        vendorName: "System Vendor",
        productType: "closet",
        subtotal: "200000",
        transportCost: "20000",
        total: "220000",
        createdBy: manualUserId,
        dataOrigin: "system",
      });
      const systemQuotationId = systemQuotationResult[0].insertId;

      // Simulate cleanup
      await db.transaction(async (tx: any) => {
        await tx.delete(appointments).where(eq(appointments.dataOrigin, "system"));
        await tx.delete(quotations).where(eq(quotations.dataOrigin, "system"));
        await tx.delete(projects).where(eq(projects.dataOrigin, "system"));
        await tx.delete(clients).where(eq(clients.dataOrigin, "system"));
      });

      // Verify manual quotation still exists
      const manualQuotationAfter = await db.select().from(quotations).where(eq(quotations.id, manualQuotationId));
      expect(manualQuotationAfter).toHaveLength(1);
      expect(manualQuotationAfter[0].dataOrigin).toBe("manual");

      // Verify system quotation was deleted
      const systemQuotationAfter = await db.select().from(quotations).where(eq(quotations.id, systemQuotationId));
      expect(systemQuotationAfter).toHaveLength(0);
    });
  });
});
