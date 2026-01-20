import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Quotations System", () => {
  it("should generate quotation number automatically", async () => {
    // Crear cliente de prueba
    const clientId = await db.createClient({
      userId: null,
      name: "Cliente Test Cotización",
      email: "test@cotizacion.com",
      whatsappPhone: "3001234567",
      address: "Dirección Test",
    });

    // Crear cotización sin especificar quotationNumber
    const quotationId = await db.createQuotation({
      clientId,
      vendorName: "Alvaro Gutierrez",
      workType: "Cocina Integral Test",
      status: "draft",
      subtotal: "5000000",
      fixedCosts: "600000",
      total: "5600000",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    expect(quotationId).toBeGreaterThan(0);

    // Verificar que se generó el número automáticamente
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation).toBeDefined();
    expect(quotation?.quotationNumber).toMatch(/^COT-\d{4}-\d+$/);
    expect(quotation?.vendorName).toBe("Alvaro Gutierrez");
    expect(quotation?.status).toBe("draft");

    // Limpiar
    await db.deleteQuotation(quotationId);
    await db.deleteClient(clientId);
  });

  it("should create and manage quotation items", async () => {
    // Crear cliente de prueba
    const clientId = await db.createClient({
      userId: null,
      name: "Cliente Test Items",
      email: "test@items.com",
      whatsappPhone: "3001234568",
      address: "Dirección Test",
    });

    // Crear cotización
    const quotationId = await db.createQuotation({
      clientId,
      vendorName: "Martha Serna",
      workType: "Closet",
      status: "draft",
      subtotal: "2000000",
      fixedCosts: "600000",
      total: "2600000",
    });

    // Crear items
    await db.createQuotationItem({
      quotationId,
      itemNumber: 1,
      description: "Closet empotrado",
      quantity: "2m²",
      unitPrice: "$900,000/m²",
      totalPrice: 1800000,
    });

    await db.createQuotationItem({
      quotationId,
      itemNumber: 2,
      description: "Herraje pantalonero",
      quantity: "1 unidad",
      totalPrice: 500000,
    });

    // Verificar items
    const items = await db.getQuotationItems(quotationId);
    expect(items).toHaveLength(2);
    expect(items[0].itemNumber).toBe(1);
    expect(items[1].itemNumber).toBe(2);

    // Limpiar
    await db.deleteQuotation(quotationId);
    await db.deleteClient(clientId);
  });
});
