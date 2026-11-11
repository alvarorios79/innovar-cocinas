import { describe, it, expect } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDb, getUsersByRole } from "./db";
import { projects, clients, projectStatusHistory, postventaReclamaciones } from "../drizzle/schema";
import { buildBackfill, applyBackfill } from "./postventa-backfill";

const DAY = 86400000;

describe("Ajuste de garantías de proyectos entregados antes del módulo", () => {
  it("usa la fecha real, crea solo lo que falta y no duplica", { timeout: 120000 }, async () => {
    const db = (await getDb())!;
    const owner = (await getUsersByRole("super_admin"))[0];
    const now = new Date();
    const [c] = await db.insert(clients).values({ name: "Cliente Ajuste Garantía", whatsappPhone: "3007778899" } as any).returning({ id: clients.id });
    // A: entregado hace 50 días, sin deliveredAt; la fecha está en el historial
    const [a] = await db.insert(projects).values({ clientId: c.id, name: "Proyecto Ajuste A", workType: "cocina", status: "entregado", createdBy: owner.id } as any).returning({ id: projects.id });
    await db.insert(projectStatusHistory).values({ projectId: a.id, fromStatus: "trabajando_instalacion", toStatus: "entregado", changedBy: owner.id, createdAt: new Date(now.getTime() - 50 * DAY).toISOString() } as any);
    // B: entregado hace 2 años (deliveredAt registrado): sin llamada de 30 días, revisión de un año para hoy
    const [b] = await db.insert(projects).values({ clientId: c.id, name: "Proyecto Ajuste B", workType: "closet", status: "entregado", createdBy: owner.id, deliveredAt: new Date(now.getTime() - 730 * DAY).toISOString() } as any).returning({ id: projects.id });

    const { rows } = await buildBackfill(now);
    const ra = rows.find((r) => r.projectId === a.id)!;
    const rb = rows.find((r) => r.projectId === b.id)!;
    expect(ra.source).toBe("historial");
    expect(ra.setDeliveredAt).toBe(true);
    expect(ra.warrantyStatus).toBe("vigente");
    expect(ra.createFollowUp?.overdue).toBe(true);
    expect(ra.createAnnual?.overdue).toBe(false);
    expect(rb.source).toBe("registrada");
    expect(rb.warrantyStatus).toBe("vencida");
    expect(rb.createFollowUp).toBeNull();
    expect(rb.createAnnual?.overdue).toBe(true);

    await applyBackfill(owner.id, now);
    const [pa] = await db.select().from(projects).where(eq(projects.id, a.id));
    expect(pa.deliveredAt).toBeTruthy();
    expect(pa.publicToken).toBeTruthy(); // enlace del cliente para los mensajes del mes y del año
    const recs = await db.select().from(postventaReclamaciones).where(inArray(postventaReclamaciones.projectId, [a.id, b.id]));
    expect(recs.filter((r) => r.projectId === a.id).length).toBe(2);
    expect(recs.filter((r) => r.projectId === b.id).length).toBe(1);

    // Aplicar otra vez no duplica nada
    await applyBackfill(owner.id, now);
    expect((await db.select().from(postventaReclamaciones).where(inArray(postventaReclamaciones.projectId, [a.id, b.id]))).length).toBe(3);

    await db.delete(postventaReclamaciones).where(inArray(postventaReclamaciones.projectId, [a.id, b.id]));
  });
});
