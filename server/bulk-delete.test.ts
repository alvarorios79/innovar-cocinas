import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Bulk Delete Operations", () => {
  let testUser: any;
  let testClient: any;

  beforeAll(async () => {
    // Crear usuario de prueba con rol admin
    const userId = await db.createUserExtended({
      name: "Admin Test",
      email: `admin-bulk-${Date.now()}@test.com`,
      role: "admin",
      openId: `test-admin-bulk-${Date.now()}`,
    });
    testUser = await db.getUserById(userId);

    // Crear cliente de prueba
    const clientId = await db.createClient({
      name: "Cliente Test Bulk",
      whatsappPhone: "+573001234567",
      email: "cliente-bulk@test.com",
    });
    testClient = await db.getClientById(clientId);
  });

  describe("Bulk Delete Appointments", () => {
    it("should delete multiple appointments", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
        req: {} as any,
        res: {} as any,
      });

      // Crear 3 citas de prueba
      const apt1 = await caller.appointments.create({
        clientId: testClient.id,
        workTypes: ["cocina"],
        scheduledDate: new Date(2026, 5, 15, 10, 0, 0, 0).toISOString(),
        notes: "Cita 1 para eliminación masiva",
      });

      const apt2 = await caller.appointments.create({
        clientId: testClient.id,
        workTypes: ["closet"],
        scheduledDate: new Date(2026, 5, 15, 11, 0, 0, 0).toISOString(),
        notes: "Cita 2 para eliminación masiva",
      });

      const apt3 = await caller.appointments.create({
        clientId: testClient.id,
        workTypes: ["puertas"],
        scheduledDate: new Date(2026, 5, 15, 14, 0, 0, 0).toISOString(),
        notes: "Cita 3 para eliminación masiva",
      });

      // Verificar que se crearon
      const allAppointments = await caller.appointments.list();
      const createdIds = [apt1.id, apt2.id, apt3.id];
      const foundAppointments = allAppointments.filter(a => createdIds.includes(a.id));
      expect(foundAppointments.length).toBe(3);

      // Eliminar las 3 citas (simulando eliminación masiva)
      for (const id of createdIds) {
        await caller.appointments.delete({ id });
      }

      // Verificar que se eliminaron
      const remainingAppointments = await caller.appointments.list();
      const stillExists = remainingAppointments.filter(a => createdIds.includes(a.id));
      expect(stillExists.length).toBe(0);
    });
  });

  describe("Bulk Delete Advisory Requests", () => {
    it("should delete multiple advisory requests", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
        req: {} as any,
        res: {} as any,
      });

      // Crear 3 solicitudes de asesoramiento
      const adv1 = await caller.advisory.create({
        clientId: testClient.id,
        workType: "cocina",
        preferredCallTime: "manana",
        notes: "Asesoramiento 1 para eliminación masiva",
      });

      const adv2 = await caller.advisory.create({
        clientId: testClient.id,
        workType: "closet",
        preferredCallTime: "tarde",
        notes: "Asesoramiento 2 para eliminación masiva",
      });

      const adv3 = await caller.advisory.create({
        clientId: testClient.id,
        workType: "puertas",
        preferredCallTime: "noche",
        notes: "Asesoramiento 3 para eliminación masiva",
      });

      // Verificar que se crearon
      const allAdvisory = await caller.advisory.list();
      const createdIds = [adv1.id, adv2.id, adv3.id];
      const foundAdvisory = allAdvisory.filter(a => createdIds.includes(a.id));
      expect(foundAdvisory.length).toBe(3);

      // Eliminar las 3 solicitudes (simulando eliminación masiva)
      for (const id of createdIds) {
        await caller.advisory.delete({ id });
      }

      // Verificar que se eliminaron
      const remainingAdvisory = await caller.advisory.list();
      const stillExists = remainingAdvisory.filter(a => createdIds.includes(a.id));
      expect(stillExists.length).toBe(0);
    });
  });

  describe("Bulk Delete Quotations", () => {
    it("should delete multiple quotations", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
        req: {} as any,
        res: {} as any,
      });

      // Crear 3 cotizaciones
      const quot1 = await caller.quotations.create({
        clientId: testClient.id,
        vendorName: "Alvaro Gutierrez",
        productType: "cocina",
        items: [{
          itemNumber: 1,
          itemType: "cocina",
          description: "Cotización 1 para eliminación masiva",
          quantity: "1",
          totalPrice: 1000000,
        }],
      });

      const quot2 = await caller.quotations.create({
        clientId: testClient.id,
        vendorName: "Martha Serna",
        productType: "closet",
        items: [{
          itemNumber: 1,
          itemType: "closet",
          description: "Cotización 2 para eliminación masiva",
          quantity: "1",
          totalPrice: 2000000,
        }],
      });

      const quot3 = await caller.quotations.create({
        clientId: testClient.id,
        vendorName: "Alvaro Gutierrez",
        productType: "puerta",
        items: [{
          itemNumber: 1,
          itemType: "puerta",
          description: "Cotización 3 para eliminación masiva",
          quantity: "1",
          totalPrice: 3000000,
        }],
      });

      // Verificar que se crearon
      const allQuotations = await caller.quotations.list();
      const createdIds = [quot1.quotationId, quot2.quotationId, quot3.quotationId];
      const foundQuotations = allQuotations.filter(q => createdIds.includes(q.id));
      expect(foundQuotations.length).toBe(3);

      // Eliminar las 3 cotizaciones (simulando eliminación masiva)
      for (const id of createdIds) {
        await caller.quotations.delete({ id });
      }

      // Verificar que se eliminaron
      const remainingQuotations = await caller.quotations.list();
      const stillExists = remainingQuotations.filter(q => createdIds.includes(q.id));
      expect(stillExists.length).toBe(0);
    });
  });

  describe("Permission Checks", () => {
    it("should not allow non-admin users to delete appointments", async () => {
      // Crear usuario no-admin
      const userId = await db.createUserExtended({
        name: "User Test",
        email: `user-bulk-${Date.now()}@test.com`,
        role: "user",
        openId: `test-user-bulk-${Date.now()}`,
      });
      const regularUser = await db.getUserById(userId);

      const caller = appRouter.createCaller({
        user: regularUser,
        req: {} as any,
        res: {} as any,
      });

      // Crear cita como admin
      const adminCaller = appRouter.createCaller({
        user: testUser,
        req: {} as any,
        res: {} as any,
      });

      const apt = await adminCaller.appointments.create({
        clientId: testClient.id,
        workTypes: ["cocina"],
        scheduledDate: new Date(2026, 5, 16, 10, 0, 0, 0).toISOString(),
        notes: "Cita para test de permisos",
      });

      // Intentar eliminar como usuario regular (debe fallar)
      await expect(
        caller.appointments.delete({ id: apt.id })
      ).rejects.toThrow();

      // Limpiar: eliminar como admin
      await adminCaller.appointments.delete({ id: apt.id });
    });
  });

  describe("Bulk Delete Tasks", () => {
    it("should delete multiple tasks", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
        req: {} as any,
        res: {} as any,
      });

      // Crear 3 tareas de prueba
      const task1 = await caller.tasks.create({
        title: "Tarea 1 para eliminación masiva",
        description: "Descripción 1",
        priority: "alta",
        assignedTo: testUser.id,
      });

      const task2 = await caller.tasks.create({
        title: "Tarea 2 para eliminación masiva",
        description: "Descripción 2",
        priority: "media",
        assignedTo: testUser.id,
      });

      const task3 = await caller.tasks.create({
        title: "Tarea 3 para eliminación masiva",
        description: "Descripción 3",
        priority: "baja",
        assignedTo: testUser.id,
      });

      // Verificar que se crearon
      const allTasks = await caller.tasks.list();
      const createdIds = [task1.taskId, task2.taskId, task3.taskId];
      const foundTasks = allTasks.filter(t => createdIds.includes(t.id));
      expect(foundTasks.length).toBe(3);

      // Eliminar las 3 tareas (simulando eliminación masiva)
      for (const id of createdIds) {
        await caller.tasks.delete({ id });
      }

      // Verificar que se eliminaron
      const remainingTasks = await caller.tasks.list();
      const stillExists = remainingTasks.filter(t => createdIds.includes(t.id));
      expect(stillExists.length).toBe(0);
    });
  });
});
