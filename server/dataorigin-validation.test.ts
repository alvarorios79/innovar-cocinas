import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createProject, getDb } from "./db";
import { projects } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("dataOrigin Validation Rules", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Cleanup: Delete test projects
    if (db) {
      await db.delete(projects).where(
        eq(projects.name, "TEST-VALIDATION-PROJECT")
      );
    }
  });

  it("should allow creating project with dataOrigin='manual' and no TEST in name", async () => {
    const result = await createProject(
      {
        name: "Regular Project",
        clientId: 1,
        totalAmount: 100000,
        status: "cotizacion_enviada",
        createdBy: 1,
      },
      "manual"
    );
    expect(result).toBeGreaterThan(0);
  });

  it("should reject creating project with TEST in name but dataOrigin='manual'", async () => {
    expect(() => {
      return createProject(
        {
          name: "TEST-VALIDATION-PROJECT",
          clientId: 1,
          totalAmount: 100000,
          status: "cotizacion_enviada",
          createdBy: 1,
        },
        "manual"
      );
    }).rejects.toThrow(
      "Los proyectos con TEST en el nombre DEBEN tener dataOrigin = test"
    );
  });

  it("should allow creating project with TEST in name and dataOrigin='test'", async () => {
    const result = await createProject(
      {
        name: "TEST-VALIDATION-PROJECT",
        clientId: 1,
        totalAmount: 100000,
        status: "cotizacion_enviada",
        createdBy: 1,
      },
      "test"
    );
    expect(result).toBeGreaterThan(0);
  });

  it("should reject creating project with dataOrigin='test' but no TEST in name", async () => {
    expect(() => {
      return createProject(
        {
          name: "Regular Project",
          clientId: 1,
          totalAmount: 100000,
          status: "cotizacion_enviada",
          createdBy: 1,
        },
        "test"
      );
    }).rejects.toThrow(
      "Los proyectos con dataOrigin = test DEBEN tener TEST en el nombre"
    );
  });

  it("should reject creating project with dataOrigin='system' but no SYSTEM in name", async () => {
    expect(() => {
      return createProject(
        {
          name: "Regular Project",
          clientId: 1,
          totalAmount: 100000,
          status: "cotizacion_enviada",
          createdBy: 1,
        },
        "system"
      );
    }).rejects.toThrow(
      "Los proyectos con dataOrigin = system DEBEN tener SYSTEM en el nombre"
    );
  });

  it("should allow creating project with SYSTEM in name and dataOrigin='system'", async () => {
    const result = await createProject(
      {
        name: "SYSTEM-AUTO-PROJECT",
        clientId: 1,
        totalAmount: 100000,
        status: "cotizacion_enviada",
        createdBy: 1,
      },
      "system"
    );
    expect(result).toBeGreaterThan(0);
  });
});
