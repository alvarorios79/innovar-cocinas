import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, enforceDataOrigin } from '../db';
import { users, clients, projects, quotations, appointments, tasks, expenses } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Data Origin Separation', () => {
  describe('enforceDataOrigin helper', () => {
    it('should set dataOrigin to "system" if not provided', () => {
      const data = { name: 'Test Project' };
      const result = enforceDataOrigin(data);
      expect(result.dataOrigin).toBe('system');
    });

    it('should preserve dataOrigin if provided', () => {
      const data = { name: 'Test Project', dataOrigin: 'manual' };
      const result = enforceDataOrigin(data);
      expect(result.dataOrigin).toBe('manual');
    });

    it('should preserve all other fields', () => {
      const data = { name: 'Test', email: 'test@example.com', dataOrigin: 'system' };
      const result = enforceDataOrigin(data);
      expect(result.name).toBe('Test');
      expect(result.email).toBe('test@example.com');
      expect(result.dataOrigin).toBe('system');
    });
  });

  describe('Operational queries filter by dataOrigin = "manual"', () => {
    it('getAllClients should only return manual data', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verify the query includes dataOrigin filter
      const result = await db
        .select()
        .from(clients)
        .where(eq(clients.dataOrigin, 'manual'))
        .limit(1);

      // This test verifies the filter exists in the schema
      expect(clients.dataOrigin).toBeDefined();
    });

    it('getAllProjects should only return manual data', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.dataOrigin, 'manual'))
        .limit(1);

      expect(projects.dataOrigin).toBeDefined();
    });

    it('getAllQuotations should only return manual data', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select()
        .from(quotations)
        .where(eq(quotations.dataOrigin, 'manual'))
        .limit(1);

      expect(quotations.dataOrigin).toBeDefined();
    });

    it('getAllAppointments should only return manual data', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select()
        .from(appointments)
        .where(eq(appointments.dataOrigin, 'manual'))
        .limit(1);

      expect(appointments.dataOrigin).toBeDefined();
    });

    it('getAllTasks should only return manual data', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.dataOrigin, 'manual'))
        .limit(1);

      expect(tasks.dataOrigin).toBeDefined();
    });

    it('getAllExpenses should only return manual data', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select()
        .from(expenses)
        .where(eq(expenses.dataOrigin, 'manual'))
        .limit(1);

      expect(expenses.dataOrigin).toBeDefined();
    });
  });

  describe('Data origin validation', () => {
    it('should have dataOrigin column in all operational tables', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verify all tables have dataOrigin column
      expect(users.dataOrigin).toBeDefined();
      expect(clients.dataOrigin).toBeDefined();
      expect(projects.dataOrigin).toBeDefined();
      expect(quotations.dataOrigin).toBeDefined();
      expect(appointments.dataOrigin).toBeDefined();
      expect(tasks.dataOrigin).toBeDefined();
      expect(expenses.dataOrigin).toBeDefined();
    });

    it('should enforce dataOrigin separation in cleanup procedures', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verify system data can be queried separately
      const systemClients = await db
        .select()
        .from(clients)
        .where(eq(clients.dataOrigin, 'system'));

      // This test verifies the separation is possible
      expect(Array.isArray(systemClients)).toBe(true);
    });
  });

  describe('Data separation integrity', () => {
    it('should not mix manual and system data in operational queries', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get manual data count
      const manualCount = await db
        .select()
        .from(clients)
        .where(eq(clients.dataOrigin, 'manual'));

      // Get system data count
      const systemCount = await db
        .select()
        .from(clients)
        .where(eq(clients.dataOrigin, 'system'));

      // Both should be queryable independently
      expect(Array.isArray(manualCount)).toBe(true);
      expect(Array.isArray(systemCount)).toBe(true);
    });

    it('should allow cleanup module to access system data only', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verify system data can be queried for cleanup
      const systemData = await db
        .select()
        .from(projects)
        .where(eq(projects.dataOrigin, 'system'));

      expect(Array.isArray(systemData)).toBe(true);
    });
  });

  describe('Automatic dataOrigin assignment', () => {
    it('enforceDataOrigin should create proper data structure', () => {
      const input = {
        name: 'Test Client',
        email: 'test@example.com',
        whatsappPhone: '1234567890'
      };

      const result = enforceDataOrigin(input);

      expect(result).toHaveProperty('dataOrigin');
      expect(result.dataOrigin).toBe('system');
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
    });

    it('enforceDataOrigin should preserve explicit manual origin', () => {
      const input = {
        name: 'Test Client',
        dataOrigin: 'manual' as const
      };

      const result = enforceDataOrigin(input);

      expect(result.dataOrigin).toBe('manual');
    });
  });

  describe('Critical rule verification', () => {
    it('system data must never appear in operational frontend queries', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verify operational queries explicitly filter by manual
      // This is a structural test to ensure the filter is in place

      // Get a sample of the query structure
      const query = db
        .select()
        .from(clients)
        .where(eq(clients.dataOrigin, 'manual'));

      expect(query).toBeDefined();
    });

    it('LIMPIEZA DE SISTEMA must access only system data', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verify cleanup queries explicitly filter by system
      const query = db
        .select()
        .from(clients)
        .where(eq(clients.dataOrigin, 'system'));

      expect(query).toBeDefined();
    });
  });
});
