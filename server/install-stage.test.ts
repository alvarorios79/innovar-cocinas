import { it, expect, vi } from "vitest";

vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async () => 0),
  sendPushToRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
}));

import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb, getUsersByRole } from "./db";
import { projects, clients } from "../drizzle/schema";

// La etapa "Instalando" (trabajando_instalacion) no existía en la BD y el cambio fallaba al guardar (10 nov 2026)
it("un proyecto pasa de Listo para instalación a Instalando y se guarda", { timeout: 60000 }, async () => {
  const db = (await getDb())!;
  const owner = (await getUsersByRole("super_admin"))[0];
  const [c] = await db.insert(clients).values({ name: "Cliente Etapa Instalando", whatsappPhone: "3001110000" } as any).returning({ id: clients.id });
  const [p] = await db.insert(projects).values({
    clientId: c.id, name: "Proyecto Etapa Instalando", workType: "cocina", status: "listo_instalacion", createdBy: owner.id,
  } as any).returning({ id: projects.id });
  const caller = appRouter.createCaller({ user: { id: owner.id, role: "super_admin", name: "Álvaro" } as any, req: { headers: { origin: "http://localhost:3000" }, ip: "test" } as any, res: {} as any } as any);
  await caller.projects.updateStatus({ projectId: p.id, newStatus: "trabajando_instalacion" });
  const [row] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, p.id));
  expect(row.status).toBe("trabajando_instalacion");
});

it("si vuelve de Entregado a Instalando, se quita la fecha de entrega y los seguimientos pendientes", { timeout: 60000 }, async () => {
  const { postventaReclamaciones } = await import("../drizzle/schema");
  const { validateStatusChange } = await import("./routers/helpers");
  expect(validateStatusChange("jefe_taller", "listo_instalacion", "trabajando_instalacion")).toBe(true);
  expect(validateStatusChange("jefe_taller", "trabajando_instalacion", "entregado")).toBe(true);
  expect(validateStatusChange("jefe_taller", "listo_instalacion", "entregado")).toBe(true);

  const db = (await getDb())!;
  const owner = (await getUsersByRole("super_admin"))[0];
  const [c] = await db.insert(clients).values({ name: "Cliente Reabierto", whatsappPhone: "3001110001" } as any).returning({ id: clients.id });
  const [p] = await db.insert(projects).values({
    clientId: c.id, name: "Proyecto Reabierto", workType: "cocina", status: "entregado", createdBy: owner.id, deliveredAt: new Date().toISOString(),
  } as any).returning({ id: projects.id });
  await db.insert(postventaReclamaciones).values([
    { projectId: p.id, title: "Llamada", type: "seguimiento_30d", status: "pendiente", priority: "media", createdBy: owner.id },
    { projectId: p.id, title: "Revisión", type: "revision_anual", status: "pendiente", priority: "baja", createdBy: owner.id },
    { projectId: p.id, title: "Reporte", type: "reclamacion", status: "pendiente", priority: "alta", createdBy: owner.id },
  ] as any);
  const caller = appRouter.createCaller({ user: { id: owner.id, role: "super_admin", name: "Álvaro" } as any, req: { headers: { origin: "http://localhost:3000" }, ip: "test" } as any, res: {} as any } as any);
  await caller.projects.updateStatus({ projectId: p.id, newStatus: "trabajando_instalacion" });
  const [row] = await db.select().from(projects).where(eq(projects.id, p.id));
  expect(row.status).toBe("trabajando_instalacion");
  expect(row.deliveredAt).toBeNull();
  const left = await db.select().from(postventaReclamaciones).where(eq(postventaReclamaciones.projectId, p.id));
  expect(left.map((r) => r.type)).toEqual(["reclamacion"]); // los reportes del cliente no se tocan
  await db.delete(postventaReclamaciones).where(eq(postventaReclamaciones.projectId, p.id));
});

it("Retroceder desde Entregado lleva a Instalando y quita fecha y seguimientos pendientes", { timeout: 60000 }, async () => {
  const { postventaReclamaciones } = await import("../drizzle/schema");
  const db = (await getDb())!;
  const owner = (await getUsersByRole("super_admin"))[0];
  const [c] = await db.insert(clients).values({ name: "Cliente Retroceder", whatsappPhone: "3001110002" } as any).returning({ id: clients.id });
  const [p] = await db.insert(projects).values({
    clientId: c.id, name: "Proyecto Retroceder", workType: "cocina", status: "entregado", createdBy: owner.id, deliveredAt: new Date().toISOString(), isArchived: 1,
  } as any).returning({ id: projects.id });
  await db.insert(postventaReclamaciones).values({ projectId: p.id, title: "Llamada", type: "seguimiento_30d", status: "pendiente", priority: "media", createdBy: owner.id } as any);
  const caller = appRouter.createCaller({ user: { id: owner.id, role: "super_admin", name: "Álvaro" } as any, req: { headers: { origin: "http://localhost:3000" }, ip: "test" } as any, res: {} as any } as any);
  const r = await caller.projects.revertStatus({ id: p.id });
  expect(r.newStatus).toBe("trabajando_instalacion");
  const [row] = await db.select().from(projects).where(eq(projects.id, p.id));
  expect(row.deliveredAt).toBeNull();
  expect(row.isArchived).toBe(0);
  expect((await db.select().from(postventaReclamaciones).where(eq(postventaReclamaciones.projectId, p.id))).length).toBe(0);
});

it("un proyecto con cierre contable confirmado no se puede sacar de Entregado", { timeout: 60000 }, async () => {
  const { accountingClosures, accountingClosureProjects } = await import("../drizzle/schema");
  const db = (await getDb())!;
  const owner = (await getUsersByRole("super_admin"))[0];
  const [c] = await db.insert(clients).values({ name: "Cliente Con Cierre", whatsappPhone: "3001110003" } as any).returning({ id: clients.id });
  const [p] = await db.insert(projects).values({
    clientId: c.id, name: "Proyecto Con Cierre", workType: "cocina", status: "entregado", createdBy: owner.id, deliveredAt: new Date().toISOString(),
  } as any).returning({ id: projects.id });
  const [cl] = await db.insert(accountingClosures).values({ periodStart: "2026-10-01", periodEnd: "2026-10-31", status: "confirmed", createdBy: owner.id } as any).returning({ id: accountingClosures.id });
  await db.insert(accountingClosureProjects).values({ closureId: cl.id, projectId: p.id, projectName: "Proyecto Con Cierre", projectValue: "1000", totalPaid: "1000", totalExpenses: "500", profit: "500" } as any);
  const caller = appRouter.createCaller({ user: { id: owner.id, role: "super_admin", name: "Álvaro" } as any, req: { headers: { origin: "http://localhost:3000" }, ip: "test" } as any, res: {} as any } as any);
  await expect(caller.projects.revertStatus({ id: p.id })).rejects.toThrow(/cierre contable/);
  await expect(caller.projects.updateStatus({ projectId: p.id, newStatus: "trabajando_instalacion" })).rejects.toThrow(/cierre contable/);
  const [row] = await db.select().from(projects).where(eq(projects.id, p.id));
  expect(row.status).toBe("entregado");
  expect(row.deliveredAt).toBeTruthy();
  await db.delete(accountingClosureProjects).where(eq(accountingClosureProjects.closureId, cl.id));
  await db.delete(accountingClosures).where(eq(accountingClosures.id, cl.id));
});
