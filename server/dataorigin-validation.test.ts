import { describe, it, expect, afterAll } from "vitest";
import { createProject, getDb } from "./db";
import { projects } from "../drizzle/schema";
import { inArray } from "drizzle-orm";

/**
 * Reglas de dataOrigin al crear proyectos (db.createProject).
 * La BD solo admite 'manual' y 'system' (enum data_origin). Desde nov 2026 un nombre con
 * "TEST" (p. ej. cliente "Testa") ya NO impide crear el proyecto.
 */
describe("dataOrigin Validation Rules", () => {
  const created: number[] = [];
  const base = { clientId: 1, workType: "cocina", status: "cotizacion_enviada", createdBy: 1 } as any;

  afterAll(async () => {
    const db = await getDb();
    if (db && created.length) await db.delete(projects).where(inArray(projects.id, created));
  });

  it("permite un proyecto manual normal", async () => {
    const id = await createProject({ ...base, name: "Proyecto Normal" }, "manual");
    created.push(id);
    expect(id).toBeGreaterThan(0);
  });

  it("permite un proyecto manual cuyo nombre contiene TEST (p. ej. cliente Testa)", async () => {
    const id = await createProject({ ...base, name: "COT-2026-1 - Maria Testa" }, "manual");
    created.push(id);
    expect(id).toBeGreaterThan(0);
  });

  it("rechaza dataOrigin 'test' (no existe en la base de datos)", async () => {
    await expect(createProject({ ...base, name: "TEST X" }, "test")).rejects.toThrow("no existe en la base de datos");
  });

  it("exige SYSTEM en el nombre para dataOrigin 'system'", async () => {
    await expect(createProject({ ...base, name: "Sin la palabra" }, "system")).rejects.toThrow("SYSTEM");
    const id = await createProject({ ...base, name: "SYSTEM Proyecto" }, "system");
    created.push(id);
    expect(id).toBeGreaterThan(0);
  });
});
