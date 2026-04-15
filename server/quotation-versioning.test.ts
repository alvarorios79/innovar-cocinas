/**
 * Tests para Quotation Versioning Logic
 * Usa db-test.ts para conexión explícita a BD (sin mocks).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, closeTestDb } from "./db-test";
import { quotations, quotationItems, clients, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

import {
  getQuotationVersionInfo,
  getQuotationVersionChain,
  createQuotationVersion,
  lockQuotation,
  unlockQuotation,
  isQuotationLocked,
} from "./quotation-versioning";

let testClientId: number;
let testUserId: number;
let testQuotationId: number;
const createdVersionIds: number[] = [];

describe("Quotation Versioning", () => {
  beforeAll(async () => {
    const db = await getTestDb();

    const clientResult = await db.insert(clients).values({
      name: "Test Client Versioning",
      email: "versioning-test@example.com",
      whatsappPhone: "3001234567",
    });
    testClientId = clientResult[0].insertId;

    const userResult = await db.insert(users).values({
      name: "Test User Versioning",
      email: "versioning-user@example.com",
      openId: `test-versioning-${Date.now()}`,
      role: "admin",
    });
    testUserId = userResult[0].insertId;

    const quotationResult = await db.insert(quotations).values({
      quotationNumber: "QT-VER-001",
      clientId: testClientId,
      vendorName: "Test Vendor",
      productType: "cocina",
      status: "draft",
      subtotal: "1000.00",
      transportCost: "100.00",
      total: "1100.00",
      createdBy: testUserId,
      versionNumber: 1,
      isAdditional: 0,
    });
    testQuotationId = quotationResult[0].insertId;

    await db.insert(quotationItems).values({
      quotationId: testQuotationId,
      itemNumber: 1,
      itemType: "cocina",
      description: "Cocina lineal 3m",
      quantity: "1",
      unitPrice: "1000.00",
      totalPrice: 1000,
    });
  });

  afterAll(async () => {
    const db = await getTestDb();
    try {
      for (const vId of createdVersionIds) {
        await db.delete(quotationItems).where(eq(quotationItems.quotationId, vId));
      }
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, testQuotationId));

      for (const vId of createdVersionIds) {
        await db.delete(quotations).where(eq(quotations.id, vId));
      }
      await db.delete(quotations).where(eq(quotations.id, testQuotationId));

      await db.delete(clients).where(eq(clients.id, testClientId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (err) {
      console.error("[Test Cleanup]", err);
    }
    await closeTestDb();
  });

  // ── getQuotationVersionInfo ──────────────────────────────────

  describe("getQuotationVersionInfo", () => {
    it("should return null for non-existent quotation", async () => {
      const result = await getQuotationVersionInfo(999999);
      expect(result).toBeNull();
    });

    it("should return version info for existing quotation", async () => {
      const result = await getQuotationVersionInfo(testQuotationId);
      expect(result).not.toBeNull();
      expect(result!.versionNumber).toBe(1);
      expect(result!.isAdditional).toBe(0);
      expect(result!.parentQuotationId).toBeNull();
      expect(result!.baseQuotationId).toBeNull();
    });
  });

  // ── createQuotationVersion ───────────────────────────────────

  describe("createQuotationVersion", () => {
    it("should create a new version with incremented version number", async () => {
      const newId = await createQuotationVersion(testQuotationId, testUserId);
      createdVersionIds.push(newId);

      expect(newId).toBeGreaterThan(0);

      const db = await getTestDb();
      const rows = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, newId))
        .limit(1);

      const newQ = rows[0];
      expect(newQ).toBeDefined();
      expect(newQ.versionNumber).toBe(2);
      expect(newQ.parentQuotationId).toBe(testQuotationId);
      expect(newQ.baseQuotationId).toBe(testQuotationId);
      expect(newQ.isAdditional).toBe(1);
      expect(newQ.status).toBe("draft");
    });

    it("should copy items from parent quotation", async () => {
      const newId = await createQuotationVersion(testQuotationId, testUserId);
      createdVersionIds.push(newId);

      const db = await getTestDb();
      const items = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, newId));

      expect(items.length).toBe(1);
      expect(items[0].description).toBe("Cocina lineal 3m");
    });

    it("should throw for non-existent parent", async () => {
      await expect(
        createQuotationVersion(999999, testUserId)
      ).rejects.toThrow("Parent quotation not found");
    });
  });

  // ── getQuotationVersionChain ─────────────────────────────────

  describe("getQuotationVersionChain", () => {
    it("should return chain including base and versions", async () => {
      const chain = await getQuotationVersionChain(testQuotationId);
      expect(chain.length).toBeGreaterThanOrEqual(1);
      expect(chain.some((q) => q.id === testQuotationId)).toBe(true);
    });

    it("should return empty array for non-existent quotation", async () => {
      const chain = await getQuotationVersionChain(999999);
      expect(chain.length).toBe(0);
    });
  });

  // ── lockQuotation ────────────────────────────────────────────

  describe("lockQuotation", () => {
    it("should reject lock if quotation is not approved", async () => {
      await expect(
        lockQuotation(testQuotationId, testUserId)
      ).rejects.toThrow();
    });

    it("should lock an approved quotation", async () => {
      const db = await getTestDb();
      await db
        .update(quotations)
        .set({ status: "approved" })
        .where(eq(quotations.id, testQuotationId));

      await lockQuotation(testQuotationId, testUserId);

      const rows = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, testQuotationId))
        .limit(1);

      expect(rows[0].isLocked).toBe(1);
      expect(rows[0].lockedBy).toBe(testUserId);
      expect(rows[0].lockedAt).not.toBeNull();
    });

    it("should throw for non-existent quotation", async () => {
      await expect(
        lockQuotation(999999, testUserId)
      ).rejects.toThrow("Quotation not found");
    });
  });

  // ── unlockQuotation ──────────────────────────────────────────

  describe("unlockQuotation", () => {
    it("should unlock a locked quotation", async () => {
      const db = await getTestDb();
      await db
        .update(quotations)
        .set({ status: "approved" })
        .where(eq(quotations.id, testQuotationId));
      await lockQuotation(testQuotationId, testUserId);

      await unlockQuotation(testQuotationId);

      const rows = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, testQuotationId))
        .limit(1);

      expect(rows[0].isLocked).toBe(0);
      expect(rows[0].lockedBy).toBeNull();
      expect(rows[0].lockedAt).toBeNull();
    });
  });

  // ── isQuotationLocked ────────────────────────────────────────

  describe("isQuotationLocked", () => {
    it("should return false for unlocked quotation", async () => {
      const db = await getTestDb();
      await db
        .update(quotations)
        .set({ isLocked: 0, lockedBy: null, lockedAt: null })
        .where(eq(quotations.id, testQuotationId));

      const locked = await isQuotationLocked(testQuotationId);
      expect(locked).toBe(false);
    });

    it("should return true for locked quotation", async () => {
      const db = await getTestDb();
      await db
        .update(quotations)
        .set({ status: "approved" })
        .where(eq(quotations.id, testQuotationId));
      await lockQuotation(testQuotationId, testUserId);

      const locked = await isQuotationLocked(testQuotationId);
      expect(locked).toBe(true);
    });
  });
});


  // ── setActiveVersion ─────────────────────────────────────────

  describe("setActiveVersion", () => {
    it("should fail when trying to activate a non-existent quotation", async () => {
      await expect(
        (await import("./quotation-versioning")).setActiveVersion(999999, testUserId)
      ).rejects.toThrow("no encontrada");
    });

    it("should fail when trying to activate the same version that is already active", async () => {
      await expect(
        (await import("./quotation-versioning")).setActiveVersion(testQuotationId, testUserId)
      ).rejects.toThrow("ya es la versión activa");
    });
  });

  // ── deleteVersion ────────────────────────────────────────────

  describe("deleteVersion", () => {
    it("should fail when trying to delete the base version (V1)", async () => {
      await expect(
        (await import("./quotation-versioning")).deleteVersion(testQuotationId, testUserId)
      ).rejects.toThrow("No se puede eliminar la versión base");
    });

    it("should successfully soft-delete a non-base version not linked to a project", async () => {
      const db = await getTestDb();
      
      // Create V2
      const v2Result = await db.insert(quotations).values({
        quotationNumber: "QT-VER-002",
        clientId: testClientId,
        vendorName: "Test Vendor",
        productType: "cocina",
        status: "draft",
        subtotal: "1200.00",
        transportCost: "100.00",
        total: "1300.00",
        createdBy: testUserId,
        versionNumber: 2,
        isAdditional: 1,
        baseQuotationId: testQuotationId,
        parentQuotationId: testQuotationId,
      });
      const v2Id = v2Result[0].insertId;
      createdVersionIds.push(v2Id);

      const result = await (await import("./quotation-versioning")).deleteVersion(v2Id, testUserId);
      expect(result.success).toBe(true);
      expect(result.message).toContain("eliminada");

      // Verify soft delete
      const deleted = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, v2Id))
        .limit(1);
      expect(deleted[0]?.deletedAt).not.toBeNull();
    });
  });
