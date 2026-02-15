import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Quotations Versioning System", () => {
  let quotationId: number;
  let clientId: number;
  let userId: number;

  beforeAll(async () => {
    // Crear cliente de prueba
    const client = await db.createClient({
      name: "Test Client",
      email: "test@example.com",
      whatsappPhone: "1234567890",
    });
    clientId = client;

    // Crear usuario de prueba
    const user = await db.createUser({
      name: "Test User",
      email: "user@example.com",
      role: "admin",
    });
    userId = user.id;

    // Crear cotización V1
    quotationId = await db.createQuotation({
      quotationNumber: "COT-2026-620",
      clientId,
      vendorName: "Test Vendor",
      productType: "cocina",
      status: "draft",
      subtotal: "1000000",
      transportCost: "0",
      total: "1000000",
      createdBy: userId,
    });
  });

  it("should get base quotation when quotation is V1", async () => {
    const base = await db.getBaseQuotation(quotationId);
    expect(base).toBeDefined();
    expect(base?.id).toBe(quotationId);
    expect(base?.baseQuotationId).toBeNull();
  });

  it("should get all versions of a quotation", async () => {
    const versions = await db.getQuotationVersions(quotationId);
    expect(versions).toBeDefined();
    expect(versions.length).toBeGreaterThan(0);
    expect(versions[0].id).toBe(quotationId);
  });

  it("should create a new version (V2) of a quotation", async () => {
    const v2Id = await db.createQuotationVersion(quotationId, userId);
    expect(v2Id).toBeDefined();
    expect(v2Id).not.toBe(quotationId);

    const v2 = await db.getQuotationById(v2Id);
    expect(v2).toBeDefined();
    expect(v2?.versionNumber).toBe(2);
    expect(v2?.baseQuotationId).toBe(quotationId);
    expect(v2?.status).toBe("draft");
  });

  it("should create V3 from V2", async () => {
    // Crear V2
    const v2Id = await db.createQuotationVersion(quotationId, userId);

    // Crear V3 desde V2
    const v3Id = await db.createQuotationVersion(v2Id, userId);
    expect(v3Id).toBeDefined();
    expect(v3Id).not.toBe(v2Id);
    expect(v3Id).not.toBe(quotationId);

    const v3 = await db.getQuotationById(v3Id);
    expect(v3).toBeDefined();
    expect(v3?.versionNumber).toBe(3);
    expect(v3?.baseQuotationId).toBe(quotationId);
  });

  it("should get all versions in order", async () => {
    // Crear V2
    const v2Id = await db.createQuotationVersion(quotationId, userId);

    // Crear V3
    const v3Id = await db.createQuotationVersion(v2Id, userId);

    // Obtener todas las versiones
    const versions = await db.getQuotationVersions(quotationId);
    expect(versions.length).toBeGreaterThanOrEqual(3);
    expect(versions[0].versionNumber).toBe(1);
    expect(versions[1].versionNumber).toBe(2);
    expect(versions[2].versionNumber).toBe(3);
  });

  it("should copy items when creating new version", async () => {
    // Crear item en V1
    const itemId = await db.createQuotationItem({
      quotationId,
      itemNumber: 1,
      itemType: "cocina",
      description: "Cocina Integral",
      quantity: "1",
      totalPrice: "1000000",
    });

    // Crear V2
    const v2Id = await db.createQuotationVersion(quotationId, userId);

    // Verificar que V2 tiene el mismo item
    const v2Items = await db.getQuotationItems(v2Id);
    expect(v2Items.length).toBeGreaterThan(0);
    expect(v2Items[0].description).toBe("Cocina Integral");
  });

  it("should get latest version", async () => {
    // Crear V2
    const v2Id = await db.createQuotationVersion(quotationId, userId);

    // Crear V3
    const v3Id = await db.createQuotationVersion(v2Id, userId);

    // Obtener la última versión
    const latest = await db.getLatestQuotationVersion(quotationId);
    expect(latest).toBeDefined();
    expect(latest?.id).toBe(v3Id);
    expect(latest?.versionNumber).toBe(3);
  });

  it("should get version number correctly", async () => {
    const versionNumber = await db.getQuotationVersionNumber(quotationId);
    expect(versionNumber).toBe(1);

    // Crear V2
    const v2Id = await db.createQuotationVersion(quotationId, userId);
    const v2VersionNumber = await db.getQuotationVersionNumber(v2Id);
    expect(v2VersionNumber).toBe(2);
  });

  it("should identify base quotation from any version", async () => {
    // Crear V2
    const v2Id = await db.createQuotationVersion(quotationId, userId);

    // Crear V3
    const v3Id = await db.createQuotationVersion(v2Id, userId);

    // Obtener base desde V3
    const base = await db.getBaseQuotation(v3Id);
    expect(base?.id).toBe(quotationId);
    expect(base?.versionNumber).toBe(1);
  });
});
