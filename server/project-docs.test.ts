import { describe, it, expect, vi } from "vitest";

// Los avisos no se envían de verdad en las pruebas
vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async () => 0),
  sendPushToRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
}));

import { eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, projects, clients, projectPhotos, projectDocShares } from "../drizzle/schema";
import { docsMessage, waPhone } from "./routers/projectDocs";

const caller = (user: { id: number; role: string; name?: string } | null) =>
  appRouter.createCaller({ user: user as any, req: { ip: "test" } as any, res: {} as any } as any);

describe("Mensaje de planos y detalles", () => {
  it("arma el número de WhatsApp con 57 solo para celulares colombianos", () => {
    expect(waPhone("313 680 2025")).toBe("573136802025");
    expect(waPhone("+1 305 555 1234")).toBe("13055551234");
    expect(waPhone("")).toBeNull();
  });

  it("pide tocar Recibido y menciona al maestro de obra", () => {
    const m = docsMessage("Ana", "Cocina Ana", ["Plano de adecuaciones"], "https://x/gallery?type=documentos");
    expect(m).toContain("Hola Ana");
    expect(m).toContain("• Plano de adecuaciones");
    expect(m).toContain("maestro de obra");
    expect(m).toContain("*Recibido*");
  });
});

describe("Planos técnicos y detalles enviados al cliente", () => {
  it("envía, el cliente ve solo lo enviado, queda Visto y confirma Recibido", { timeout: 120000 }, async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [staff] = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["super_admin", "admin"])).limit(1);
    const [client] = await db.insert(clients).values({ name: "Cliente prueba planos", whatsappPhone: "3000000000" } as any).returning({ id: clients.id });
    const [project] = await db.insert(projects).values({
      clientId: client.id, name: "Proyecto prueba planos", workType: "cocina", status: "en_diseno", createdBy: staff.id,
    } as any).returning({ id: projects.id });
    const base = { projectId: project.id, stage: "diseno", category: "disenos", subcategory: "detalles", uploadedBy: staff.id };
    const [plano, interno] = await db.insert(projectPhotos).values([
      { ...base, photoUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/plano.pdf?alt=media", description: "Plano de adecuaciones" },
      { ...base, photoUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/armado.pdf?alt=media", description: "Detalle de armado" },
    ] as any).returning({ id: projectPhotos.id });

    // El taller no puede enviar al cliente
    await expect(caller({ id: staff.id, role: "jefe_taller" }).projectDocs.share({ projectId: project.id, photoIds: [plano.id] })).rejects.toThrow();

    const office = caller({ id: staff.id, role: "admin", name: "Admin" });
    const r = await office.projectDocs.share({ projectId: project.id, photoIds: [plano.id] });
    expect(r.sent).toBe(1);
    expect(r.whatsAppLink).toContain("wa.me/573000000000");
    expect(r.link).toContain("type=documentos");
    const token = new URL(r.link).searchParams.get("token")!;

    // Enlace con token equivocado: rechazado
    await expect(caller(null).projectDocs.publicList({ projectId: project.id, token: "malo" })).rejects.toThrow();

    // El cliente solo ve el plano enviado (no el detalle interno) y queda "Visto"
    const pub = caller(null);
    expect((await pub.projectDocs.publicCount({ projectId: project.id, token })).count).toBe(1);
    const seen = await pub.projectDocs.publicList({ projectId: project.id, token });
    expect(seen.docs.map((d) => d.id)).toEqual([plano.id]);
    expect(seen.docs[0].isPdf).toBe(true);
    let [row] = await db.select().from(projectDocShares).where(eq(projectDocShares.photoId, plano.id));
    expect(row.viewedAt).toBeTruthy();
    expect(row.receivedAt).toBeNull();

    // Reenviar suma la cuenta
    await office.projectDocs.share({ projectId: project.id, photoIds: [plano.id] });
    [row] = await db.select().from(projectDocShares).where(eq(projectDocShares.photoId, plano.id));
    expect(row.sendCount).toBe(2);

    // Recibido
    const ok = await pub.projectDocs.confirmReceived({ projectId: project.id, token, name: "Maestro Pedro" });
    expect(ok.confirmed).toBe(1);
    [row] = await db.select().from(projectDocShares).where(eq(projectDocShares.photoId, plano.id));
    expect(row.receivedName).toBe("Maestro Pedro");
    expect(row.receivedAt).toBeTruthy();

    // Dejar de mostrar: el cliente ya no lo ve, la constancia queda
    await office.projectDocs.unshare({ photoId: plano.id });
    expect((await pub.projectDocs.publicList({ projectId: project.id, token })).docs.length).toBe(0);
    expect((await office.projectDocs.list({ projectId: project.id })).length).toBe(1);

    await db.delete(projectDocShares).where(eq(projectDocShares.projectId, project.id));
    await db.delete(projectPhotos).where(inArray(projectPhotos.id, [plano.id, interno.id]));
  });
});
