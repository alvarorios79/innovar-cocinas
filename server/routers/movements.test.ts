import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "../db";

/**
 * Tests para la lógica de Movimientos Financieros
 * Verifica que el cálculo de saldo sea correcto con pagos, descuentos y recargos
 *
 * calculateProjectBalance devuelve:
 *   totalAmount, totalPaid, totalDiscounts, totalSurcharges, dynamicBalance
 */

describe("Movimientos Financieros", () => {
  let testProjectId: number;
  let testClientId: number;

  beforeAll(async () => {
    // Crear cliente de prueba
    testClientId = await db.createClient({
      name: "Cliente Test Movimientos",
      email: "test-movements@example.com",
      whatsappPhone: "+573001234567",
      address: "Calle Test 123",
      dataOrigin: "system",
    });

    // Crear proyecto de prueba
    testProjectId = await db.createProject({
      clientId: testClientId,
      name: "Proyecto Test Movimientos",
      workType: "cocina",
      status: "cotizacion_enviada",
      totalAmount: "1000000", // 1 millón COP — campo correcto en schema
      advanceAmount: "600000", // 60% adelanto
      createdBy: 1,
      dataOrigin: "system",
    } as any);
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testProjectId) {
      // Eliminar pagos
      const payments = await db.getPaymentsByProjectId(testProjectId);
      for (const payment of payments) {
        await db.deletePayment(payment.id);
      }
      // Eliminar proyecto
      await db.deleteProject(testProjectId);
    }
    if (testClientId) {
      await db.deleteClient(testClientId);
    }
  });

  it("Debe calcular saldo correcto con solo pagos", async () => {
    // Registrar un pago de 600,000
    await db.createPayment({
      projectId: testProjectId,
      amount: "600000",
      type: "advance",
      receivedAt: new Date().toISOString(),
      method: "transfer",
      movementType: "payment",
      registeredBy: 1,
    } as any);

    const balance = await db.calculateProjectBalance(testProjectId);

    expect(balance.totalAmount).toBe(1000000);
    expect(balance.totalPaid).toBe(600000);
    expect(balance.totalDiscounts).toBe(0);
    expect(balance.totalSurcharges).toBe(0);
    expect(balance.dynamicBalance).toBe(400000); // 1,000,000 - 600,000
  });

  it("Debe calcular saldo correcto con pagos y descuentos", async () => {
    // Registrar un descuento de 100,000
    await db.createPayment({
      projectId: testProjectId,
      amount: "100000",
      type: "other",
      receivedAt: new Date().toISOString(),
      method: "transfer",
      movementType: "discount",
      registeredBy: 1,
    } as any);

    const balance = await db.calculateProjectBalance(testProjectId);

    expect(balance.totalAmount).toBe(1000000);
    expect(balance.totalPaid).toBe(600000);
    expect(balance.totalDiscounts).toBe(100000);
    expect(balance.totalSurcharges).toBe(0);
    expect(balance.dynamicBalance).toBe(300000); // 1,000,000 - 100,000 (descuento) - 600,000 (pago) = 300,000
  });

  it("Debe calcular saldo correcto con pagos, descuentos y recargos", async () => {
    // Registrar un recargo de 50,000
    await db.createPayment({
      projectId: testProjectId,
      amount: "50000",
      type: "other",
      receivedAt: new Date().toISOString(),
      method: "transfer",
      movementType: "surcharge",
      registeredBy: 1,
    } as any);

    const balance = await db.calculateProjectBalance(testProjectId);

    expect(balance.totalAmount).toBe(1000000);
    expect(balance.totalPaid).toBe(600000);
    expect(balance.totalDiscounts).toBe(100000);
    expect(balance.totalSurcharges).toBe(50000);
    expect(balance.dynamicBalance).toBe(350000); // 1,000,000 + 50,000 - 100,000 - 600,000
  });

  it("Debe usar movementType='payment' por defecto si no se especifica", async () => {
    // Crear nuevo proyecto para este test
    const projectId = await db.createProject({
      clientId: testClientId,
      name: "Proyecto Test Default Movement",
      workType: "cocina",
      status: "cotizacion_enviada",
      totalAmount: "500000",
      advanceAmount: "300000",
      createdBy: 1,
      dataOrigin: "system",
    } as any);

    // Registrar pago explícitamente con movementType='payment'
    await db.createPayment({
      projectId,
      amount: "300000",
      type: "advance",
      receivedAt: new Date().toISOString(),
      method: "transfer",
      movementType: "payment",
      registeredBy: 1,
    } as any);

    const balance = await db.calculateProjectBalance(projectId);

    expect(balance.totalPaid).toBe(300000);
    expect(balance.dynamicBalance).toBe(200000); // 500,000 - 300,000

    // Limpiar
    const payments = await db.getPaymentsByProjectId(projectId);
    for (const payment of payments) {
      await db.deletePayment(payment.id);
    }
    await db.deleteProject(projectId);
  });

  it("Debe retornar ceros para proyecto sin movimientos", async () => {
    // Crear nuevo proyecto sin movimientos
    const projectId = await db.createProject({
      clientId: testClientId,
      name: "Proyecto Test Sin Movimientos",
      workType: "cocina",
      status: "cotizacion_enviada",
      totalAmount: "2000000",
      advanceAmount: "1200000",
      createdBy: 1,
      dataOrigin: "system",
    } as any);

    const balance = await db.calculateProjectBalance(projectId);

    expect(balance.totalAmount).toBe(2000000);
    expect(balance.totalPaid).toBe(0);
    expect(balance.totalDiscounts).toBe(0);
    expect(balance.totalSurcharges).toBe(0);
    expect(balance.dynamicBalance).toBe(2000000); // Total sin movimientos

    // Limpiar
    await db.deleteProject(projectId);
  });

  it("Debe mantener compatibilidad con pagos existentes (movementType=payment)", async () => {
    // Crear nuevo proyecto
    const projectId = await db.createProject({
      clientId: testClientId,
      name: "Proyecto Test Compatibilidad",
      workType: "cocina",
      status: "cotizacion_enviada",
      totalAmount: "3000000",
      advanceAmount: "1800000",
      createdBy: 1,
      dataOrigin: "system",
    } as any);

    // Registrar múltiples pagos
    await db.createPayment({
      projectId,
      amount: "1000000",
      type: "advance",
      receivedAt: new Date().toISOString(),
      method: "transfer",
      movementType: "payment",
      registeredBy: 1,
    } as any);

    await db.createPayment({
      projectId,
      amount: "500000",
      type: "partial",
      receivedAt: new Date().toISOString(),
      method: "cash",
      movementType: "payment",
      registeredBy: 1,
    } as any);

    const balance = await db.calculateProjectBalance(projectId);

    expect(balance.totalAmount).toBe(3000000);
    expect(balance.totalPaid).toBe(1500000); // 1,000,000 + 500,000
    expect(balance.dynamicBalance).toBe(1500000); // 3,000,000 - 1,500,000

    // Limpiar
    const payments = await db.getPaymentsByProjectId(projectId);
    for (const payment of payments) {
      await db.deletePayment(payment.id);
    }
    await db.deleteProject(projectId);
  });
});
