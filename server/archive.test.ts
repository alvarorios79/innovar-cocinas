import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { getDb } from "./db";
import { projects, quotations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Archive functionality", () => {
  let testProjectId: number;
  let testQuotationId: number;
  let testClientId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Crear usuario de prueba
    testUserId = await db.createUserExtended({
      dataOrigin: 'system',
      name: "Admin Test Archive",
      email: "admin-archive-test@test.com",
      role: "admin",
    });

    // Crear cliente de prueba usando db.createClient (usa insertId, no .returning())
    testClientId = await db.createClient({
      dataOrigin: 'system',
      name: "Test Client Archive",
      email: "test-archive@example.com",
      whatsappPhone: "3001234567",
    });

    // Crear proyecto de prueba usando db.createProject
    testProjectId = await db.createProject({
      dataOrigin: 'system',
      clientId: testClientId,
      name: "Test Project Archive",
      status: "entregado",
      workType: "cocina",
      isArchived: 0,
      createdBy: testUserId,
    });

    // Crear cotización de prueba usando db.createQuotation
    testQuotationId = await db.createQuotation({
      dataOrigin: 'system',
      clientId: testClientId,
      vendorName: "Test Vendor",
      workType: "cocina",
      status: "draft",
      subtotal: "1000000",
      total: "1000000",
      createdBy: testUserId,
    });
  });

  afterAll(async () => {
    const database = await getDb();
    if (!database) return;

    await database.delete(projects).where(eq(projects.id, testProjectId)).catch(() => {});
    await database.delete(quotations).where(eq(quotations.id, testQuotationId)).catch(() => {});
    await db.deleteClient(testClientId).catch(() => {});
    await db.deleteUser(testUserId).catch(() => {});
  });

  it("should archive a project and include it in archived results", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Archivar proyecto
    await db.updateProject(testProjectId, { isArchived: 1 });

    // Verificar que está archivado en BD
    const archivedProject = await database
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId))
      .limit(1);
    expect(archivedProject[0].isArchived).toBe(1);

    // Verificar que NO aparece en resultados activos
    const activeResults = await db.getAllProjectsPaginated({
      archived: false,
    });
    const foundInActive = (activeResults?.data || []).some(
      (p) => p.id === testProjectId
    );
    expect(foundInActive).toBe(false);

    // Verificar que SÍ aparece en resultados archivados
    const archivedResults = await db.getAllProjectsPaginated({
      archived: true,
    });
    const foundInArchived = (archivedResults?.data || []).some(
      (p) => p.id === testProjectId
    );
    expect(foundInArchived).toBe(true);
  });

  it("should archive a quotation and include it in archived results", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Archivar cotización
    await database
      .update(quotations)
      .set({ isArchived: 1 })
      .where(eq(quotations.id, testQuotationId));

    // Verificar que está archivada en BD
    const archivedQuotation = await database
      .select()
      .from(quotations)
      .where(eq(quotations.id, testQuotationId))
      .limit(1);
    expect(archivedQuotation[0].isArchived).toBe(1);

    // Verificar que NO aparece en resultados activos
    const activeResults = await db.getAllQuotationsGroupedByBase({
      archived: false,
    });
    const foundInActive = (activeResults?.data || []).some(
      (group) => group.baseQuotationId === testQuotationId
    );
    expect(foundInActive).toBe(false);

    // Verificar que SÍ aparece en resultados archivados
    const archivedResults = await db.getAllQuotationsGroupedByBase({
      archived: true,
    });
    const foundInArchived = archivedResults.data.some(
      (group) => group.baseQuotationId === testQuotationId
    );
    expect(foundInArchived).toBe(true);
  });

  it("should unarchive a project and remove it from archived results", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Desarchivar proyecto
    await db.updateProject(testProjectId, { isArchived: 0 });

    // Verificar que NO está archivado
    const project = await database
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId))
      .limit(1);
    expect(project[0].isArchived).toBe(0);

    // Verificar que aparece en resultados activos
    const activeResults = await db.getAllProjectsPaginated({
      archived: false,
    });
    const foundInActive = activeResults.data.some(
      (p) => p.id === testProjectId
    );
    expect(foundInActive).toBe(true);

    // Verificar que NO aparece en resultados archivados
    const archivedResults = await db.getAllProjectsPaginated({
      archived: true,
    });
    const foundInArchived = archivedResults.data.some(
      (p) => p.id === testProjectId
    );
    expect(foundInArchived).toBe(false);
  });

  it("should return only active quotations by default", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Archivar cotización
    await database
      .update(quotations)
      .set({ isArchived: 1 })
      .where(eq(quotations.id, testQuotationId));

    // Obtener sin especificar archived (debe devolver solo activas)
    const defaultResults = await db.getAllQuotationsGroupedByBase({});

    // Verificar que NO incluye archivadas
    const foundInDefault = defaultResults.data.some(
      (group) => group.baseQuotationId === testQuotationId
    );
    expect(foundInDefault).toBe(false);

    // Limpiar
    await database
      .update(quotations)
      .set({ isArchived: 0 })
      .where(eq(quotations.id, testQuotationId));
  });

  it("should return all projects when archived is not specified", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Archivar proyecto
    await db.updateProject(testProjectId, { isArchived: 1 });

    // Obtener todos sin especificar archived
    const allResults = await db.getAllProjectsPaginated({});

    // Verificar que incluye tanto archivados como activos
    const foundProject = allResults.data.some(
      (p) => p.id === testProjectId
    );
    expect(foundProject).toBe(true);

    // Limpiar
    await db.updateProject(testProjectId, { isArchived: 0 });
  });
});
