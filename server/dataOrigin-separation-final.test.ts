import { describe, it, expect } from "vitest";
import * as db from "./db";

/**
 * Final dataOrigin Separation Validation Test
 * 
 * Validates that all operational queries properly filter by dataOrigin='manual'
 * and exclude system data (dataOrigin='system')
 */

describe("DataOrigin Separation - Final Validation", () => {
  describe("Operational modules filter correctly by dataOrigin='manual'", () => {
    it("getAllClients filters by dataOrigin='manual'", async () => {
      const allClients = await db.getAllClients();
      const hasOnlyManualData = allClients.every(c => c.dataOrigin === "manual");
      expect(hasOnlyManualData).toBe(true);
    });

    it("getAllQuotations filters by dataOrigin='manual'", async () => {
      const allQuotations = await db.getAllQuotations();
      const hasOnlyManualData = allQuotations.every(q => q.dataOrigin === "manual");
      expect(hasOnlyManualData).toBe(true);
    });

    it("getAllAppointments filters by dataOrigin='manual'", async () => {
      const allAppointments = await db.getAllAppointments();
      const hasOnlyManualData = allAppointments.every(a => a.dataOrigin === "manual");
      expect(hasOnlyManualData).toBe(true);
    });

    it("getAllTasks filters by dataOrigin='manual'", async () => {
      const allTasks = await db.getAllTasks();
      const hasOnlyManualData = allTasks.every(t => t.dataOrigin === "manual");
      expect(hasOnlyManualData).toBe(true);
    });

    it("getAllExpenses does not filter by dataOrigin (table has no dataOrigin field)", async () => {
      // La tabla expenses no tiene campo dataOrigin - se valida que devuelve un array
      const allExpenses = await db.getAllExpenses();
      expect(Array.isArray(allExpenses)).toBe(true);
    });
  });

  describe("Paginated queries also filter by dataOrigin='manual'", () => {
    it("getAllTasksPaginated filters by dataOrigin='manual'", async () => {
      const result = await db.getAllTasksPaginated({ page: 1, limit: 100 });
      const hasOnlyManualData = result.data.every(t => t.dataOrigin === "manual");
      expect(hasOnlyManualData).toBe(true);
    });

    it("getAllExpensesPaginated returns paginated results (no dataOrigin field in expenses)", async () => {
      // La tabla expenses no tiene campo dataOrigin - se valida que devuelve estructura paginada
      const result = await db.getAllExpensesPaginated({ page: 1, limit: 100 });
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe("number");
    });
  });

  describe("Data creation enforces correct dataOrigin", () => {
    it("createClient with dataOrigin='manual' creates manual data", async () => {
      const testClient = await db.createClient(
        {
          name: "DataOrigin Test Client",
          email: `test-${Date.now()}@example.com`,
          whatsappPhone: "+573001234567",
        },
        "manual"
      );
      const client = await db.getClientById(testClient);
      expect(client?.dataOrigin).toBe("manual");
    });

    it("createClient with dataOrigin='system' creates system data", async () => {
      const testClient = await db.createClient(
        {
          name: "DataOrigin System Test Client",
          email: `system-test-${Date.now()}@example.com`,
          whatsappPhone: "+573009876543",
        },
        "system"
      );
      const client = await db.getClientById(testClient);
      expect(client?.dataOrigin).toBe("system");
    });
  });
});
