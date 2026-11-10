import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn(async () => 0),
  sendPushToRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => ({ sent: 0, failed: 0, devices: 0 })),
}));

import express from "express";
import type { AddressInfo } from "net";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { leads } from "../drizzle/schema";
import { registerWebIntakeRoutes, webPayloadToLead } from "./web-intake-routes";

const SECRET = "clave-de-prueba-de-la-pagina-web-0123456789";
let base = "";
let server: any;

beforeAll(async () => {
  process.env.WEB_INTAKE_SECRET = SECRET;
  const app = express();
  registerWebIntakeRoutes(app);
  app.use(express.json());
  await new Promise<void>((r) => { server = app.listen(0, () => r()); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server?.close(); delete process.env.WEB_INTAKE_SECRET; });

function send(body: Record<string, unknown>, secret = SECRET) {
  const raw = JSON.stringify({ recibidoEn: new Date().toISOString(), ...body });
  return fetch(`${base}/api/web/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Signature": `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}` },
    body: raw,
  });
}

describe("Contactos de la página web → Interesados", () => {
  it("convierte cada tipo de la página en un interesado legible", () => {
    const c = webPayloadToLead({
      tipo: "contacto", nombre: "Ana Web", telefono: "313 000 1111", correo: "ana@x.co", pagina: "/contacto/",
      mensaje: "[AUTORIZACION datos · política 1 · 2026-11-10]\n[REFERIDO · MARIA-4F2]\nQuiero una cocina en L",
    })!;
    expect(c.phone).toBe("573130001111");
    expect(c.source).toBe("referido");
    expect(c.message).toContain("Quiero una cocina en L");
    expect(c.message).toContain("Correo: ana@x.co");
    expect(c.message).toContain("MARIA-4F2");
    expect(c.message).not.toContain("AUTORIZACION");

    const v = webPayloadToLead({ tipo: "visita", nombre: "Beto", telefono: "3001112233", tipoTrabajo: "bano", dia: "2026-11-12", franja: "manana", ciudad: "Dosquebradas" })!;
    expect(v.workTypes).toBe("mueble_bano");
    expect(v.location).toBe("Dosquebradas");
    expect(v.message).toMatch(/Pidió visita.*jueves.*en la mañana/);

    expect(webPayloadToLead({ tipo: "cotizador", nombre: "Caro", telefono: "3001112233", mensaje: "Cocina en L 3 m" })!.workTypes).toBe("cocina");
    expect(webPayloadToLead({ nombre: "Sin teléfono", telefono: "" })).toBeNull();
  });

  it("rechaza envíos sin firma válida o vencidos", async () => {
    expect((await send({ nombre: "Pirata", telefono: "3001112233" }, "otra-clave")).status).toBe(401);
    const viejo = await send({ nombre: "Viejo", telefono: "3001112233", recibidoEn: "2020-01-01T00:00:00Z" });
    expect(viejo.status).toBe(400);
  });

  it("los envíos de prueba de la página no se guardan", async () => {
    const r = await send({ tipo: "contacto", nombre: "Prueba Vista Previa", telefono: "3009998877", prueba: true });
    expect(await r.json()).toEqual({ ok: true, prueba: true });
    const db = await getDb();
    expect((await db!.select().from(leads).where(eq(leads.whatsappPhone, "573009998877"))).length).toBe(0);
  });

  it("guarda el contacto en Interesados y no lo duplica si vuelve a escribir", { timeout: 60000 }, async () => {
    const phone = `57300${Date.now().toString().slice(-7)}`;
    const r1 = await send({ tipo: "contacto", nombre: "Lucía Web", telefono: phone.slice(2), mensaje: "Hola, quiero cotizar", pagina: "/contacto/" });
    expect(r1.status).toBe(200);
    const { id } = await r1.json();
    const r2 = await send({ tipo: "visita", nombre: "Lucía Web", telefono: phone.slice(2), tipoTrabajo: "closet", dia: "2026-11-17", franja: "tarde" });
    expect((await r2.json()).id).toBe(id);
    const db = await getDb();
    const rows = await db!.select().from(leads).where(eq(leads.whatsappPhone, phone));
    expect(rows.length).toBe(1);
    expect(rows[0].source).toBe("web");
    expect(rows[0].workTypes).toBe("closet");
    expect(rows[0].message).toContain("quiero cotizar");
    expect(rows[0].message).toContain("Pidió visita");
    await db!.delete(leads).where(eq(leads.id, id));
  });

  it("sin la clave configurada en Render no acepta nada", async () => {
    delete process.env.WEB_INTAKE_SECRET;
    expect((await send({ nombre: "X", telefono: "3001112233" })).status).toBe(503);
    process.env.WEB_INTAKE_SECRET = SECRET;
  });
});
