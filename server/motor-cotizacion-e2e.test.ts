import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, statSync } from "fs";
import { appRouter } from "./routers";
import * as db from "./db";
import { buildQuotationPdfData } from "./quotation-pdf-data";
import { generateQuotationPDF } from "./quotation-pdf-generator";

// Prueba de punta a punta del Motor de cotización (servidor): crea una cotización con los 10 tipos de producto,
// la lee, arma los datos del PDF, genera el PDF y la edita. Los totales los manda la pantalla; aquí se comprueba
// que el servidor guarda, suma (descuento + IVA), describe y genera el PDF sin textos rotos («undefined», «NaN»).

const ITEMS: any[] = [
  { itemNumber: 1, itemType: "cocina", description: "", quantity: "1", totalPrice: 12000000,
    kitchenConfig: {
      shape: "premium", layout: "paralela", mlPriceCode: "COCINA_ML_PREMIUM", totalMeters: 4.2,
      specialModules: { nichoNevecon: false, nichoNevera: false, alacenaEntrepanos: false, alacenaHerraje: false, torreHornos: false },
      countertop: { type: "quarzone", depthSurcharge: "none", lavaplatosTipo: "doble" },
      island: { enabled: true, meters: 2, countertopType: "granito", hasLaterals: false, cantLateralesIsla: 1, incluyeRegrueso: true, lavaplatosTipo: "ninguno" },
      bar: { enabled: true, meters: 1.5, countertopType: "granito", hasLateral: false, barraAlturaLateral: 100, incluyePedestal: true, cantPedestales: 2, incluyeHerraje: true, reglaV2: true },
      ledLighting: 2, paintedDoors: { enabled: false, upperQty: 0, lowerQty: 0, pantryQty: 0, drawerQty: 0, spiceQty: 0, golaQty: 0 },
    } },
  { itemNumber: 2, itemType: "closet", description: "", quantity: "2", totalPrice: 9600000, includesFixedCosts: true, fixedCostsAmount: 600000,
    closetConfig: { type: "premium", width: 2.4, height: 2.4, doorType: "corredizas", squareMeters: 5.76, pricePerSquareMeter: 900000, subtotal: 4500000, incluyeLed: true, ledML: 3, ledPrice: 180000,
      accessories: { maletero: true, zapatero: true } } },
  { itemNumber: 3, itemType: "puerta", description: "", quantity: "2", totalPrice: 1780000,
    doorConfig: { doors: [{ id: "a", type: "batiente", widthRange: "50-85", width: 80, height: 2.1, quantity: 2, hardwareColor: "negro", hasLintel: true, pricePerUnit: 890000, tallDoorSurcharge: 0, lineTotal: 1780000 }], subtotal: 1780000, includeTransport: false, transportCost: 150000 } },
  { itemNumber: 4, itemType: "baño", description: "Mueble de baño flotante", quantity: "1", totalPrice: 1750000,
    bathroomConfig: { furnitureType: "flotante", width: 80, depth: 45, height: 55, widthRange: "60-80", sinkType: "lavamanos_sobreponer", includeMadera: true, hasExcavado: false, excavadoMaterial: "", hasMeson: true, mesonMaterial: "cuarzo", quantity: 1, pricePerUnit: 900000, subtotal: 1750000 } },
  { itemNumber: 5, itemType: "centro_tv", description: "", quantity: "1", totalPrice: 3300000,
    tvCenterConfig: { pricingVersion: 2, width: 1.8, basePrice: 2800000, floatingShelves: 2, alistonadoSides: 1, alistonadoPrice: 800000, hasLedLights: true, ledMeters: 2, ledLightsPrice: 360000, hasHighGloss: false, highGlossPrice: 0, equipmentSpaces: 0, equipmentSpacesPrice: 0, extraShelvesPrice: 0, includeTransport: false, transportCost: 150000, notes: "", subtotal: 3300000 } },
  { itemNumber: 6, itemType: "mesones", description: "", quantity: "3", totalPrice: 6000000,
    countertopConfig: { total: 6000000, notes: "", includeTransport: false, transportCost: 150000, mesones: [
      { id: "m1", reglaV2: true, tipo: "meson", material: "granito", metrosLineales: 2, fondo: 60, precioML: 750000, lavaplatosTipo: "sencillo", incluyeSalpicaderoAlto: false, subtotal: 1680000 },
      { id: "m2", reglaV2: true, tipo: "isla", material: "sinterizado", metrosLineales: 2, fondo: 60, precioML: 1200000, cantLaterales: 1, incluyeRegrueso: true, esImportado: true, subtotal: 3000000 },
      { id: "m3", reglaV2: true, tipo: "barra", material: "quarzo", metrosLineales: 1.2, fondo: 40, precioML: 600000, incluyeHerraje: true, alturaLateral: 100, incluyePedestal: true, cantPedestales: 2, subtotal: 1320000 },
    ] } },
  { itemNumber: 7, itemType: "mueble_cocina", description: "", quantity: "1", totalPrice: 5000000,
    kitchenConfig: { tipoPieza: "isla", madreraML: 2, incluyeMeson: true, mesonMaterial: "cuarzo", mesonML: 2, mesonFondo: 0.6, mesonCantLaterales: 1, mesonIncluyeRegrueso: true, lavaplatosTipo: "sencillo", incluyeLed: false, incluyePintado: false, modulosDescriptivos: { cajoneroDoble: true }, notas: "", total: 5000000 } },
  { itemNumber: 8, itemType: "mueble_cocina", description: "", quantity: "1", totalPrice: 2500000,
    kitchenConfig: { tipoPieza: "barra", madreraML: 0, incluyeMeson: true, mesonMaterial: "granito", mesonML: 1.2, mesonFondo: 0.4, reglaBarraV2: true, incluyeHerraje: true, barraAlturaLateral: 100, incluyePedestal: true, cantPedestales: 2, lavaplatosTipo: "ninguno", incluyePintado: false, modulosDescriptivos: {}, notas: "", total: 2500000 } },
  { itemNumber: 9, itemType: "herrajes", description: "Bisagras x4", quantity: "4", totalPrice: 120000,
    hardwareSelections: [{ hardwareId: 1, name: "Bisagra cierre lento", price: "30000", quantity: 4, subtotal: 120000 }] },
  { itemNumber: 10, itemType: "acabados_especiales", description: "", quantity: "1", totalPrice: 1500000,
    kitchenConfig: { enabled: true, aluminumGlassDoors: [{ height: 0.7, width: 0.4, qty: 2 }], ledLighting: { enabled: true, meters: 2 } } },
  { itemNumber: 12, itemType: "mueble_cocina", description: "", quantity: "1", totalPrice: 1800000,
    kitchenConfig: { tipoPieza: "frente_pollo", frentePolloML: 2, frentePolloIncluyeCajonero: false, incluyePintado: false, modulosDescriptivos: {}, notas: "", total: 1800000 } },
  { itemNumber: 11, itemType: "otro", description: "Escalera de diseño, 12 peldaños", quantity: "12", unitPrice: "300000", totalPrice: 3600000 },
];

describe("Motor de cotización — punta a punta (servidor)", () => {
  let clientId = 0;
  let userId = 0;
  let quotationId = 0;
  const tag = `e2e-${Date.now()}`;

  const caller = () => appRouter.createCaller({
    user: { id: userId, openId: tag, email: `${tag}@test.com`, name: "Comercial E2E", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  });

  beforeAll(async () => {
    userId = await db.createUserExtended({ dataOrigin: "system", name: "Comercial E2E", email: `${tag}@test.com`, role: "admin" } as any);
    clientId = await db.createClient({ dataOrigin: "system", name: "Cliente E2E", email: `${tag}-c@test.com`, whatsappPhone: "+573001112233" } as any);
  });

  afterAll(async () => {
    try { if (quotationId) { await db.deleteQuotationItems(quotationId); await db.deleteQuotation(quotationId); } } catch {}
    try { await db.deleteClient(clientId); } catch {}
    try { await db.deleteUser(userId); } catch {}
  });

  it("crea una cotización con los 10 tipos de producto, con descuento 10 % e IVA", async () => {
    const subtotal = ITEMS.reduce((s, i) => s + i.totalPrice, 0);
    const res = await caller().quotations.create({
      clientId, vendorName: "Comercial E2E", productType: "cocina", discountPercent: 10, includeIva: true,
      generalNotes: "Notas de prueba\n\nCondiciones de pago: 60% anticipo — 40% a la entrega de la obra\nTiempo de entrega: 25 días hábiles", items: ITEMS,
    } as any);
    expect(res.success).toBe(true);
    quotationId = res.quotationId;

    const q: any = await db.getQuotationById(quotationId);
    expect(Number(q.subtotal)).toBe(subtotal);
    expect(Number(q.discountAmount)).toBeCloseTo(subtotal * 0.1, 2);
    expect(Number(q.total)).toBeCloseTo(subtotal * 0.9 * 1.19, 2);
    const items = await db.getQuotationItems(quotationId);
    expect(items).toHaveLength(ITEMS.length);
  });

  it("el texto de cada ítem sale completo y sin «undefined» ni «NaN»", async () => {
    const q: any = await db.getQuotationById(quotationId);
    const client: any = await db.getClientById(clientId);
    const items = await db.getQuotationItems(quotationId);
    const data: any = await buildQuotationPdfData(q, client, items);
    expect(data.items).toHaveLength(ITEMS.length);
    expect(data.anticipoPercent).toBe(60); // el PDF muestra anticipo 60 % y saldo 40 % en pesos
    for (const it of data.items) {
      expect(String(it.description).trim().length, `ítem ${it.itemNumber} sin descripción`).toBeGreaterThan(5);
      expect(it.description, `ítem ${it.itemNumber}`).not.toMatch(/undefined|NaN|\[object/);
    }
    const txt = (n: number) => String(data.items[n - 1].description);
    // Cocina: forma paralela, lavaplatos doble, isla con 1 lateral, barra con herraje y pedestales
    // Con VOLCAR_TEXTOS=ruta se guarda el texto de cada ítem para revisarlo a ojo
    if (process.env.VOLCAR_TEXTOS) {
      const { writeFileSync } = await import("fs");
      writeFileSync(process.env.VOLCAR_TEXTOS, data.items.map((x: any) => `#${x.itemNumber} [cant ${x.quantity}] $${x.totalPrice}\n${x.description}\n`).join("\n----\n"));
    }
    expect(txt(1)).toMatch(/paralela/i);
    expect(txt(1)).toMatch(/Lavaplatos doble/i);
    expect(txt(1)).toMatch(/1 lateral en piedra/i);
    expect(txt(1)).toMatch(/Herraje de hierro/i);
    expect(txt(1)).toMatch(/2 pedestales/i);
    // Closet con LED
    expect(txt(2)).toMatch(/LED interior \(3 ml\)/);
    expect(txt(2)).toMatch(/Profundidad: 60 cm/);
    expect(txt(2)).not.toMatch(/Precio por/i);
    expect(txt(2)).toMatch(/Transporte e imprevistos: \$\s*600\.000/);
    expect(txt(1)).not.toMatch(/(^|\n)Item\s*$/); // ya no sale la palabra «Item» suelta
    expect(txt(4)).not.toMatch(/Precio madera/);
    const frente = data.items.find((x: any) => x.itemNumber === 12);
    expect(frente.description).toMatch(/FRENTE DE MESÓN A MEDIDA — 2 ml/);
    // Mesón Solo: lavaplatos, importado, herraje y pedestal de la barra
    expect(txt(6)).toMatch(/Lavaplatos sencillo/);
    expect(txt(6)).toMatch(/IMPORTADO/);
    expect(txt(6)).toMatch(/Herraje de hierro/);
    expect(txt(6)).toMatch(/2 pedestales/);
    // Piezas: isla con lavaplatos y barra con herraje
    expect(txt(7)).toMatch(/Lavaplatos sencillo/);
    expect(txt(8)).toMatch(/Herraje de hierro/);
    // Los frentes/pinturas de piezas no deben quedar mudos (se revisa abajo en el informe si faltan)
  });

  it("genera el PDF y no queda vacío", async () => {
    const q: any = await db.getQuotationById(quotationId);
    const client: any = await db.getClientById(clientId);
    const items = await db.getQuotationItems(quotationId);
    const data: any = await buildQuotationPdfData(q, client, items);
    const { pdfPath } = await generateQuotationPDF(data, quotationId, 1);
    expect(existsSync(pdfPath)).toBe(true);
    expect(statSync(pdfPath).size).toBeGreaterThan(5000);
  });

  it("editar un borrador recalcula descuento e IVA; sin IVA ni descuento el total es la suma", async () => {
    const subtotal = ITEMS.reduce((s, i) => s + i.totalPrice, 0);
    await caller().quotations.update({ id: quotationId, discountPercent: 0, includeIva: false, items: ITEMS } as any);
    const q: any = await db.getQuotationById(quotationId);
    expect(Number(q.total)).toBe(subtotal);
    expect(Number(q.discountAmount)).toBe(0);
  });

  it("aprobada: un precio cambiado a mano se ignora (conserva el guardado) y un cambio de configuración se rechaza", async () => {
    await db.updateQuotation(quotationId, { status: "approved" } as any);
    const antes: any = await db.getQuotationById(quotationId);
    // 1) solo cambia el precio, la configuración es la misma → se acepta pero el precio NO cambia
    const soloPrecio = ITEMS.map((i, n) => (n === 0 ? { ...i, totalPrice: i.totalPrice + 1000000 } : i));
    await caller().quotations.update({ id: quotationId, items: soloPrecio } as any);
    const despues: any = await db.getQuotationById(quotationId);
    expect(Number(despues.total)).toBe(Number(antes.total));
    // 2) cambia la configuración (metros de la cocina) → rechazada: hay que crear una versión nueva
    const otraConfig = ITEMS.map((i, n) => (n === 0 ? { ...i, kitchenConfig: { ...i.kitchenConfig, totalMeters: 9 } } : i));
    await expect(caller().quotations.update({ id: quotationId, items: otraConfig } as any)).rejects.toThrow(/aprobada/i);
  });
});
