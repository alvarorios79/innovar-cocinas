import { describe, it, expect, afterAll, vi } from "vitest";

// Los avisos no se envían de verdad en las pruebas
vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async () => 0),
  sendPushToRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
}));

import { and, eq, like } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { tasks, users, projects } from "../drizzle/schema";

const caller = (user: { id: number; role: string; name?: string }) =>
  appRouter.createCaller({ user: user as any, req: { ip: "test" } as any, res: {} as any } as any);

async function setup() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [project] = await db.select({ id: projects.id }).from(projects).limit(1);
  const [operario] = await db.select({ id: users.id }).from(users).where(eq(users.role, "operario")).limit(1);
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
  return { db, projectId: project.id, operarioId: operario?.id ?? admin.id, adminId: admin.id };
}

const stageTasks = async (db: any, projectId: number) =>
  db.select({ id: tasks.id, assignedTo: tasks.assignedTo }).from(tasks)
    .where(and(eq(tasks.projectId, projectId), like(tasks.title, '📱 Enviar avance "Enchape"%')));

describe("Tarea de enviar avance al cliente", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  afterAll(async () => {
    if (ctx) await ctx.db.delete(tasks).where(and(eq(tasks.projectId, ctx.projectId), like(tasks.title, '📱 Enviar avance "Enchape"%')));
  });

  it("el taller crea la tarea una sola vez (no se duplica si vuelve a enviar)", { timeout: 120000 }, async () => {
    ctx = await setup();
    await ctx.db.delete(tasks).where(and(eq(tasks.projectId, ctx.projectId), like(tasks.title, '📱 Enviar avance "Enchape"%')));
    const taller = caller({ id: ctx.operarioId, role: "operario", name: "Operario prueba" });

    const first = await taller.publicGallery.notifyStageAdvance({ projectId: ctx.projectId, stageName: "enchape" });
    expect(first.adminsNotified).toBeGreaterThan(0);
    const after1 = await stageTasks(ctx.db, ctx.projectId);
    expect(after1.length).toBe(first.adminsNotified);

    const second = await taller.publicGallery.notifyStageAdvance({ projectId: ctx.projectId, stageName: "enchape" });
    expect(second.adminsNotified).toBe(0);
    expect((await stageTasks(ctx.db, ctx.projectId)).length).toBe(after1.length);
  });

  it("al hacer la tarea se borran todas sus copias (de todos los admins)", { timeout: 60000 }, async () => {
    const [one] = await stageTasks(ctx.db, ctx.projectId);
    expect(one).toBeTruthy();
    const res = await caller({ id: one.assignedTo, role: "admin" }).tasks.updateStatus({ taskId: one.id, status: "completada" });
    expect((res as any).removed).toBe(true);
    expect((await stageTasks(ctx.db, ctx.projectId)).length).toBe(0);
  });

  it("si el admin envía directo no se crea tarea y se borran las pendientes", { timeout: 120000 }, async () => {
    const taller = caller({ id: ctx.operarioId, role: "operario", name: "Operario prueba" });
    await taller.publicGallery.notifyStageAdvance({ projectId: ctx.projectId, stageName: "enchape" });
    expect((await stageTasks(ctx.db, ctx.projectId)).length).toBeGreaterThan(0);

    const res = await caller({ id: ctx.adminId, role: "admin", name: "Admin" }).publicGallery.notifyStageAdvance({ projectId: ctx.projectId, stageName: "enchape" });
    expect(res.adminsNotified).toBe(0);
    expect((await stageTasks(ctx.db, ctx.projectId)).length).toBe(0);
  });
});

describe("Cierres contables", () => {
  it("solo super_admin puede crear o confirmar cierres", async () => {
    const admin = caller({ id: 1, role: "admin" });
    await expect(admin.accountingClosures.getPendingProjects()).rejects.toThrow();
    await expect(admin.accountingClosures.confirm({ closureId: 999999 } as any)).rejects.toThrow(/permis|super|FORBIDDEN|acceso/i);
  });
});
