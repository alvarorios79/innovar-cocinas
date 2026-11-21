import { describe, it, expect, vi } from "vitest";

// Los avisos se guardan en la campanita de verdad (para comprobar que se borran), pero sin push
vi.mock("./push-notifications", async () => {
  const db = await import("./db");
  return {
    createAndSendNotification: vi.fn(async (userId: number, n: any) => {
      await db.createNotification({ userId, title: n.title, body: n.body, type: n.type, referenceId: n.referenceId, referenceType: n.referenceType });
      return 1;
    }),
    sendPushToRole: vi.fn(async () => undefined),
    sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
  };
});

import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb, getUsersByRole } from "./db";
import { users, projects, clients, postventaReclamaciones, notifications } from "../drizzle/schema";
import { sendDuePostventaReminders } from "./postventa-reminders";
import { runMigrations } from "./migrations";
import { warrantyInfo, splitClaimPhotos, followUp30Message, POSTVENTA_REF } from "@shared/postventa";

const caller = (user: any) => appRouter.createCaller({ user, req: { ip: "test-postventa" } as any, res: {} as any } as any);

describe("Postventa — reglas", () => {
  it("garantía de 6 meses para todo", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(warrantyInfo(new Date("2026-10-01T12:00:00Z"), now).status).toBe("vigente");
    expect(warrantyInfo(new Date("2026-05-25T12:00:00Z"), now).status).toBe("por_vencer");
    expect(warrantyInfo(new Date("2026-04-01T12:00:00Z"), now).status).toBe("vencida");
    expect(warrantyInfo(null, now).status).toBe("sin_fecha");
  });
  it("mensajes y fotos", () => {
    expect(followUp30Message("Ana María", "https://g.page/x")).toContain("Hola Ana");
    expect(splitClaimPhotos("Se cayó una puerta\n📷 https://f/a.jpg")).toEqual({ text: "Se cayó una puerta", photos: ["https://f/a.jpg"] });
  });
});

describe("Postventa — avisos y reporte del cliente", () => {
  it("avisa el seguimiento vencido una sola vez y lo borra a todos cuando alguien lo hace", { timeout: 120000 }, async () => {
    await runMigrations();
    const db = (await getDb())!;
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.role, "super_admin")).limit(1);
    const [client] = await db.insert(clients).values({ name: "Cliente Postventa Prueba", whatsappPhone: "3001231234" } as any).returning({ id: clients.id });
    const [project] = await db.insert(projects).values({
      clientId: client.id, name: "Proyecto Postventa Prueba", workType: "cocina", status: "entregado", createdBy: owner.id, publicToken: "tok-postventa-prueba",
    } as any).returning({ id: projects.id });
    const [rec] = await db.insert(postventaReclamaciones).values({
      projectId: project.id, title: "Llamada de seguimiento", type: "seguimiento_30d", status: "pendiente", priority: "media",
      scheduledFor: new Date(Date.now() - 86400000).toISOString(), createdBy: owner.id,
    } as any).returning({ id: postventaReclamaciones.id });

    const avisos = () => db.select().from(notifications).where(and(eq(notifications.referenceType, POSTVENTA_REF), eq(notifications.referenceId, rec.id)));
    expect(await sendDuePostventaReminders()).toBeGreaterThanOrEqual(1);
    const primeros = await avisos();
    expect(primeros.length).toBeGreaterThan(0);
    const supers = (await getUsersByRole("super_admin")).map((u: any) => u.id);
    expect(primeros.some((n) => supers.includes(n.userId))).toBe(true); // Álvaro (super_admin) también recibe
    await sendDuePostventaReminders();
    expect((await avisos()).length).toBe(primeros.length); // no se repite
    // Si alguien limpia la campanita, el aviso tampoco vuelve (queda guardado que ya se avisó)
    await db.delete(notifications).where(and(eq(notifications.referenceType, POSTVENTA_REF), eq(notifications.referenceId, rec.id)));
    await sendDuePostventaReminders();
    expect((await avisos()).length).toBe(0);

    // Martha (admin) lo hace → se le borra a todos, también a Álvaro
    await caller({ id: owner.id, role: "admin", name: "Martha" }).postventa.update({ id: rec.id, status: "resuelto", resolvedNotes: "Todo bien" });
    expect((await avisos()).length).toBe(0);

    // El cliente reporta un problema desde su enlace
    const pub = caller(null);
    await expect(pub.postventa.publicReport({ projectId: project.id, token: "malo", name: "Ana", description: "La puerta no cierra" })).rejects.toThrow();
    await pub.postventa.publicReport({ projectId: project.id, token: "tok-postventa-prueba", name: "Ana", description: "La puerta no cierra bien" });
    const [claim] = await db.select().from(postventaReclamaciones).where(and(eq(postventaReclamaciones.projectId, project.id), eq(postventaReclamaciones.type, "reclamacion")));
    expect(claim.title).toContain("La puerta no cierra bien");
    expect(claim.priority).toBe("alta");
    expect((await db.select().from(notifications).where(and(eq(notifications.referenceType, POSTVENTA_REF), eq(notifications.referenceId, claim.id)))).length).toBeGreaterThan(0);

    const ids = [rec.id, claim.id];
    await db.delete(notifications).where(and(eq(notifications.referenceType, POSTVENTA_REF), inArray(notifications.referenceId, ids)));
    await db.delete(postventaReclamaciones).where(inArray(postventaReclamaciones.id, ids));
  });

  it("un cliente con varios proyectos recibe UN solo aviso y al resolverlo quedan cubiertos los demás", { timeout: 120000 }, async () => {
    await runMigrations();
    const db = (await getDb())!;
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.role, "super_admin")).limit(1);
    const [client] = await db.insert(clients).values({ name: "Cliente Dos Proyectos", whatsappPhone: "3001239999" } as any).returning({ id: clients.id });
    const ps: number[] = [];
    const recs: number[] = [];
    for (const [i, n] of ["Cocina", "Closet"].entries()) {
      const [p] = await db.insert(projects).values({ clientId: client.id, name: `${n} Prueba Dos`, workType: "cocina", status: "entregado", createdBy: owner.id, publicToken: `tok-dos-${i}-${Date.now()}` } as any).returning({ id: projects.id });
      ps.push(p.id);
      const [r] = await db.insert(postventaReclamaciones).values({ projectId: p.id, title: "Mensaje del mes", type: "seguimiento_30d", status: "pendiente", priority: "media",
        scheduledFor: new Date(Date.now() - (i + 1) * 86400000).toISOString(), createdBy: owner.id } as any).returning({ id: postventaReclamaciones.id });
      recs.push(r.id);
    }
    try {
      await sendDuePostventaReminders();
      const avisos = await db.select().from(notifications).where(and(eq(notifications.referenceType, POSTVENTA_REF), inArray(notifications.referenceId, recs)));
      expect(new Set(avisos.map((a) => a.referenceId)).size).toBe(1); // solo un proyecto avisa
      // Se resuelve el avisado → el otro queda cubierto
      await caller({ id: owner.id, role: "admin", name: "Martha" }).postventa.update({ id: avisos[0].referenceId as number, status: "resuelto", resolvedNotes: "ok" });
      const filas = await db.select().from(postventaReclamaciones).where(inArray(postventaReclamaciones.id, recs));
      expect(filas.every((f) => f.status === "resuelto")).toBe(true);
    } finally {
      await db.delete(notifications).where(and(eq(notifications.referenceType, POSTVENTA_REF), inArray(notifications.referenceId, recs)));
      await db.delete(postventaReclamaciones).where(inArray(postventaReclamaciones.id, recs));
      await db.delete(projects).where(inArray(projects.id, ps));
      await db.delete(clients).where(eq(clients.id, client.id));
    }
  });
});
