import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "../db";

/**
 * Tests para la lógica de Movimientos Financieros
 * Verifica que el cálculo de saldo sea correcto con pagos, descuentos y recargos
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
      status: "cotizacion_enviada",
      total: 1000000, // 1 millón COP
      advanceAmount: 600000, // 60% adelanto
      createdBy: 1,
      dataOrigin: "system",
    });
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
      receivedAt: new Date(),
      method: "transfer",
      movementType: "payment",
      registeredBy: 1,
    });

    const balance = await db.calculateProjectBalance(testProjectId);

    expect(balance.totalProject).toBe(1000000);
    expect(balance.payments).toBe(600000);
    expect(balance.discounts).toBe(0);
    expect(balance.surcharges).toBe(0);
    expect(balance.balance).toBe(400000); // 1,000,000 - 600,000
  });

  it("Debe calcular saldo correcto con pagos y descuentos", async () => {
    // Registrar un descuento de 100,000
    await db.createPayment({
      projectId: testProjectId,
      amount: "100000",
      type: "other",
      receivedAt: new Date(),
      method: "transfer",
      movementType: "discount",
      registeredBy: 1,
    });

    const balance = await db.calculateProjectBalance(testProjectId);

    expect(balance.totalProject).toBe(1000000);
    expect(balance.payments).toBe(600000);
    expect(balance.discounts).toBe(100000);
    expect(balance.surcharges).toBe(0);
    expect(balance.balance).toBe(500000); // 1,000,000 + 0 - 100,000 - 600,000
  });

  it("Debe calcular saldo correcto con pagos, descuentos y recargos", async () => {
    // Registrar un recargo de 50,000
    await db.createPayment({
      projectId: testProjectId,
      amount: "50000",
      type: "other",
      receivedAt: new Date(),
      method: "transfer",
      movementType: "surcharge",
      registeredBy: 1,
    });

    const balance = await db.calculateProjectBalance(testProjectId);

    expect(balance.totalProject).toBe(1000000);
    expect(balance.payments).toBe(600000);
    expect(balance.discounts).toBe(100000);
    expect(balance.surcharges).toBe(50000);
    expect(balance.balance).toBe(350000); // 1,000,000 + 50,000 - 100,000 - 600,000
  });

  it("Debe usar movementType='payment' por defecto si no se especifica", async () => {
    // Crear nuevo proyecto para este test
    const projectId = await db.createProject({
      clientId: testClientId,
      name: "Proyecto Test Default Movement",
      status: "cotizacion_enviada",
      total: 500000,
      advanceAmount: 300000,
      createdBy: 1,
      dataOrigin: "system",
    });

    // Registrar pago sin especificar movementType (debe usar 'payment' por defecto)
    await db.createPayment({
      projectId,
      amount: "300000",
      type: "advance",
      receivedAt: new Date(),
      method: "transfer",
      movementType: "payment", // Explícitamente 'payment'
      registeredBy: 1,
    });

    const balance = await db.calculateProjectBalance(projectId);

    expect(balance.payments).toBe(300000);
    expect(balance.balance).toBe(200000); // 500,000 - 300,000

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
      status: "cotizacion_enviada",
      total: 2000000,
      advanceAmount: 1200000,
      createdBy: 1,
      dataOrigin: "system",
    });

    const balance = await db.calculateProjectBalance(projectId);

    expect(balance.totalProject).toBe(2000000);
    expect(balance.payments).toBe(0);
    expect(balance.discounts).toBe(0);
    expect(balance.surcharges).toBe(0);
    expect(balance.balance).toBe(2000000); // Total sin movimientos

    // Limpiar
    await db.deleteProject(projectId);
  });

  it("Debe mantener compatibilidad con pagos existentes (movementType=payment)", async () => {
    // Crear nuevo proyecto
    const projectId = await db.createProject({
      clientId: testClientId,
      name: "Proyecto Test Compatibilidad",
      status: "cotizacion_enviada",
      total: 3000000,
      advanceAmount: 1800000,
      createdBy: 1,
      dataOrigin: "system",
    });

    // Registrar múltiples pagos
    await db.createPayment({
      projectId,
      amount: "1000000",
      type: "advance",
      receivedAt: new Date(),
      method: "transfer",
      movementType: "payment",
      registeredBy: 1,
    });

    await db.createPayment({
      projectId,
      amount: "500000",
      type: "partial",
      receivedAt: new Date(),
      method: "cash",
      movementType: "payment",
      registeredBy: 1,
    });

    const balance = await db.calculateProjectBalance(projectId);

    expect(balance.totalProject).toBe(3000000);
    expect(balance.payments).toBe(1500000); // 1,000,000 + 500,000
    expect(balance.balance).toBe(1500000); // 3,000,000 - 1,500,000

    // Limpiar
    const payments = await db.getPaymentsByProjectId(projectId);
    for (const payment of payments) {
      await db.deletePayment(payment.id);
    }
    await db.deleteProject(projectId);
  });
});
