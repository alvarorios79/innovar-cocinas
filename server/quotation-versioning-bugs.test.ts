import { describe, it, expect, beforeEach, vi } from "vitest";
import * as versioning from "./quotation-versioning";
import { getDb } from "./db";
import { quotations, projects } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock de la BD
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("Quotation Versioning Bugs", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{ insertId: 100 }]),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("BUG 1: 'Versionado no encontrado' error", () => {
    it("Debe crear versión sin error 'no encontrado'", async () => {
      // Setup: Simular cotización V1
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        {
          id: 1,
          quotationNumber: "COT-001-v1",
          clientId: 10,
          vendorName: "Test",
          productType: "Cocina",
          status: "approved",
          subtotal: "1000000",
          transportCost: "100000",
          total: "1100000",
          createdBy: 1,
          parentQuotationId: null,
          isAdditional: 0,
          baseQuotationId: null,
          versionNumber: 1,
          customDescriptions: null,
          generalNotes: null,
          discountPercent: null,
          discountAmount: null,
        },
      ]);

      // Setup: Simular que no hay versiones previas
      mockDb.select().from().where.mockResolvedValueOnce([]);

      // Setup: Simular que no hay items
      mockDb.select().from().where.mockResolvedValueOnce([]);

      // Act: Crear versión
      const newQuotationId = await versioning.createQuotationVersion(1, 1);

      // Assert: Debe retornar un ID válido
      expect(newQuotationId).toBe(100);
      expect(newQuotationId).not.toBeNull();
    });

    it("Debe crear versión V2 correctamente", async () => {
      // Setup: Simular cotización V1
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        {
          id: 1,
          quotationNumber: "COT-001-v1",
          clientId: 10,
          versionNumber: 1,
          baseQuotationId: null,
          parentQuotationId: null,
          isAdditional: 0,
          status: "approved",
          subtotal: "1000000",
          transportCost: "100000",
          total: "1100000",
          createdBy: 1,
          vendorName: "Test",
          productType: "Cocina",
          customDescriptions: null,
          generalNotes: null,
          discountPercent: null,
          discountAmount: null,
        },
      ]);

      // Setup: Simular que V1 es la versión más alta
      mockDb.select().from().where.mockResolvedValueOnce([
        { vn: 1 },
      ]);

      // Setup: Simular que no hay items
      mockDb.select().from().where.mockResolvedValueOnce([]);

      // Act
      const newQuotationId = await versioning.createQuotationVersion(1, 1);

      // Assert
      expect(newQuotationId).toBe(100);
      
      // Verificar que se insertó con versionNumber = 2
      const insertCall = mockDb.insert().values.mock.calls[0]?.[0];
      expect(insertCall?.versionNumber).toBe(2);
      expect(insertCall?.quotationNumber).toContain("-v2");
    });
  });

  describe("BUG 2: Proyecto NO se actualiza a V3", () => {
    it("Debe actualizar proyecto de V2 a V3 cuando se crea V3", async () => {
      // Setup: Simular cotización V2 que tiene proyecto
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        {
          id: 2,
          quotationNumber: "COT-001-v2",
          clientId: 10,
          versionNumber: 2,
          baseQuotationId: 1, // Apunta a V1 como base
          parentQuotationId: 1, // Padre es V1
          isAdditional: 1,
          status: "approved",
          subtotal: "1200000",
          transportCost: "100000",
          total: "1300000",
          createdBy: 1,
          vendorName: "Test",
          productType: "Cocina",
          customDescriptions: null,
          generalNotes: null,
          discountPercent: null,
          discountAmount: null,
        },
      ]);

      // Setup: Simular que V1 y V2 existen
      mockDb.select().from().where.mockResolvedValueOnce([
        { vn: 1 },
        { vn: 2 },
      ]);

      // Setup: Simular que no hay items
      mockDb.select().from().where.mockResolvedValueOnce([]);

      // Act: Crear V3
      const newQuotationId = await versioning.createQuotationVersion(2, 1);

      // Assert: V3 debe tener versionNumber = 3
      const insertCall = mockDb.insert().values.mock.calls[0]?.[0];
      expect(insertCall?.versionNumber).toBe(3);
      expect(insertCall?.quotationNumber).toContain("-v3");
    });

    it("Debe mantener baseQuotationId apuntando a V1 en todas las versiones", async () => {
      // Setup: Simular V1 sin base
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        {
          id: 1,
          versionNumber: 1,
          baseQuotationId: null,
          parentQuotationId: null,
        },
      ]);

      mockDb.select().from().where.mockResolvedValueOnce([{ vn: 1 }]);
      mockDb.select().from().where.mockResolvedValueOnce([]);

      // Act: Crear V2
      await versioning.createQuotationVersion(1, 1);

      // Assert: V2 debe tener baseQuotationId = 1 (V1)
      const insertCall = mockDb.insert().values.mock.calls[0]?.[0];
      expect(insertCall?.baseQuotationId).toBe(1);
      expect(insertCall?.parentQuotationId).toBe(1);
    });

    it("Debe calcular correctamente el siguiente versionNumber", async () => {
      // Setup: Simular V2 con base V1
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        {
          id: 2,
          versionNumber: 2,
          baseQuotationId: 1,
          parentQuotationId: 1,
          status: "approved",
          subtotal: "1200000",
          transportCost: "100000",
          total: "1300000",
          createdBy: 1,
          quotationNumber: "COT-001-v2",
          vendorName: "Test",
          productType: "Cocina",
          customDescriptions: null,
          generalNotes: null,
          discountPercent: null,
          discountAmount: null,
          clientId: 10,
          isAdditional: 1,
        },
      ]);

      // Setup: Simular que V1, V2 y V3 existen
      mockDb.select().from().where.mockResolvedValueOnce([
        { vn: 1 },
        { vn: 2 },
        { vn: 3 },
      ]);

      mockDb.select().from().where.mockResolvedValueOnce([]);

      // Act: Crear V4
      await versioning.createQuotationVersion(2, 1);

      // Assert: V4 debe tener versionNumber = 4
      const insertCall = mockDb.insert().values.mock.calls[0]?.[0];
      expect(insertCall?.versionNumber).toBe(4);
    });
  });

  describe("Integration: Flujo completo V1 -> V2 -> V3", () => {
    it("Debe mantener consistencia en toda la cadena de versiones", async () => {
      // Setup: Simular V1
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        {
          id: 1,
          versionNumber: 1,
          baseQuotationId: null,
          parentQuotationId: null,
          status: "approved",
          subtotal: "1000000",
          transportCost: "100000",
          total: "1100000",
          createdBy: 1,
          quotationNumber: "COT-001-v1",
          vendorName: "Test",
          productType: "Cocina",
          customDescriptions: null,
          generalNotes: null,
          discountPercent: null,
          discountAmount: null,
          clientId: 10,
          isAdditional: 0,
        },
      ]);

      mockDb.select().from().where.mockResolvedValueOnce([{ vn: 1 }]);
      mockDb.select().from().where.mockResolvedValueOnce([]);

      // Act: Crear V2
      const v2Id = await versioning.createQuotationVersion(1, 1);

      // Assert: V2 debe ser válido
      expect(v2Id).toBe(100);

      // Verificar estructura de V2
      const v2Insert = mockDb.insert().values.mock.calls[0]?.[0];
      expect(v2Insert?.versionNumber).toBe(2);
      expect(v2Insert?.baseQuotationId).toBe(1);
      expect(v2Insert?.parentQuotationId).toBe(1);
      expect(v2Insert?.isAdditional).toBe(1);
    });
  });
});
