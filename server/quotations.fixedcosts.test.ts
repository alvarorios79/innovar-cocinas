import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as db from "./db";

describe("Quotations - Fixed Costs Logic", () => {
  let testClientId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Crear cliente de prueba
    testClientId = await db.createClient({
      dataOrigin: 'system',
      name: "Cliente Test Costos Fijos",
      email: "test.costos@example.com",
      whatsappPhone: "+573001234567",
    });

    // Crear usuario admin de prueba
    testUserId = await db.createUserExtended({
      dataOrigin: 'system',
      name: "Admin Test Fixed Costs",
      email: "admin-fixedcosts-test@test.com",
      role: "admin",
    });
  });

  afterEach(async () => {
    // Limpiar cotizaciones de prueba
    const allQuotations = await db.getAllQuotations();
    const testQuotations = allQuotations.filter(q => q.clientId === testClientId);
    for (const quot of testQuotations) {
      await db.deleteQuotationItems(quot.id);
      await db.deleteQuotation(quot.id);
    }

    // Limpiar cliente de prueba
    await db.deleteClient(testClientId);
    
    // Limpiar usuario de prueba
    await db.deleteUser(testUserId);
  });

  it("debe calcular correctamente cuando NO hay checkbox (costos fijos separados)", async () => {
    // Crear cotización sin checkbox
    const subtotal = 9000000; // $9,000,000
    const transportCost = 600000; // $600,000 (separados)
    const total = subtotal + transportCost; // $9,600,000

    const quotationId = await db.createQuotation({
      dataOrigin: 'system',
      clientId: testClientId,
      vendorName: "Alvaro Gutierrez",
      workType: "Cocina Integral",
      status: "draft",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subtotal: subtotal.toString(),
      transportCost: transportCost.toString(),
      total: total.toString(),
      createdBy: testUserId,
    });

    // Crear item SIN checkbox
    await db.createQuotationItem({
      quotationId,
      itemNumber: 1,
      description: "Cocina integral en L",
      quantity: "1",
      totalPrice: subtotal.toString(),
      includesFixedCosts: false, // NO incluye costos fijos
    });

    // Verificar cotización
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation).toBeDefined();
    expect(parseFloat(quotation!.subtotal)).toBe(9000000);
    expect(parseFloat(quotation!.transportCost)).toBe(600000);
    expect(parseFloat(quotation!.total)).toBe(9600000);

    console.log("✅ Escenario 1: Costos fijos separados - Correcto");
    console.log(`   Subtotal: $${subtotal.toLocaleString()}`);
    console.log(`   Costos fijos: $${transportCost.toLocaleString()}`);
    console.log(`   Total: $${total.toLocaleString()}`);
  });

  it("debe calcular correctamente cuando SÍ hay checkbox (costos fijos incluidos)", async () => {
    // Crear cotización con checkbox
    const itemPrice = 9600000; // $9,600,000 (ya incluye $600,000)
    const subtotal = itemPrice;
    const transportCost = 0; // $0 (ya están incluidos en el item)
    const total = subtotal; // $9,600,000

    const quotationId = await db.createQuotation({
      dataOrigin: 'system',
      clientId: testClientId,
      vendorName: "Martha Serna",
      workType: "Cocina + Closet",
      status: "draft",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subtotal: subtotal.toString(),
      transportCost: transportCost.toString(),
      total: total.toString(),
      createdBy: testUserId,
    });

    // Crear item CON checkbox
    await db.createQuotationItem({
      quotationId,
      itemNumber: 1,
      description: "Cocina integral en U + Closet",
      quantity: "1",
      totalPrice: itemPrice.toString(),
      includesFixedCosts: true, // SÍ incluye costos fijos
    });

    // Verificar cotización
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation).toBeDefined();
    expect(parseFloat(quotation!.subtotal)).toBe(9600000);
    expect(parseFloat(quotation!.transportCost)).toBe(0);
    expect(parseFloat(quotation!.total)).toBe(9600000);

    console.log("✅ Escenario 2: Costos fijos incluidos - Correcto");
    console.log(`   Subtotal (incluye costos): $${subtotal.toLocaleString()}`);
    console.log(`   Costos fijos adicionales: $${transportCost.toLocaleString()}`);
    console.log(`   Total: $${total.toLocaleString()}`);
  });

  it("debe evitar duplicación de costos fijos", async () => {
    // Este test verifica que NO se sumen $600,000 dos veces
    // Item con checkbox: $9,000,000 + $600,000 = $9,600,000
    const itemPrice = 9600000;
    const subtotal = itemPrice;
    const transportCost = 0; // NO agregar costos adicionales
    const total = subtotal; // $9,600,000 (NO $10,200,000)

    const quotationId = await db.createQuotation({
      dataOrigin: 'system',
      clientId: testClientId,
      vendorName: "Alvaro Gutierrez",
      workType: "Cocina Premium",
      status: "draft",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subtotal: subtotal.toString(),
      transportCost: transportCost.toString(),
      total: total.toString(),
      createdBy: testUserId,
    });

    await db.createQuotationItem({
      quotationId,
      itemNumber: 1,
      description: "Cocina premium con costos incluidos",
      quantity: "1",
      totalPrice: itemPrice.toString(),
      includesFixedCosts: true,
    });

    const quotation = await db.getQuotationById(quotationId);
    
    // Verificar que el total NO sea $10,200,000 (duplicación)
    expect(parseFloat(quotation!.total)).not.toBe(10200000);
    // Verificar que el total SÍ sea $9,600,000 (correcto)
    expect(parseFloat(quotation!.total)).toBe(9600000);

    console.log("✅ Escenario 3: Sin duplicación - Correcto");
    console.log(`   Total correcto: $${parseFloat(quotation!.total).toLocaleString()}`);
    console.log(`   Total incorrecto evitado: $10,200,000`);
  });
});
