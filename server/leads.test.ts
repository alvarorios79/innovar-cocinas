import { describe, it, expect, afterAll, vi } from "vitest";

// Los avisos no se envían de verdad en las pruebas (la BD local tiene cientos de usuarios de prueba).
// Solo el resumen diario se guarda, para comprobar que no se repite.
const sentNotices: { userId: number; type: string; referenceType?: string; referenceId?: number }[] = [];
vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async (userId: number, n: any) => {
    sentNotices.push({ userId, type: n.type, referenceType: n.referenceType, referenceId: n.referenceId });
    if (n.referenceType !== "lead_resumen") return 0;
    const db = await import("./db");
    return db.createNotification({ userId, title: n.title, body: n.body, type: n.type, referenceType: n.referenceType, read: 0, sentPush: 0 } as any);
  }),
}));
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { leads, notifications } from "../drizzle/schema";
import { getUsersByRole } from "./db";
import { normalizeLeadPhone, leadWorkTypesText } from "@shared/leads";
import { buildLeadSummaryText } from "./leads-daily-summary";

const created: number[] = [];
const publicCaller = (ip: string) => appRouter.createCaller({ user: null, req: { ip } as any, res: {} as any } as any);
const staffCaller = () => appRouter.createCaller({ user: { id: 1, role: "comercial" } as any, req: { ip: "test" } as any, res: {} as any } as any);
const uniquePhone = () => `3${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;

describe("Interesados — utilidades", () => {
  it("normaliza celulares colombianos con 57", () => {
    expect(normalizeLeadPhone("300 123 4567")).toBe("573001234567");
    expect(normalizeLeadPhone("+57 300-123-4567")).toBe("573001234567");
    expect(normalizeLeadPhone("3001234567", "1")).toBe("13001234567");
  });
  it("muestra los trabajos con nombre", () => {
    expect(leadWorkTypesText("cocina,mueble_bano")).toBe("Cocina integral, Mueble de baño");
    expect(leadWorkTypesText(null)).toBe("");
  });
  it("arma el texto del resumen de la mañana", () => {
    expect(buildLeadSummaryText(0, 0)).toBeNull();
    expect(buildLeadSummaryText(1, 0)).toBe("Tienes 1 interesado sin contestar.");
    expect(buildLeadSummaryText(3, 2)).toBe("Tienes 3 interesados sin contestar y 2 seguimientos para hoy.");
  });
});

describe("Interesados — página pública", () => {
  afterAll(async () => {
    const db = await getDb();
    if (db && created.length) {
      await db.delete(leads).where(inArray(leads.id, created));
    }
  });

  it("guarda la solicitud y no duplica si la misma persona vuelve a pedir", { timeout: 20000 }, async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const phone = uniquePhone();
    const caller = publicCaller(`ip-${phone}`);
    await caller.leads.publicRequest({ name: "Prueba Visita", whatsappPhone: phone, countryCode: "57", workTypes: ["cocina"], location: "Cerritos" });
    await caller.leads.publicRequest({ name: "Prueba Visita", whatsappPhone: phone, countryCode: "57", workTypes: ["closet"], message: "También closet" });
    const rows = await db.select().from(leads).where(inArray(leads.whatsappPhone, [`57${phone}`]));
    created.push(...rows.map(r => r.id));
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("nuevo");
    expect(rows[0].source).toBe("web");
    expect(rows[0].workTypes).toBe("closet");
    // Se avisó al equipo (en segundo plano) con un tipo que la BD acepta
    const team = [...await getUsersByRole("super_admin"), ...await getUsersByRole("admin"), ...await getUsersByRole("comercial")];
    for (let i = 0; i < 50 && team.length && !sentNotices.some(n => n.referenceId === rows[0].id); i++) await new Promise(r => setTimeout(r, 100));
    if (team.length) expect(sentNotices.find(n => n.referenceId === rows[0].id)).toMatchObject({ type: "cita", referenceType: "lead" });
  });

  it("ignora a los robots que llenan el campo trampa", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const phone = uniquePhone();
    const res = await publicCaller(`ip-bot-${phone}`).leads.publicRequest({ name: "Robot", whatsappPhone: phone, countryCode: "57", workTypes: ["cocina"], website: "http://spam" });
    expect(res.success).toBe(true);
    const rows = await db.select().from(leads).where(inArray(leads.whatsappPhone, [`57${phone}`]));
    expect(rows.length).toBe(0);
  });

  it("limita a 5 solicitudes por IP cada 15 minutos", async () => {
    const ip = `ip-limit-${Date.now()}`;
    const caller = publicCaller(ip);
    for (let i = 0; i < 5; i++) {
      await caller.leads.publicRequest({ name: "Bot", whatsappPhone: "1", countryCode: "57", workTypes: ["cocina"], website: "x" }).catch(() => {});
    }
    // Las 5 anteriores eran del campo trampa (no cuentan); se cuentan solo las reales
    const phone = uniquePhone();
    for (let i = 0; i < 5; i++) {
      await caller.leads.publicRequest({ name: "Repetido", whatsappPhone: phone, countryCode: "57", workTypes: ["cocina"] });
    }
    await expect(caller.leads.publicRequest({ name: "Repetido", whatsappPhone: phone, countryCode: "57", workTypes: ["cocina"] }))
      .rejects.toThrow(/Ya recibimos tu solicitud/);
    const db = await getDb();
    const rows = await db!.select({ id: leads.id }).from(leads).where(inArray(leads.whatsappPhone, [`57${phone}`]));
    created.push(...rows.map(r => r.id));
  });

  it("el equipo puede registrar y agendar un interesado", async () => {
    const caller = staffCaller();
    const { id } = await caller.leads.create({ name: "Cliente WhatsApp", whatsappPhone: uniquePhone(), countryCode: "57", workTypes: ["cocina"], source: "instagram" });
    created.push(id);
    const lead = await caller.leads.get({ id });
    expect(lead.status).toBe("contactado");
    expect(lead.source).toBe("instagram");
    await caller.leads.update({ id, followUpDate: "2030-01-15" });
    expect((await caller.leads.get({ id })).followUpDate).toBe("2030-01-15");
  });

  it("la base de datos acepta el aviso de interesado (tipo cita + marca lead)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { createNotification } = await import("./db");
    const id = await createNotification({ userId: 1, title: "Prueba interesado", body: "x", type: "cita", referenceType: "lead", read: 0, sentPush: 0 } as any);
    expect(id).toBeGreaterThan(0);
    await db.delete(notifications).where(eq(notifications.id, id));
  });

  it("el resumen de la mañana se guarda una sola vez por día", { timeout: 30000 }, async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { sendLeadsDailySummary } = await import("./leads-daily-summary");
    await db.delete(notifications).where(eq(notifications.referenceType, "lead_resumen"));
    await sendLeadsDailySummary();
    await sendLeadsDailySummary();
    // Nadie recibe el resumen dos veces el mismo día
    const rows = await db.select({ userId: notifications.userId }).from(notifications).where(eq(notifications.referenceType, "lead_resumen"));
    const perUser = new Map<number, number>();
    rows.forEach(r => perUser.set(r.userId, (perUser.get(r.userId) || 0) + 1));
    expect(Math.max(0, ...Array.from(perUser.values()))).toBeLessThanOrEqual(1);
    await db.delete(notifications).where(eq(notifications.referenceType, "lead_resumen"));
  });

  it("la página pública no deja ver la lista", async () => {
    await expect(publicCaller("x").leads.list({ view: "todos" })).rejects.toThrow();
  });
});
