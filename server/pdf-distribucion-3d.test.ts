import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { existsSync, statSync, mkdirSync } from "fs";
import { generateQuotationPDF } from "./pdf-generator-pdfkit";
import { buildScheme } from "../shared/kitchenPlanScheme";
import { normalizePlan, addModuleToPlan } from "../shared/kitchenModulePlan";

// La última hoja del PDF: «Distribución de la cocina» con las capturas del plano en 3D (orientativa, no es el diseño final).
async function captura(color: { r: number; g: number; b: number }) {
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: color } }).jpeg().toBuffer();
}

describe("PDF — distribución de la cocina en 3D", () => {
  it("genera la última hoja con las 3 vistas y la lista de módulos, y sin capturas cae al esquema de frente", async () => {
    const cfg: any = { shape: "premium", layout: "L", totalMeters: 6.4, specialModules: {}, countertop: {}, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: false } };
    const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    ["moduloLavaplatos", "cajoneroTriple", "moduloEstufaHorno", "moduloAlmacInf"].forEach((k) => addModuleToPlan(plan, 0, "lower", k, cfg));
    plan.enabled = true;
    const base = (esquema: any) => ({
      quotationNumber: "COT-TEST-3D", date: "18/11/2026", clientName: "Cliente Prueba", clientPhone: "3000000000", clientAddress: "Pereira", vendorName: "Innovar", productType: "cocina",
      validUntil: "25/11/2026", items: [{ itemNumber: 1, description: "Cocina integral", quantity: "1", unitPrice: "1000000", totalPrice: "1000000" }],
      subtotal: "1000000", transportCost: "0", discountPercent: "0", discountAmount: "0", total: "1000000", schemes: [esquema],
    });
    const dir = "/tmp/claude-501"; mkdirSync(dir, { recursive: true });
    const con = buildScheme(plan, cfg, "Cocina integral")!;
    (con as any).imagenes3d = [await captura({ r: 40, g: 90, b: 100 }), await captura({ r: 90, g: 60, b: 120 }), await captura({ r: 100, g: 80, b: 40 })];
    const p1 = `${dir}/distribucion-3d.pdf`;
    await generateQuotationPDF(base(con) as any, p1);
    const sin = buildScheme(plan, cfg, "Cocina integral")!;
    const p2 = `${dir}/distribucion-2d.pdf`;
    await generateQuotationPDF(base(sin) as any, p2);
    expect(existsSync(p1) && existsSync(p2)).toBe(true);
    expect(statSync(p1).size).toBeGreaterThan(statSync(p2).size);   // con las 3 imágenes pesa más
  });
});
