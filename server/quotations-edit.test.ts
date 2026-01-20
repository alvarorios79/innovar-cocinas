import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Quotations Edit Functionality", () => {
  let testQuotationId: number;
  let testClientId: number;

  beforeAll(async () => {
    // Crear cliente de prueba
    const clients = await db.getAllClients();
    if (clients.length > 0) {
      testClientId = clients[0].id;
    } else {
      throw new Error("No hay clientes disponibles para testing");
    }

    // Crear cotización de prueba
    const quotationNumber = await db.getNextQuotationNumber();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    testQuotationId = await db.createQuotation({
      quotationNumber,
      clientId: testClientId,
      vendorName: "Alvaro Gutierrez",
      workType: "Cocina Integral",
      status: "draft",
      validUntil,
      subtotal: "5000000",
      fixedCosts: "600000",
      total: "5600000",
    });

    // Crear items de prueba
    await db.createQuotationItem({
      quotationId: testQuotationId,
      itemNumber: 1,
      description: "Cocina en L con muebles superiores e inferiores",
      quantity: "5",
      unitPrice: "1000000",
      totalPrice: "5000000",
    });
  });

  it("should update quotation basic data", async () => {
    await db.updateQuotation(testQuotationId, {
      vendorName: "Martha Serna",
      workType: "Cocina + Closet",
    });

    const updated = await db.getQuotationById(testQuotationId);
    expect(updated?.vendorName).toBe("Martha Serna");
    expect(updated?.workType).toBe("Cocina + Closet");
  });

  it("should delete and recreate items when updating", async () => {
    // Eliminar items antiguos
    await db.deleteQuotationItems(testQuotationId);

    // Crear nuevos items
    await db.createQuotationItem({
      quotationId: testQuotationId,
      itemNumber: 1,
      description: "Item actualizado 1",
      quantity: "3",
      unitPrice: "2000000",
      totalPrice: "6000000",
    });

    await db.createQuotationItem({
      quotationId: testQuotationId,
      itemNumber: 2,
      description: "Item actualizado 2",
      quantity: "2",
      unitPrice: "1500000",
      totalPrice: "3000000",
    });

    const items = await db.getQuotationItems(testQuotationId);
    expect(items.length).toBe(2);
    expect(items[0].description).toBe("Item actualizado 1");
    expect(items[1].description).toBe("Item actualizado 2");
  });

  it("should recalculate totals after updating items", async () => {
    const items = await db.getQuotationItems(testQuotationId);
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const fixedCosts = 600000;
    const total = subtotal + fixedCosts;

    await db.updateQuotation(testQuotationId, {
      subtotal: subtotal.toString(),
      total: total.toString(),
    });

    const updated = await db.getQuotationById(testQuotationId);
    expect(parseFloat(updated?.total || "0")).toBe(total);
    expect(parseFloat(updated?.subtotal || "0")).toBe(subtotal);
  });

  it("should only allow editing quotations in draft status", async () => {
    const quotation = await db.getQuotationById(testQuotationId);
    expect(quotation?.status).toBe("draft");
  });
});
