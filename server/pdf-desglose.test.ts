import { describe, it, expect } from "vitest";
import { buildQuotationPdfData, etiquetaDesglose } from "./quotation-pdf-data";

const quotation: any = { id: 1, quotationNumber: "COT-2026-0001", clientId: 1, vendorName: "Martha", productType: "cocina", status: "draft", validUntil: "2026-12-05", subtotal: "1000000", total: "1000000", generalNotes: "", discountPercent: "0", discountAmount: "0", includeIva: 0, createdAt: "2026-11-20", versionNumber: 1, customDescriptions: null };
const item = (kc: any, total = "1000000"): any => ({ id: 1, itemNumber: 1, itemType: "cocina", description: "x", quantity: "1", unitPrice: total, totalPrice: total, kitchenConfig: { shape: "estandar", layout: "L", totalMeters: 1, ...kc } });
const bd = [{ label: "Muebles inferiores y superiores", amount: 700000 }, { label: "Mesón principal (incluye salpicadero alto y laterales)", amount: 200000 }, { label: "Luz LED", amount: 0 }, { label: "Transporte e imprevistos", amount: 100000 }];

describe("Desglose de valores en el PDF", () => {
  it("se muestra con nombres claros, sin partes en cero y con el transporte implícito en la madera, cuando suma el total", async () => {
    const d: any = await buildQuotationPdfData(quotation, { id: 1, name: "X" }, [item({ desglose: bd })]);
    expect(d.items[0].desglose.map((f: any) => f.label)).toEqual(["Muebles en madera (inferiores y superiores)", "Mesón en piedra"]);
    // El transporte (100.000) va implícito en la madera: 700.000 + 100.000; el total no cambia
    expect(d.items[0].desglose.map((f: any) => f.amount)).toEqual([800000, 200000]);
  });
  it("no se muestra si la suma NO coincide con el total (mejor sin desglose que con uno equivocado)", async () => {
    const d: any = await buildQuotationPdfData(quotation, { id: 1, name: "X" }, [item({ desglose: bd }, "1500000")]);
    expect(d.items[0].desglose).toBeUndefined();
  });
  it("no se muestra si se desactiva", async () => {
    const d: any = await buildQuotationPdfData(quotation, { id: 1, name: "X" }, [item({ desglose: bd, mostrarDesglose: false })]);
    expect(d.items[0].desglose).toBeUndefined();
  });
  it("etiquetas en palabras claras", () => {
    expect(etiquetaDesglose("Desmonte de cocina")).toBe("Desmonte de la cocina existente");
    expect(etiquetaDesglose("Isla")).toBe("Isla (muebles y mesón)");
  });
});
