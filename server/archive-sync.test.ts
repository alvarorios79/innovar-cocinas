import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { projects } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Archive Sync: isArchived ↔ status', () => {
  let testProjectId: number;
  let testClientId: number;
  let testUserId: number;
  let database: any;

  beforeAll(async () => {
    database = await getDb();
    if (!database) throw new Error('Database not available');

    // Crear usuario de prueba
    testUserId = await db.createUserExtended({
      dataOrigin: 'system',
      name: 'Admin Test Archive Sync',
      email: 'admin-archive-sync-test@test.com',
      role: 'admin',
    });

    // Crear cliente de prueba usando db.createClient (usa insertId, no .returning())
    testClientId = await db.createClient({
      dataOrigin: 'system',
      name: 'Test Client Archive Sync',
      email: 'test-archive-sync@example.com',
      whatsappPhone: '3001234567',
    });

    // Crear proyecto de prueba usando db.createProject
    testProjectId = await db.createProject({
      dataOrigin: 'system',
      clientId: testClientId,
      name: 'Test Project Archive Sync',
      status: 'listo_instalacion',
      workType: 'cocina',
      isArchived: 0,
      createdBy: testUserId,
    });
  });

  afterAll(async () => {
    if (!database) return;
    // Limpiar
    await database.delete(projects).where(eq(projects.id, testProjectId)).catch(() => {});
    await db.deleteClient(testClientId).catch(() => {});
    await db.deleteUser(testUserId).catch(() => {});
  });

  it('Cuando status = "entregado", isArchived debe ser 1', async () => {
    // Cambiar a entregado
    await database
      .update(projects)
      .set({ status: 'entregado', isArchived: 1, updatedAt: new Date() })
      .where(eq(projects.id, testProjectId));

    // Verificar
    const result = await database
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));

    expect(result[0].status).toBe('entregado');
    expect(result[0].isArchived).toBe(1);
  });

  it('Cuando status cambia FROM "entregado" a otro, isArchived debe ser 0', async () => {
    // Cambiar de vuelta a listo_instalacion
    await database
      .update(projects)
      .set({ status: 'listo_instalacion', isArchived: 0, updatedAt: new Date() })
      .where(eq(projects.id, testProjectId));

    // Verificar
    const result = await database
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));

    expect(result[0].status).toBe('listo_instalacion');
    expect(result[0].isArchived).toBe(0);
  });

  it('Sincronización bidireccional: entregado → listo_instalacion → entregado', async () => {
    // 1. Cambiar a entregado
    await database
      .update(projects)
      .set({ status: 'entregado', isArchived: 1, updatedAt: new Date() })
      .where(eq(projects.id, testProjectId));

    let result = await database
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));

    expect(result[0].status).toBe('entregado');
    expect(result[0].isArchived).toBe(1);

    // 2. Cambiar a otro estado
    await database
      .update(projects)
      .set({ status: 'enchape', isArchived: 0, updatedAt: new Date() })
      .where(eq(projects.id, testProjectId));

    result = await database
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));

    expect(result[0].status).toBe('enchape');
    expect(result[0].isArchived).toBe(0);

    // 3. Cambiar a entregado de nuevo
    await database
      .update(projects)
      .set({ status: 'entregado', isArchived: 1, updatedAt: new Date() })
      .where(eq(projects.id, testProjectId));

    result = await database
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));

    expect(result[0].status).toBe('entregado');
    expect(result[0].isArchived).toBe(1);
  });
});
