import { describe, it, expect } from "vitest";
import * as db from "./db";
import { runMigrations } from "./migrations";
import { calcularSeguimientos, registrarPaso, cerrarSeguimiento, avisarSeguimientosPendientes, limpiarAvisosSeguimiento } from "./quotation-followup-service";
import { quotationFollowUps, notifications } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const dias = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe("Seguimiento con versiones (con base de datos)", () => {
  it("con V1 y V2 enviadas solo se hace seguimiento a la última; si V2 se aprueba, ya no se persigue ninguna", async () => {
    await runMigrations();
    const d = await db.getDb();
    if (!d) return;
    const userId = await db.createUser({ dataOrigin: "system", openId: `segv-${Date.now()}`, name: "SegV Test", email: `segv-${Date.now()}@test.com`, role: "admin" } as any);
    const clientId = await db.createClient({ dataOrigin: "system", userId: null, name: "MARTHA VERSIONES", email: "m@test.com", whatsappPhone: "3001110000" } as any);
    const comun = { dataOrigin: "system", clientId, vendorName: "Martha Serna", productType: "cocina", subtotal: "1000000", total: "1000000", sentAt: dias(6), validUntil: new Date(Date.now() + 9 * 86400000).toISOString(), publicToken: "tokenv", createdBy: userId } as any;
    const v1 = await db.createQuotation({ ...comun, status: "sent" });
    const v2 = await db.createQuotation({ ...comun, status: "sent", baseQuotationId: v1, parentQuotationId: v1, versionNumber: 2 });
    try {
      const r = await calcularSeguimientos(new Date(), [v1, v2]);
      const ids = [...r.porEnviar, ...r.programados].map((i) => i.quotationId);
      expect(ids).toEqual([v2]);
      await db.updateQuotation(v2, { status: "approved", approvedAt: new Date().toISOString() } as any);
      const r2 = await calcularSeguimientos(new Date(), [v1, v2]);
      // V2 aprobada sin proyecto sí se acompaña con el anticipo; V1 (anterior) no
      expect([...r2.porEnviar, ...r2.programados].map((i) => i.quotationId)).toEqual([v2]);
    } finally {
      await limpiarAvisosSeguimiento(v2); await limpiarAvisosSeguimiento(v1);
      await db.deleteQuotation(v2); await db.deleteQuotation(v1); await db.deleteClient(clientId); await db.deleteUser(userId);
    }
  });
});

describe("Seguimiento de cotizaciones (con base de datos)", () => {
  it("calcula el mensaje, lo registra, amplía la validez y avisa a la campanita una sola vez", async () => {
    await runMigrations();
    const d = await db.getDb();
    if (!d) return;
    const userId = await db.createUser({ dataOrigin: "system", openId: `seg-${Date.now()}`, name: "Seguimiento Test", email: `seg-${Date.now()}@test.com`, role: "admin" } as any);
    const clientId = await db.createClient({ dataOrigin: "system", userId: null, name: "ADRIANA PRUEBA", email: "a@test.com", whatsappPhone: "3001112233" } as any);
    const qId = await db.createQuotation({
      dataOrigin: "system", clientId, vendorName: "Martha Serna", productType: "cocina", status: "sent", subtotal: "1000000", total: "1000000",
      sentAt: dias(6), validUntil: new Date(Date.now() + 9 * 86400000).toISOString(), publicToken: "tokenprueba123", createdBy: userId,
    } as any);
    try {
      const r = await calcularSeguimientos(new Date(), [qId]);
      const it = [...r.porEnviar, ...r.programados][0];
      expect(it).toBeTruthy();
      expect(it.cliente).toBe("ADRIANA PRUEBA");
      expect(it.telefono).toBe("573001112233");
      expect(it.mensaje).toContain("Adriana");
      expect(it.mensaje).toContain("tokenprueba123");

      if (it.porEnviar) {
        const n1 = await avisarSeguimientosPendientes(new Date());
        const n2 = await avisarSeguimientosPendientes(new Date());   // no se repite
        expect(n1).toBeGreaterThanOrEqual(1);
        expect(n2).toBe(0);
      }
      // el paso equivocado se rechaza
      await expect(registrarPaso({ quotationId: qId, step: "s5", accion: "enviado", userId })).rejects.toThrow("ESTADO_CAMBIO");
      const ok = await registrarPaso({ quotationId: qId, step: it.step, accion: "enviado", userId });
      expect(ok.nuevaValidez).toBeNull();
      const logs = await d.select().from(quotationFollowUps).where(eq(quotationFollowUps.quotationId, qId));
      expect(logs.length).toBe(1);
      const avisos = await d.select().from(notifications).where(eq(notifications.referenceId, qId));
      expect(avisos.filter((a: any) => String(a.referenceType).startsWith("cotizacion_seguimiento")).length).toBe(0);   // se limpian al atender

      await cerrarSeguimiento(qId, userId, "Prefirió otra opción");
      const r2 = await calcularSeguimientos(new Date(), [qId]);
      expect([...r2.porEnviar, ...r2.programados].length).toBe(0);
    } finally {
      await d.delete(quotationFollowUps).where(eq(quotationFollowUps.quotationId, qId));
      await limpiarAvisosSeguimiento(qId);
      await db.deleteQuotation(qId);
      await db.deleteClient(clientId);
      await db.deleteUser(userId);
    }
  });
});
