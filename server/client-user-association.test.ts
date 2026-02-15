import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Client-User Association", () => {
  let testUserId: number;
  let testCaller: any;
  let createdClientIds: number[] = [];

  beforeEach(async () => {
    // Crear un usuario de prueba único para cada test
    testUserId = await db.createUserExtended({
      name: "Usuario Prueba",
      email: `test-${Date.now()}-${Math.random()}@test.com`,
      role: "user",
    });
    
    // Obtener el usuario completo de la base de datos
    const userFromDb = await db.getUserById(testUserId);
    if (!userFromDb) {
      throw new Error("Failed to get user from database");
    }

    // Crear un caller autenticado con el usuario de prueba
    testCaller = appRouter.createCaller({
      user: userFromDb,
      req: {} as any,
      res: {} as any,
    });
    
    createdClientIds = [];
  });

  afterEach(async () => {
    // Limpiar: eliminar clientes y datos asociados creados en el test
    if (createdClientIds.length > 0) {
      const clientsDb = await db.getDb();
      if (clientsDb) {
        const { clients, appointments, projects, quotations, priorEstimates, appointmentWorkTypes } = await import("../drizzle/schema");
        const { eq, inArray } = await import("drizzle-orm");
        
        // Eliminar datos asociados a esos clientes
        for (const clientId of createdClientIds) {
          // Obtener IDs de citas para eliminar appointmentWorkTypes
          const clientAppointments = await clientsDb.select().from(appointments).where(eq(appointments.clientId, clientId));
          const appointmentIds = clientAppointments.map(a => a.id);
          
          if (appointmentIds.length > 0) {
            await clientsDb.delete(appointmentWorkTypes).where(inArray(appointmentWorkTypes.appointmentId, appointmentIds));
          }
          
          await clientsDb.delete(appointments).where(eq(appointments.clientId, clientId));
          await clientsDb.delete(projects).where(eq(projects.clientId, clientId));
          await clientsDb.delete(quotations).where(eq(quotations.clientId, clientId));
          await clientsDb.delete(priorEstimates).where(eq(priorEstimates.clientId, clientId));
          await clientsDb.delete(clients).where(eq(clients.id, clientId));
        }
        
        // Eliminar el usuario
        const { users } = await import("../drizzle/schema");
        await clientsDb.delete(users).where(eq(users.id, testUserId));
      }
    }
  });

  it("debe asociar cliente con usuario autenticado al crear cita", async () => {
    // Crear cliente como usuario autenticado
    const client = await testCaller.clients.getOrCreateByWhatsApp({
      name: "Cliente Prueba",
      whatsappPhone: `300${Date.now().toString().slice(-7)}`,
      email: "cliente@test.com",
      address: "Calle 123",
    });
    createdClientIds.push(client.id);

    // Verificar que el cliente tiene userId asociado
    expect(client.userId).toBe(testUserId);

    // Crear una cita directamente en la base de datos para evitar validaciones de disponibilidad
    const appointmentId = await db.createAppointment({
      clientId: client.id,
      workTypes: ["cocina"],
      scheduledDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días en el futuro
      notes: "Cita de prueba",
      status: "pendiente",
    });

    expect(appointmentId).toBeDefined();

    // Verificar que la cita aparece en getMyAppointments
    const myAppointments = await testCaller.appointments.getMyAppointments();
    
    expect(myAppointments.length).toBeGreaterThan(0);
    const foundAppointment = myAppointments.find((apt: any) => apt.id === appointmentId);
    expect(foundAppointment).toBeDefined();
    expect(foundAppointment?.clientId).toBe(client.id);
  });

  it("debe asociar cliente existente con usuario si no tiene userId", async () => {
    // Crear un cliente sin userId (como si fuera creado por usuario no autenticado)
    const clientId = await db.createClient({
      name: "Cliente Sin Usuario",
      whatsappPhone: `301${Date.now().toString().slice(-7)}`,
      email: "sin.usuario@test.com",
    });
    createdClientIds.push(clientId);

    let client = await db.getClientById(clientId);
    expect(client?.userId).toBeNull();

    // Ahora el usuario autenticado usa el mismo WhatsApp
    const updatedClient = await testCaller.clients.getOrCreateByWhatsApp({
      name: "Cliente Sin Usuario",
      whatsappPhone: client!.whatsappPhone,
    });

    // Verificar que ahora el cliente tiene userId asociado
    expect(updatedClient.userId).toBe(testUserId);
  });

  it("debe mostrar proyectos, cotizaciones y estimados del usuario", async () => {
    // Crear cliente asociado al usuario
    const client = await testCaller.clients.getOrCreateByWhatsApp({
      name: "Cliente Completo",
      whatsappPhone: `302${Date.now().toString().slice(-7)}`,
    });
    createdClientIds.push(client.id);

    expect(client.userId).toBe(testUserId);

    // Crear un proyecto para este cliente
    const projectId = await db.createProject({
      clientId: client.id,
      name: "Proyecto Prueba",
      workType: "cocina",
      status: "cotizacion_enviada",
      createdBy: testUserId,
    });

    // Verificar que el proyecto aparece en getMyProjects
    const myProjects = await testCaller.projects.getMyProjects();
    expect(myProjects.length).toBeGreaterThan(0);
    const foundProject = myProjects.find((p: any) => p.id === projectId);
    expect(foundProject).toBeDefined();

    // Crear una cotización para este cliente
    const quotationId = await db.createQuotation({
      clientId: client.id,
      vendorName: "Alvaro Gutierrez",
      productType: "cocina",
      status: "draft",
      subtotal: "5000000",
      total: "5600000",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      createdBy: testUserId,
    });

    // Verificar que la cotización aparece en getMyQuotations
    const myQuotations = await testCaller.quotations.getMyQuotations();
    expect(myQuotations.length).toBeGreaterThan(0);
    const foundQuotation = myQuotations.find((q: any) => q.id === quotationId);
    expect(foundQuotation).toBeDefined();

    // Crear un estimado previo para este cliente
    const estimateId = await db.createPriorEstimate({
      clientId: client.id,
      workType: "cocina",
      estimatedPrice: "3000000",
    });

    // Verificar que el estimado aparece en getMyEstimates
    const myEstimates = await testCaller.estimates.getMyEstimates();
    expect(myEstimates.length).toBeGreaterThan(0);
    const foundEstimate = myEstimates.find((e: any) => e.id === estimateId);
    expect(foundEstimate).toBeDefined();
  });
});
