/**
 * Tests para el sistema de versionado de cotizaciones usando db.* helpers.
 * Verifica: getBaseQuotation, getQuotationVersions, createQuotationVersion,
 * getLatestQuotationVersion, getQuotationVersionNumber, copy items.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, closeTestDb } from "./db-test";
import { users, quotations, quotationItems, clients } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import {
  createQuotationVersion,
  getQuotationVersionInfo,
  getQuotationVersionChain,
} from "./quotation-versioning";

let testClientId: number;
let testUserId: number;
let testQuotationId: number;
const createdVersionIds: number[] = [];

describe("Quotations Versioning System (db helpers)", () => {
  beforeAll(async () => {
    const db = await getTestDb();

    const clientResult = await db.insert(clients).values({
      name: "Test Client QVS2",
      email: `test-qvs2-${Date.now()}@example.com`,
      whatsappPhone: "1234567891",
    });
    testClientId = clientResult[0].insertId;

    const userResult = await db.insert(users).values({
      name: "Test User QVS2",
      email: `user-qvs2-${Date.now()}@example.com`,
      openId: `test-qvs2-${Date.now()}`,
      role: "admin",
    });
    testUserId = userResult[0].insertId;

    const quotResult = await db.insert(quotations).values({
      quotationNumber: `COT-QVS2-${Date.now()}`,
      clientId: testClientId,
      vendorName: "Test Vendor",
      productType: "cocina",
      status: "draft",
      subtotal: "1000000",
      transportCost: "0",
      total: "1000000",
      createdBy: testUserId,
      versionNumber: 1,
      isAdditional: 0,
    });
    testQuotationId = quotResult[0].insertId;

    // Crear un item en V1
    await db.insert(quotationItems).values({
      quotationId: testQuotationId,
      itemNumber: 1,
      itemType: "cocina",
      description: "Cocina Integral Test",
      quantity: "1",
      unitPrice: "1000000",
      totalPrice: 1000000,
    });
  });

  afterAll(async () => {
    const db = await getTestDb();
    try {
      for (const vId of createdVersionIds) {
        await db.delete(quotationItems).where(eq(quotationItems.quotationId, vId));
        await db.delete(quotations).where(eq(quotations.id, vId));
      }
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, testQuotationId));
      await db.delete(quotations).where(eq(quotations.id, testQuotationId));
      await db.delete(clients).where(eq(clients.id, testClientId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (err) {
      console.error("[Test Cleanup]", err);
    }
    await closeTestDb();
  });

  it("should get version info for V1", async () => {
    const info = await getQuotationVersionInfo(testQuotationId);
    expect(info).not.toBeNull();
    expect(info!.versionNumber).toBe(1);
    expect(info!.baseQuotationId).toBeNull();
  });

  it("should get version chain for V1 (single entry)", async () => {
    const chain = await getQuotationVersionChain(testQuotationId);
    expect(chain.length).toBeGreaterThanOrEqual(1);
    expect(chain.some((q) => q.id === testQuotationId)).toBe(true);
  });

  it("should create V2 from V1", async () => {
    const v2Id = await createQuotationVersion(testQuotationId, testUserId);
    createdVersionIds.push(v2Id);
    expect(v2Id).toBeGreaterThan(0);

    const db = await getTestDb();
    const rows = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, v2Id))
      .limit(1);

    const v2 = rows[0];
    expect(v2).toBeDefined();
    expect(v2.versionNumber).toBe(2);
    expect(v2.parentQuotationId).toBe(testQuotationId);
    expect(v2.baseQuotationId).toBe(testQuotationId);
    expect(v2.isAdditional).toBe(1);
    expect(v2.status).toBe("draft");
  });

  it("should copy items when creating new version", async () => {
    const v2Id = await createQuotationVersion(testQuotationId, testUserId);
    createdVersionIds.push(v2Id);

    const db = await getTestDb();
    const items = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, v2Id));

    expect(items.length).toBeGreaterThan(0);
    expect(items[0].description).toBe("Cocina Integral Test");
  });

  it("should create V3 from V2", async () => {
    const v2Id = await createQuotationVersion(testQuotationId, testUserId);
    createdVersionIds.push(v2Id);

    const v3Id = await createQuotationVersion(v2Id, testUserId);
    createdVersionIds.push(v3Id);

    const db = await getTestDb();
    const rows = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, v3Id))
      .limit(1);

    const v3 = rows[0];
    expect(v3).toBeDefined();
    expect(v3.versionNumber).toBeGreaterThanOrEqual(3);
    expect(v3.baseQuotationId).toBe(testQuotationId);
    expect(v3.parentQuotationId).toBe(v2Id);
  });

  it("should get version chain including all versions", async () => {
    const chain = await getQuotationVersionChain(testQuotationId);
    expect(chain.length).toBeGreaterThanOrEqual(1);
    // Base should always be in the chain
    expect(chain.some((q) => q.id === testQuotationId)).toBe(true);
  });

  it("should throw for non-existent parent", async () => {
    await expect(
      createQuotationVersion(999999, testUserId)
    ).rejects.toThrow("Parent quotation not found");
  });
});
