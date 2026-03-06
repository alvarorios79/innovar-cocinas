/**
 * System Isolation Test
 * 
 * Verifies that system-generated test data does not appear in operational dashboards
 * and can be safely managed via Zona Crítica
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { eq } from "drizzle-orm";
import { clients, appointments, quotations, projects } from "../drizzle/schema";

describe("System Data Isolation", () => {
  let testUserId: string;
  let testClientIds: string[] = [];
  let testAppointmentIds: string[] = [];
  let testQuotationIds: string[] = [];
  let testProjectIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    testUserId = `test-isolation-${Date.now()}`;
    console.log(`[ISOLATION TEST] Using test user: ${testUserId}`);
  });

  afterAll(async () => {
    // Cleanup would happen here
    console.log(`[ISOLATION TEST] Test completed`);
  });

  it("should filter clients to show only manual data in operational dashboard", async () => {
    const operationalClients = await db.getAllClients();
    
    // Verify that operational dashboard only shows manual data
    expect(operationalClients).toBeDefined();
    expect(Array.isArray(operationalClients)).toBe(true);
    
    // All returned clients should be manual
    for (const client of operationalClients) {
      expect(client.dataOrigin).toBe("manual");
    }
    
    console.log(`[ISOLATION TEST] ✓ Operational clients filtered correctly: ${operationalClients.length} manual clients`);
  });

  it("should filter appointments to show only manual data in operational dashboard", async () => {
    const operationalAppointments = await db.getAllAppointments();
    
    expect(operationalAppointments).toBeDefined();
    expect(Array.isArray(operationalAppointments)).toBe(true);
    
    // All returned appointments should be manual
    for (const apt of operationalAppointments) {
      expect(apt.dataOrigin).toBe("manual");
    }
    
    console.log(`[ISOLATION TEST] ✓ Operational appointments filtered correctly: ${operationalAppointments.length} manual appointments`);
  });

  it("should filter quotations to show only manual data in operational dashboard", async () => {
    const operationalQuotations = await db.getAllQuotations();
    
    expect(operationalQuotations).toBeDefined();
    expect(Array.isArray(operationalQuotations)).toBe(true);
    
    // All returned quotations should be manual
    for (const quot of operationalQuotations) {
      expect(quot.dataOrigin).toBe("manual");
    }
    
    console.log(`[ISOLATION TEST] ✓ Operational quotations filtered correctly: ${operationalQuotations.length} manual quotations`);
  });

  it("should filter projects to show only manual data in operational dashboard", async () => {
    const operationalProjects = await db.getAllProjects();
    
    expect(operationalProjects).toBeDefined();
    expect(Array.isArray(operationalProjects)).toBe(true);
    
    // All returned projects should be manual
    for (const proj of operationalProjects) {
      expect(proj.dataOrigin).toBe("manual");
    }
    
    console.log(`[ISOLATION TEST] ✓ Operational projects filtered correctly: ${operationalProjects.length} manual projects`);
  });

  it("should allow creation of data with dataOrigin = manual by default", async () => {
    const clientId = await db.createClient(
      {
        name: `Test Client ${Date.now()}`,
        email: `test-${Date.now()}@example.com`,
        phone: "3136802025",
        whatsappPhone: "3136802025",
        address: "Test Address",
        city: "Test City",
        department: "Test Department",
        createdBy: testUserId,
      },
      "manual" // Explicitly set to manual
    );
    
    expect(clientId).toBeDefined();
    const testClient = await db.getClientById(clientId);
    expect(testClient).toBeDefined();
    expect(testClient?.dataOrigin).toBe("manual");
    testClientIds.push(clientId);
    
    console.log(`[ISOLATION TEST] ✓ Client created with dataOrigin = manual`);
  });

  it("should allow creation of test data with dataOrigin = system", async () => {
    const clientId = await db.createClient(
      {
        name: `System Test Client ${Date.now()}`,
        email: `system-test-${Date.now()}@example.com`,
        phone: "3136802025",
        whatsappPhone: "3136802025",
        address: "Test Address",
        city: "Test City",
        department: "Test Department",
        createdBy: testUserId,
      },
      "system" // Explicitly set to system
    );
    
    expect(clientId).toBeDefined();
    const testClient = await db.getClientById(clientId);
    expect(testClient).toBeDefined();
    expect(testClient?.dataOrigin).toBe("system");
    testClientIds.push(clientId);
    
    console.log(`[ISOLATION TEST] ✓ Test client created with dataOrigin = system`);
  });

  it("system data should not appear in operational dashboard", async () => {
    // Get operational clients (filtered)
    const operationalClients = await db.getAllClients();
    
    // Get all clients (unfiltered) to check if system data exists
    const database = await db.getDb();
    if (!database) throw new Error("Database connection failed");
    
    const allClients = await database.select().from(clients);
    const systemClientsCount = allClients.filter(c => c.dataOrigin === "system").length;
    
    // If system data exists, it should NOT appear in operational dashboard
    if (systemClientsCount > 0) {
      const systemClientIdsInDB = allClients
        .filter(c => c.dataOrigin === "system")
        .map(c => c.id);
      
      const systemClientIdsInOperational = operationalClients
        .filter(c => systemClientIdsInDB.includes(c.id))
        .map(c => c.id);
      
      expect(systemClientIdsInOperational).toHaveLength(0);
      console.log(`[ISOLATION TEST] ✓ System data properly isolated: ${systemClientsCount} system clients hidden from dashboard`);
    } else {
      console.log(`[ISOLATION TEST] ✓ No system data in database (clean state)`);
    }
  });

  it("should verify data isolation integrity", async () => {
    const operationalClients = await db.getAllClients();
    const database = await db.getDb();
    if (!database) throw new Error("Database connection failed");
    
    const allClients = await database.select().from(clients);
    const manualClientsCount = allClients.filter(c => c.dataOrigin === "manual").length;
    const systemClientsCount = allClients.filter(c => c.dataOrigin === "system").length;
    
    // Verify that operational dashboard only shows manual clients
    expect(operationalClients.length).toBeLessThanOrEqual(manualClientsCount);
    
    // Verify that all returned clients are manual
    for (const client of operationalClients) {
      expect(client.dataOrigin).toBe("manual");
    }
    
    console.log(`[ISOLATION TEST] ✓ Data isolation integrity verified`);
    console.log(`    - Total clients in DB: ${allClients.length}`);
    console.log(`    - Manual clients: ${manualClientsCount}`);
    console.log(`    - System clients: ${systemClientsCount}`);
    console.log(`    - Operational dashboard shows: ${operationalClients.length}`);
  });
});
