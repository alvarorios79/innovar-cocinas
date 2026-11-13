import { describe, it, expect, vi } from "vitest";

vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async () => 0),
  sendPushToRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
}));

import { inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, projects, clients, projectPhotos } from "../drizzle/schema";
import { workshopMessage } from "./routers/projectDocs";
import { workshopFileSig, workshopFileUrl } from "./file-download-routes";

const caller = (user: { id: number; role: string; name?: string }) =>
  appRouter.createCaller({ user: user as any, req: { ip: "test" } as any, res: {} as any } as any);

describe("Despieces al taller por WhatsApp", () => {
  it("el enlace va firmado y cada archivo tiene su propia firma", () => {
    expect(workshopFileSig(10)).toHaveLength(32);
    expect(workshopFileSig(10)).not.toBe(workshopFileSig(11));
    expect(workshopFileUrl("https://crm.test/", 10)).toBe(`https://crm.test/api/files/taller?id=10&s=${workshopFileSig(10)}`);
  });

  it("el mensaje lista cada PDF con su enlace", () => {
    const m = workshopMessage("Luis", "Cocina Ana", [{ name: "Despiece inferiores", url: "https://x/1" }, { name: "Despiece superiores", url: "https://x/2" }], "Alejandro");
    expect(m).toContain("Hola Luis");
    expect(m).toContain("*Despiece inferiores*\nhttps://x/1");
    expect(m).toContain("listos los despieces");
    expect(m).toContain("— Alejandro");
  });

  it("solo diseñador y super admin; solo archivos de Despieces", { timeout: 120000 }, async () => {
    const db = (await getDb())!;
    const [staff] = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["super_admin"])).limit(1);
    const [c] = await db.insert(clients).values({ name: "Cliente prueba despiece", whatsappPhone: "3000000001" } as any).returning({ id: clients.id });
    const [p] = await db.insert(projects).values({ clientId: c.id, name: "Proyecto prueba despiece", workType: "cocina", status: "despiece", createdBy: staff.id } as any).returning({ id: projects.id });
    const base = { projectId: p.id, stage: "diseno", category: "disenos", uploadedBy: staff.id };
    const [desp, plano] = await db.insert(projectPhotos).values([
      { ...base, subcategory: "despieces", photoUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/d.pdf?alt=media", description: "Despiece general" },
      { ...base, subcategory: "detalles", photoUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/p.pdf?alt=media", description: "Plano" },
    ] as any).returning({ id: projectPhotos.id });

    await expect(caller({ id: staff.id, role: "admin" }).projectDocs.workshopShare({ projectId: p.id, photoIds: [desp.id] })).rejects.toThrow();
    await expect(caller({ id: staff.id, role: "disenador" }).projectDocs.workshopShare({ projectId: p.id, photoIds: [plano.id] })).rejects.toThrow();

    const r = await caller({ id: staff.id, role: "disenador", name: "Alejandro Gutiérrez" }).projectDocs.workshopShare({ projectId: p.id, photoIds: [desp.id, plano.id] });
    expect(r.files).toHaveLength(1);
    expect(r.files[0].url).toContain(`/api/files/taller?id=${desp.id}&s=`);
    expect(r.message).toContain("Despiece general");
    expect(r.message).not.toContain("Plano");
    expect(r.anyoneLink).toContain("https://wa.me/?text=");
    expect((await caller({ id: staff.id, role: "super_admin" }).projectDocs.notifyWorkshop({ projectId: p.id, count: 1 })).success).toBe(true);

    await db.delete(projectPhotos).where(inArray(projectPhotos.id, [desp.id, plano.id]));
  });
});
