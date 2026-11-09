import { describe, it, expect } from "vitest";
import {
  availablePostTypes, buildCaption, captionHashtags, weekStartYmd, weeksBetween, woodForCaption, bogotaWeekday,
} from "@shared/socialPosts";
import { detectCity, isImageUrl, isVideoUrl, portfolioSectionOf } from "@shared/portfolio";

describe("Portafolio: bloques y archivos", () => {
  it("cada carpeta va a su bloque y las del taller no entran", () => {
    expect(portfolioSectionOf("fotos_iniciales")).toBe("antes");
    expect(portfolioSectionOf("renders")).toBe("diseno");
    expect(portfolioSectionOf("modelado_3d")).toBe("diseno");
    expect(portfolioSectionOf("proceso_instalacion")).toBe("instalacion");
    expect(portfolioSectionOf("fotos_finales")).toBe("despues");
    expect(portfolioSectionOf("corte")).toBeNull();
    expect(portfolioSectionOf("enchape")).toBeNull();
    expect(portfolioSectionOf("armado")).toBeNull();
  });

  it("reconoce PDF y videos aunque vengan de Firebase", () => {
    const fb = (name: string) => `https://firebasestorage.googleapis.com/v0/b/x/o/${encodeURIComponent(`projects/1/${name}`)}?alt=media&token=abc`;
    expect(isImageUrl(fb("render.jpg"))).toBe(true);
    expect(isImageUrl(fb("plano.pdf"))).toBe(false);
    expect(isVideoUrl(fb("recorrido.MOV"))).toBe(true);
    expect(isImageUrl(fb("recorrido.mp4"))).toBe(false);
  });

  it("ciudad: la del levantamiento o la que aparezca en la dirección", () => {
    expect(detectCity("dosquebradas", null)).toBe("Dosquebradas");
    expect(detectCity(null, "Cra 5 # 10-20, Santa Rosa de Cabal")).toBe("Santa Rosa de Cabal");
    expect(detectCity(null, "Calle 1, barrio X")).toBeNull();
  });
});

describe("Redes: tipos de publicación", () => {
  it("solo propone lo que se puede armar con las fotos del proyecto", () => {
    expect(availablePostTypes({ antes: 2, diseno: 3, despues: 4, videos: 1 })).toEqual(["antes_despues", "render_vs_real", "video", "terminado"]);
    expect(availablePostTypes({ antes: 0, diseno: 3, despues: 0, videos: 0 })).toEqual([]);
    expect(availablePostTypes({ antes: 1, diseno: 0, despues: 0, videos: 1 })).toEqual(["video"]);
  });

  it("semana de lunes a domingo en hora de Colombia", () => {
    // domingo 8 nov 2026, 10 p. m. en Colombia = lunes 9 nov 03:00 UTC
    const domingoNoche = new Date("2026-11-09T03:00:00Z");
    expect(bogotaWeekday(domingoNoche)).toBe(0);
    expect(weekStartYmd(domingoNoche)).toBe("2026-11-02");
    expect(weekStartYmd(new Date("2026-11-11T15:00:00Z"))).toBe("2026-11-09");
  });

  it("semanas entre aprobación y entrega", () => {
    expect(weeksBetween("2026-10-01 10:00:00", "2026-10-29 10:00:00")).toBe(4);
    expect(weeksBetween(null, "2026-10-29")).toBeNull();
  });
});

describe("Redes: textos sugeridos", () => {
  const base = {
    workType: "cocina", city: "Dosquebradas",
    woodColor: "Interior: Blanco Tradicional · Exterior: Nogal Ámbar (Duratex)",
    countertop: "Calacatta", weeks: 4,
  };

  it("la madera a la vista, sin el interior ni la marca", () => {
    expect(woodForCaption(base.woodColor)).toBe("Nogal Ámbar");
    expect(woodForCaption("Interior: Blanco · Superiores: Humo · Inferiores: Grafito")).toBe("superiores Humo y inferiores Grafito");
    expect(woodForCaption("")).toBe("");
  });

  it("Instagram lleva detalles, WhatsApp y hashtags de la ciudad", () => {
    const t = buildCaption({ ...base, type: "antes_despues" }, "instagram");
    expect(t).toContain("Antes y después de esta cocina integral en Dosquebradas");
    expect(t).toContain("Madera: Nogal Ámbar");
    expect(t).toContain("Mesón: Calacatta");
    expect(t).toContain("4 semanas");
    expect(t).toContain("313 680 2025");
    expect(t).toContain("#Dosquebradas");
    expect(t).not.toContain("Blanco Tradicional");
  });

  it("Facebook lleva enlaces y TikTok es corto", () => {
    const fb = buildCaption({ ...base, type: "terminado" }, "facebook");
    expect(fb).toContain("https://wa.link/y3mpkk");
    expect(fb).toContain("cocinasintegralespereira.co");
    const tk = buildCaption({ ...base, type: "video" }, "tiktok");
    expect(tk).toContain("Recorrido por esta cocina integral en Dosquebradas, recién entregada");
    expect(tk.length).toBeLessThan(300);
  });

  it("concuerda con el tipo de trabajo (closet / puertas)", () => {
    expect(buildCaption({ type: "video", workType: "closet" }, "tiktok")).toContain("este closet, recién entregado");
    expect(buildCaption({ type: "render_vs_real", workType: "closet" }, "instagram")).toContain("Así lo diseñamos, así quedó");
    expect(buildCaption({ type: "render_vs_real", workType: "puertas" }, "instagram")).toContain("Así las diseñamos, así quedaron");
    expect(buildCaption({ type: "terminado", workType: "puertas" }, "instagram")).toContain("Estas puertas, terminadas y entregadas");
  });

  it("hashtags sin repetir", () => {
    const tags = captionHashtags({ type: "terminado", workType: "cocina", city: "Pereira" });
    expect(new Set(tags).size).toBe(tags.length);
  });
});

// ── Router (con la base de pruebas local; se limpia sola al terminar) ────────
import { vi } from "vitest";
vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async () => 0),
  sendPushToRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
}));
import { appRouter } from "./routers";
import { getDb } from "./db";
import { eq, inArray } from "drizzle-orm";
import {
  users, clients, projects, projectPhotos, projectMaterials, projectVideos, technicalVisits, technicalVisitPhotos,
} from "../drizzle/schema";

const caller = (user: { id: number; role: string }) =>
  appRouter.createCaller({ user: user as any, req: { ip: "test" } as any, res: {} as any } as any);

describe("Portafolio y Redes (servidor)", () => {
  let projectId = 0;
  let adminId = 0;

  it("arma el proyecto con Antes · Diseño · Instalación · Después (sin fotos del taller)", { timeout: 60000 }, async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [staff] = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["super_admin", "admin"])).limit(1);
    adminId = staff.id;
    const [client] = await db.insert(clients).values({ name: "Cliente portafolio", whatsappPhone: "3000000001", address: "Calle 1, Dosquebradas" } as any).returning({ id: clients.id });
    const [p] = await db.insert(projects).values({
      clientId: client.id, name: "Cocina portafolio prueba", workType: "cocina", status: "entregado", createdBy: adminId,
      deliveredAt: "2026-10-29 10:00:00", rendersApprovedAt: "2026-10-01 10:00:00",
    } as any).returning({ id: projects.id });
    projectId = p.id;
    const photo = (subcategory: string, category: string, name: string) => ({
      projectId, stage: "final", category, subcategory, photoUrl: `/local-uploads/prueba/${name}`, uploadedBy: adminId,
    });
    await db.insert(projectPhotos).values([
      photo("fotos_iniciales", "medidas", "antes.jpg"),
      photo("renders", "disenos", "render.jpg"),
      photo("renders", "disenos", "planos.pdf"),
      photo("corte", "avance", "corte.jpg"),
      photo("proceso_instalacion", "instalacion", "instalando.jpg"),
      photo("fotos_finales", "entrega", "final1.jpg"),
      photo("fotos_finales", "entrega", "final2.jpg"),
    ] as any);
    const [visit] = await db.insert(technicalVisits).values({
      createdBy: adminId, workType: "cocina", clientName: "Cliente portafolio", visitCity: "Dosquebradas", projectId,
    } as any).returning({ id: technicalVisits.id });
    await db.insert(technicalVisitPhotos).values({ visitId: visit.id, url: "/local-uploads/prueba/levantamiento.jpg", s3Key: "x", category: "general", uploadedBy: adminId } as any);
    await db.insert(projectMaterials).values({ projectId, woodColor: "Interior: Blanco · Exterior: Nogal Ámbar", countertopName: "Calacatta", createdBy: adminId } as any);

    const list = await caller({ id: adminId, role: "admin" }).portfolio.list();
    const item = list.find((x) => x.id === projectId)!;
    expect(item).toBeTruthy();
    expect(item.counts).toMatchObject({ antes: 2, diseno: 1, instalacion: 1, despues: 2, videos: 0 });
    expect(item.city).toBe("Dosquebradas");
    expect(item.available).toEqual(["antes_despues", "render_vs_real", "terminado"]);
    expect(item.cover).toContain("final2.jpg");
  });

  it("el diseñador consulta; el taller no entra; solo oficina marca estrellas", async () => {
    await expect(caller({ id: adminId, role: "disenador" }).portfolio.get({ projectId })).resolves.toBeTruthy();
    await expect(caller({ id: adminId, role: "operario" }).portfolio.list()).rejects.toThrow();
    await expect(caller({ id: adminId, role: "disenador" }).portfolio.toggleStar({ projectId, source: "foto", mediaId: 1 })).rejects.toThrow();
  });

  it("la estrella cambia la portada y se puede quitar", async () => {
    const admin = caller({ id: adminId, role: "admin" });
    const p = await admin.portfolio.get({ projectId });
    const first = p.media.despues[0];
    expect((await admin.portfolio.toggleStar({ projectId, source: first.source, mediaId: first.id })).starred).toBe(true);
    const after = await admin.portfolio.get({ projectId });
    expect(after.cover).toBe(first.url);
    expect(after.counts.stars).toBe(1);
    expect((await admin.portfolio.toggleStar({ projectId, source: first.source, mediaId: first.id })).starred).toBe(false);
  });

  it("videos: aparecen en Después y habilitan la publicación de video", async () => {
    const db = await getDb();
    await db!.insert(projectVideos).values({ projectId, url: "/local-uploads/prueba/recorrido.mp4", fileName: "recorrido.mp4", uploadedBy: adminId } as any);
    const p = await caller({ id: adminId, role: "admin" }).portfolio.get({ projectId });
    expect(p.videos.length).toBe(1);
    expect(p.available).toContain("video");
  });

  it("publicar: se registra sin duplicar y sale de la bandeja", async () => {
    const admin = caller({ id: adminId, role: "admin" });
    const before = await admin.social.overview();
    expect(before.tray.find((t) => t.id === projectId)?.pending).toContain("antes_despues");

    const r1 = await admin.social.markPublished({ projectId, postType: "antes_despues", network: "instagram" });
    const r2 = await admin.social.markPublished({ projectId, postType: "antes_despues", network: "instagram" });
    expect(r2.duplicated).toBe(true);
    expect(r2.id).toBe(r1.id);
    await admin.social.markPublished({ projectId, postType: "antes_despues", network: "facebook" });

    const after = await admin.social.overview();
    expect(after.tray.find((t) => t.id === projectId)?.pending).not.toContain("antes_despues");
    expect(after.stats.week).toBeGreaterThanOrEqual(1);
    expect(after.plan.find((x) => x.type === "antes_despues")?.done).toBeTruthy();

    await admin.social.unmarkPublished({ id: r1.id });
    await expect(caller({ id: adminId, role: "disenador" }).social.markPublished({ projectId, postType: "terminado", network: "tiktok" })).rejects.toThrow();
  });

  it("lista también los proyectos sin fotos (para alimentarlos)", async () => {
    const db = await getDb();
    const [client] = await db!.insert(clients).values({ name: "Cliente sin fotos", whatsappPhone: "3000000002" } as any).returning({ id: clients.id });
    const [p] = await db!.insert(projects).values({ clientId: client.id, name: "Closet sin fotos", workType: "closet", status: "corte", createdBy: adminId } as any).returning({ id: projects.id });
    const admin = caller({ id: adminId, role: "admin" });
    const item = (await admin.portfolio.list()).find((x) => x.id === p.id)!;
    expect(item).toBeTruthy();
    expect(item.delivered).toBe(false);
    expect(item.counts.despues).toBe(0);
    expect((await admin.portfolio.get({ projectId: p.id })).media.antes).toEqual([]);
    // Redes no lo propone (no tiene con qué armar publicación)
    expect((await admin.social.overview()).tray.find((t) => t.id === p.id)).toBeUndefined();
  });

  it("eliminar galería la quita de Redes sin borrar fotos y se puede restaurar", async () => {
    const admin = caller({ id: adminId, role: "admin" });
    const fotosAntes = (await admin.portfolio.get({ projectId })).counts;
    await admin.portfolio.setHidden({ projectId, hidden: true });
    const item = (await admin.portfolio.list()).find((x) => x.id === projectId)!;
    expect(item.hidden).toBe(true);
    expect((await admin.social.overview()).tray.find((t) => t.id === projectId)).toBeUndefined();
    expect((await admin.portfolio.get({ projectId })).counts).toEqual(fotosAntes);
    await expect(caller({ id: adminId, role: "disenador" }).portfolio.setHidden({ projectId, hidden: false })).rejects.toThrow();
    await admin.portfolio.setHidden({ projectId, hidden: false });
    expect((await admin.portfolio.list()).find((x) => x.id === projectId)!.hidden).toBe(false);
  });

  it("eliminar varias fotos → papelera; se quitan del proyecto y se restauran", async () => {
    const admin = caller({ id: adminId, role: "admin" });
    const p = await admin.portfolio.get({ projectId });
    const lev = p.media.antes.find((m) => m.source === "levantamiento")!;
    const fin = p.media.despues[0];
    await admin.portfolio.toggleStar({ projectId, source: fin.source, mediaId: fin.id });

    const r = await admin.portfolio.deleteMedia({ projectId, items: [{ source: lev.source, id: lev.id }, { source: fin.source, id: fin.id }] });
    expect(r.deleted).toBe(2);
    const after = await admin.portfolio.get({ projectId });
    expect(after.media.antes.find((m) => m.key === lev.key)).toBeUndefined();
    expect(after.media.despues.find((m) => m.key === fin.key)).toBeUndefined();
    const db = await getDb();
    expect((await db!.select().from(projectPhotos).where(eq(projectPhotos.id, fin.id))).length).toBe(0);

    const trash = await admin.portfolio.trash({ projectId });
    expect(trash.length).toBe(2);
    expect(trash[0].daysLeft).toBeGreaterThan(28);
    expect(trash.map((t) => t.url)).toContain(fin.url);

    const back = await admin.portfolio.restoreMedia({ projectId, trashIds: trash.map((t) => t.id) });
    expect(back.restored).toBe(2);
    const restored = await admin.portfolio.get({ projectId });
    expect(restored.media.despues.find((m) => m.key === fin.key)?.url).toBe(fin.url);
    expect(restored.media.antes.find((m) => m.key === lev.key)).toBeTruthy();
    expect(await admin.portfolio.trash({ projectId })).toEqual([]);
  });

  it("no deja eliminar fotos de otro proyecto ni al diseñador", async () => {
    const admin = caller({ id: adminId, role: "admin" });
    await expect(admin.portfolio.deleteMedia({ projectId, items: [{ source: "foto", id: 999999999 }] })).rejects.toThrow();
    const p = await admin.portfolio.get({ projectId });
    await expect(caller({ id: adminId, role: "disenador" }).portfolio.deleteMedia({ projectId, items: [{ source: "foto", id: p.media.despues[0].id }] })).rejects.toThrow();
  });

  it("mover fotos a otro bloque", async () => {
    const admin = caller({ id: adminId, role: "admin" });
    const p = await admin.portfolio.get({ projectId });
    const inst = p.media.instalacion[0];
    expect((await admin.portfolio.moveMedia({ projectId, ids: [inst.id], section: "despues" })).moved).toBe(1);
    const after = await admin.portfolio.get({ projectId });
    expect(after.media.instalacion.length).toBe(0);
    expect(after.media.despues.find((m) => m.id === inst.id)).toBeTruthy();
    // no cambia la etapa del proyecto
    const db = await getDb();
    const [proj] = await db!.select({ status: projects.status }).from(projects).where(eq(projects.id, projectId));
    expect(proj.status).toBe("entregado");
  });
});
