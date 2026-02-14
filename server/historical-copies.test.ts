import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Historical Copies and Financial Sync", () => {
  let testClientId: number;
  let testQuotationId: number;
  let testUserId: number;
  let testProjectId: number;

  beforeAll(async () => {
    // Crear usuario de prueba
    const userId = await db.createUser({
      email: `test-historical-${Date.now()}@test.com`,
      name: "Test User",
      role: "admin",
      openId: `test-${Date.now()}`,
    });
    testUserId = userId;

    // Crear cliente de prueba
    testClientId = await db.createClient({
      name: "Test Client",
      email: "test@example.com",
      phone: "1234567890",
      address: "Test Address",
    });

    // Crear cotización de prueba
    testQuotationId = await db.createQuotation({
      quotationNumber: `COT-TEST-${Date.now()}`,
      clientId: testClientId,
      vendorName: "Test Vendor",
      productType: "cocina",
      status: "draft",
      subtotal: 1000000,
      transportCost: 600000,
      total: 1600000,
      createdBy: testUserId,
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testProjectId) {
      await db.updateProject(testProjectId, { deletedAt: new Date() });
    }
    if (testQuotationId) {
      await db.updateQuotation(testQuotationId, { deletedAt: new Date() });
    }
  });

  it("should create historical copy when creating project from quotation", async () => {
    // Obtener la cotización
    const quotation = await db.getQuotationById(testQuotationId);
    expect(quotation).toBeDefined();

    // Crear copia histórica (simula lo que pasa al crear proyecto)
    const copyId = await db.createHistoricalCopy(testQuotationId);
    expect(copyId).toBeDefined();
    expect(typeof copyId).toBe("number");

    // Verificar que la copia fue creada correctamente
    const copy = await db.getQuotationById(copyId);
    expect(copy).toBeDefined();
    expect(copy?.baseQuotationId).toBe(testQuotationId);
    expect(copy?.versionNumber).toBe(1);
    // La copia es histórica si id !== baseQuotationId
    expect(copy?.id).not.toBe(copy?.baseQuotationId);
  });

  it("should assign correct version numbers to multiple copies", async () => {
    // Crear primera copia
    const copy1Id = await db.createHistoricalCopy(testQuotationId);
    const copy1 = await db.getQuotationById(copy1Id);
    expect(copy1?.versionNumber).toBe(1);

    // Crear segunda copia
    const copy2Id = await db.createHistoricalCopy(testQuotationId);
    const copy2 = await db.getQuotationById(copy2Id);
    expect(copy2?.versionNumber).toBe(2);

    // Crear tercera copia
    const copy3Id = await db.createHistoricalCopy(testQuotationId);
    const copy3 = await db.getQuotationById(copy3Id);
    expect(copy3?.versionNumber).toBe(3);
  });

  it("should retrieve all historical copies for a quotation", async () => {
    // Crear varias copias
    await db.createHistoricalCopy(testQuotationId);
    await db.createHistoricalCopy(testQuotationId);

    // Obtener todas las copias
    const copies = await db.getHistoricalCopies(testQuotationId);
    expect(copies.length).toBeGreaterThan(0);
    expect(copies.every((c) => c.baseQuotationId === testQuotationId)).toBe(true);
    expect(copies.every((c) => c.id !== c.baseQuotationId)).toBe(true);
  });

  it("should preserve original quotation data in historical copy", async () => {
    const original = await db.getQuotationById(testQuotationId);
    const copyId = await db.createHistoricalCopy(testQuotationId);
    const copy = await db.getQuotationById(copyId);

    expect(copy?.quotationNumber).toBe(original?.quotationNumber);
    expect(copy?.clientId).toBe(original?.clientId);
    expect(copy?.vendorName).toBe(original?.vendorName);
    expect(copy?.productType).toBe(original?.productType);
    expect(copy?.subtotal).toBe(original?.subtotal);
    expect(copy?.transportCost).toBe(original?.transportCost);
    expect(copy?.total).toBe(original?.total);
  });

  it("should identify historical copies using id !== baseQuotationId logic", async () => {
    const original = await db.getQuotationById(testQuotationId);
    const copyId = await db.createHistoricalCopy(testQuotationId);
    const copy = await db.getQuotationById(copyId);

    // Original quotation: id === baseQuotationId (or baseQuotationId is null)
    expect(original?.id === original?.baseQuotationId || original?.baseQuotationId === null).toBe(true);

    // Historical copy: id !== baseQuotationId
    expect(copy?.id).not.toBe(copy?.baseQuotationId);
    expect(copy?.baseQuotationId).toBe(testQuotationId);
  });
});
