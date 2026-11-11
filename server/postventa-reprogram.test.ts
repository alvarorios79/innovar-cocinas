import { describe, it, expect, vi } from "vitest";

vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async () => 0),
  sendPushToRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
}));

import { eq, inArray, sql } from "drizzle-orm";
import { getDb, getUsersByRole } from "./db";
import { projects, clients, postventaReclamaciones } from "../drizzle/schema";
import { buildPlan, realDelivery, runPostventaReprogramOnce, REPROGRAM_FLAG } from "./postventa-reprogram";

const NOW = new Date("2026-11-10T15:00:00Z");

describe("Reprogramación de postventa — reglas", () => {
  it("fecha real: calendario si ya pasó; proyectos 1–9 usan la registrada", () => {
    expect(realDelivery({ id: 32, deliveredAt: "2026-09-22 10:00:00", estimatedInstallDate: "2026-10-28 00:00:00" }, NOW)).toMatchObject({ source: "calendario" });
    expect(realDelivery({ id: 5, deliveredAt: "2026-03-09 10:00:00", estimatedInstallDate: "2026-04-15 00:00:00" }, NOW)).toMatchObject({ source: "registrada" });
    expect(realDelivery({ id: 40, deliveredAt: "2026-11-01 10:00:00", estimatedInstallDate: "2026-12-20 00:00:00" }, NOW)).toMatchObject({ source: "registrada" });
  });

  it("sin llamada del mes si ya pasó; revisiones desde el 15 de enero 2027, martes o jueves, una por día", () => {
    const plan = buildPlan([
      { id: 32, deliveredAt: "2026-09-22", estimatedInstallDate: "2026-10-28" }, // mes aún no se cumple → llamada
      { id: 21, deliveredAt: "2026-05-25", estimatedInstallDate: "2026-07-02" }, // mes ya pasó → sin llamada
      ...[1, 2, 3, 4, 5].map((id) => ({ id, deliveredAt: "2026-03-09", estimatedInstallDate: "2026-04-15" })),
    ], NOW);
    expect(plan.find((r) => r.projectId === 32)!.followUp).toBeTruthy();
    expect(plan.find((r) => r.projectId === 21)!.followUp).toBeNull();
    const days = plan.map((r) => r.annual!.slice(0, 10));
    expect(new Set(days).size).toBe(days.length); // una por día
    for (const r of plan) {
      const d = new Date(r.annual!);
      expect(d >= new Date("2027-01-15T00:00:00Z")).toBe(true);
      expect([2, 4]).toContain(d.getUTCDay());
      expect(d.getTime()).toBeGreaterThanOrEqual(new Date(r.realDate!).getTime() + 364 * 86400000); // nunca antes del año
    }
  });
});

describe("Reprogramación de postventa — en la base", () => {
  it("quita duplicados, crea lo nuevo y corre una sola vez", { timeout: 120000 }, async () => {
    const db = (await getDb())!;
    await db.execute(sql`DELETE FROM "appFlags" WHERE "name" = ${REPROGRAM_FLAG}`);
    const owner = (await getUsersByRole("super_admin"))[0];
    const [c] = await db.insert(clients).values({ name: "Cliente Reprogramación", whatsappPhone: "3007770000" } as any).returning({ id: clients.id });
    const [p] = await db.insert(projects).values({
      clientId: c.id, name: "Proyecto Reprogramación", workType: "cocina", status: "entregado", createdBy: owner.id,
      deliveredAt: "2026-09-17 10:00:00", estimatedInstallDate: "2026-10-23 00:00:00",
    } as any).returning({ id: projects.id });
    const dup = { projectId: p.id, title: "x", status: "pendiente", priority: "media", createdBy: owner.id, scheduledFor: "2026-10-17 10:00:00" };
    await db.insert(postventaReclamaciones).values([
      { ...dup, type: "seguimiento_30d" }, { ...dup, type: "seguimiento_30d" },
      { ...dup, type: "revision_anual" }, { ...dup, type: "revision_anual" },
    ] as any);

    const r = await runPostventaReprogramOnce(NOW);
    expect(r).not.toBeNull();
    const recs = await db.select().from(postventaReclamaciones).where(eq(postventaReclamaciones.projectId, p.id));
    expect(recs.filter((x) => x.type === "revision_anual").length).toBe(1);
    expect(recs.filter((x) => x.type === "seguimiento_30d").length).toBe(1); // 23 oct + 30 días = 22 nov, aún no pasa
    const [row] = await db.select().from(projects).where(eq(projects.id, p.id));
    expect(String(row.deliveredAt).slice(0, 10)).toBe("2026-10-23");

    expect(await runPostventaReprogramOnce(NOW)).toBeNull(); // segunda vez: no hace nada
    expect((await db.select().from(postventaReclamaciones).where(eq(postventaReclamaciones.projectId, p.id))).length).toBe(2);

    await db.delete(postventaReclamaciones).where(inArray(postventaReclamaciones.projectId, [p.id]));
    await db.execute(sql`DELETE FROM "appFlags" WHERE "name" = ${REPROGRAM_FLAG}`);
  });
});
