import { describe, it, expect } from "vitest";
import { normalizePlan, addModuleToPlan, setModuleWidth, moveModuleToTramo, primerHueco, esquinasDeLayout, girarEsquinero, computePlan, ventanasDeLevantamiento, rowItems } from "../shared/kitchenModulePlan";
import { buildKitchenQuoteDescription } from "./kitchen-description";

// ¿El plano de módulos describe de verdad la cocina? Se arma una cocina paralela de 2 paredes (3,0 m y 2,4 m),
// se agregan módulos y se comprueba: (1) que la descripción lista lo dibujado, (2) que avisa si no cabe.

function cocinaConPlano(largoA: number, largoB: number, modulosA: string[], modulosB: string[]) {
  const config: any = {
    shape: "premium", layout: "paralela", totalMeters: 5.4, mlPriceCode: "COCINA_ML_PREMIUM",
    specialModules: { nichoNevecon: false, nichoNevera: false, alacenaEntrepanos: false, alacenaHerraje: false, torreHornos: false },
    countertop: { type: "quarzone" }, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 },
    paintedDoors: { enabled: true }, ledLighting: 0,
  };
  const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: largoA, upper: [], lower: [] }, { name: "Pared B", length: largoB, upper: [], lower: [] }], extras: {} }, config);
  modulosA.forEach((k) => addModuleToPlan(plan, 0, k.startsWith("moduloExtractor") || k === "moduloPlatero" || k === "moduloMicroondas" || k === "moduloAlmacSup" ? "upper" : "lower", k, config));
  modulosB.forEach((k) => addModuleToPlan(plan, 1, k.startsWith("moduloExtractor") || k === "moduloPlatero" || k === "moduloMicroondas" || k === "moduloAlmacSup" ? "upper" : "lower", k, config));
  plan.enabled = true;
  config.modulePlan = plan;
  return config;
}

describe("Plano de módulos → descripción de la cocina", () => {
  it("la descripción lista los módulos del plano (paralela, dos paredes)", () => {
    const cfg = cocinaConPlano(3.0, 2.4, ["moduloLavaplatos", "moduloEstufaHorno", "cajoneroTriple"], ["cajoneroDoble", "basurero", "moduloAlmacInf"]);
    const res = computePlan(cfg.modulePlan, cfg);
    const txt = buildKitchenQuoteDescription(cfg, "");
    console.log("MODULOS:", JSON.stringify(res.modules.map((m) => `${m.qty}× ${m.label}`)));
    console.log("AVISOS:", JSON.stringify(res.warnings));
    console.log("TEXTO:\n" + txt);
    expect(res.modules.length).toBeGreaterThan(3);
    expect(txt).toMatch(/cajonero triple/i);
    expect(txt).toMatch(/basurero/i);
  });

  it("avisa cuando los módulos no caben en la pared", () => {
    const cfg = cocinaConPlano(1.5, 2.4, ["moduloLavaplatos", "moduloEstufaHorno", "cajoneroTriple"], []);
    const res = computePlan(cfg.modulePlan, cfg);
    console.log("AVISOS NO CABE:", JSON.stringify(res.warnings));
    expect(res.warnings.some((w) => /te pasas|se sale/i.test(w))).toBe(true);
  });

  it("BRECHA conocida: los metros que se cobran y el largo de las paredes del plano no se comparan", () => {
    const cfg = cocinaConPlano(3.0, 2.4, ["moduloLavaplatos", "moduloEstufaHorno"], ["cajoneroDoble"]);
    cfg.totalMeters = 4.0; // se cobraría 4,0 ml aunque las paredes suman 5,4 m
    const res = computePlan(cfg.modulePlan, cfg);
    const txt = buildKitchenQuoteDescription(cfg, "");
    console.log("METRAJE vs PLANO → avisos:", JSON.stringify(res.warnings), "| texto:", txt.match(/Metraje total: [\d.]+ ml/)?.[0]);
    expect(res.warnings.some((w) => /metraje|metros/i.test(w))).toBe(false); // hoy no avisa
  });

  it("la isla se arma igual que las paredes: se activa con su medida y se le arrastran módulos", () => {
    const cfg: any = { shape: "premium", layout: "lineal", totalMeters: 3, island: { enabled: true, meters: 2 }, specialModules: {}, countertop: {}, bar: {}, paintedDoors: { enabled: true } };
    const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3, upper: [], lower: [] }], extras: {} }, cfg);
    expect(plan.tramos.map((t: any) => t.name)).toEqual(["Pared A", "Isla"]);
    expect(plan.tramos[1].length).toBe(2);                       // el largo de la isla viene de su medida
    addModuleToPlan(plan, 1, "lower", "cajoneroDoble", cfg);
    addModuleToPlan(plan, 1, "lower", "moduloAlmacInf", cfg);
    plan.enabled = true;
    const res = computePlan(plan, cfg);
    expect(res.modules.some((m) => m.key === "cajoneroDoble")).toBe(true);
    expect(res.warnings.filter((w) => /Isla/.test(w))).toEqual([]);  // caben en la isla
  });
});

describe("Ventanas del levantamiento → plano de módulos", () => {
  const ab = [
    { id: "1", tipo: "ventana", pared: 0, desde: 50, ancho: 120, alto: 120, antepecho: 100 },     // arriba = 2,20 m → estorba a los superiores
    { id: "2", tipo: "ventana", pared: 1, desde: 30, ancho: 80, alto: 60, antepecho: 90 },        // arriba = 1,50 m → queda en el salpicadero, no estorba
    { id: "3", tipo: "puerta", pared: 0, desde: 250, ancho: 90, alto: 210, antepecho: 0 },        // las puertas no entran
  ];
  it("entra bloqueada en la misma pared y a la misma distancia; el salpicadero y las puertas no", () => {
    const v = ventanasDeLevantamiento(ab, 2);
    expect(v[0]).toHaveLength(1);
    expect(v[0][0]).toMatchObject({ key: "ventana", width: 1.2, lockAt: 0.5 });
    expect(v[1]).toHaveLength(0);
  });
  it("no cambia el precio de pintura ni las piezas del plano (la ventana no tiene piezas)", () => {
    const cfg: any = { shape: "premium", layout: "L", totalMeters: 6.4, specialModules: {}, countertop: {}, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: false } };
    const v = ventanasDeLevantamiento(ab, 2);
    const base: any = { enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} };
    const con: any = { enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: v[0], lower: [] }, { name: "Pared B", length: 2.8, upper: v[1], lower: [] }], extras: {} };
    expect(computePlan(con, cfg).priced).toEqual(computePlan(base, cfg).priced);
    expect(computePlan(con, cfg).pieces).toEqual(computePlan(base, cfg).pieces);
    const np: any = normalizePlan(con, cfg);
    const it = rowItems(np, 0, "upper", cfg).find((i) => i.key === "ventana");
    expect(it?.start).toBe(0.5);   // queda en el lugar que marcó el medidor
  });

  it("en el plano la pared de 3 m con la ventana queda con superiores de 0,50 y 1,30", () => {
    const cfg: any = { shape: "premium", layout: "lineal", totalMeters: 3, specialModules: {}, countertop: {}, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: false } };
    const v = ventanasDeLevantamiento([{ tipo: "ventana", pared: 0, desde: 50, ancho: 120, alto: 120, antepecho: 100 }], 1);
    const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3, upper: v[0], lower: [] }], extras: {} }, cfg);
    const m1 = addModuleToPlan(plan, 0, "upper", "moduloAlmacSup", cfg)!;   // 0,65 no cabe en los 0,50 de la izquierda: cae a la derecha de la ventana
    setModuleWidth(plan, 0, "upper", m1.id, 1.3, cfg);                        // el espacio de la derecha mide 1,30
    expect(rowItems(plan, 0, "upper", cfg).find((i) => i.mod?.id === m1.id)).toMatchObject({ start: 1.7, width: 1.3 });
    expect(rowItems(plan, 0, "upper", cfg).find((i) => i.key === "ventana")).toMatchObject({ start: 0.5, width: 1.2 });
    expect(computePlan(plan, cfg).warnings.filter((w) => /ventana/i.test(w))).toHaveLength(0);
  });
});

describe("Plano 3D: barra como bloque suelto y mover módulos entre paredes", () => {
  const base = (extra: any = {}): any => ({ shape: "premium", layout: "L", totalMeters: 6.4, specialModules: {}, countertop: {}, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: false }, ...extra });
  it("la barra se arma igual que la isla: un bloque con su largo (sin superiores) y conserva dónde se colocó", () => {
    const cfg = base({ island: { enabled: true, meters: 2 }, bar: { enabled: true, meters: 1.5 } });
    const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    expect(plan.tramos.map((t: any) => t.name)).toEqual(["Pared A", "Pared B", "Isla", "Barra"]);
    expect(plan.tramos[3]).toMatchObject({ isIsland: true, isBar: true, length: 1.5 });
    plan.tramos[3].pos = { x: 2, z: 3, rot: 90 };
    const otra: any = normalizePlan(JSON.parse(JSON.stringify(plan)), cfg);
    expect(otra.tramos[3].pos).toEqual({ x: 2, z: 3, rot: 90 });       // no se pierde al recalcular
    expect(otra.tramos[2].isBar).toBeUndefined();                      // la isla sigue siendo isla
  });
  it("sin barra ni isla el plano queda igual que antes", () => {
    const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, base());
    expect(plan.tramos.map((t: any) => t.name)).toEqual(["Pared A", "Pared B"]);
  });
  it("mover un módulo a otra pared lo quita de la primera y lo acomoda en la segunda; los esquineros no se mueven", () => {
    const cfg = base();
    const plan: any = normalizePlan({ enabled: true, autoUpper: false, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    const caj = addModuleToPlan(plan, 0, "lower", "cajoneroDoble", cfg)!;
    const esq = addModuleToPlan(plan, 0, "lower", "esquinero1x1", cfg)!;
    expect(moveModuleToTramo(plan, 0, "lower", esq.id, 1, 0.5, cfg)).toBe(false);   // esquinero: fijo
    expect(moveModuleToTramo(plan, 0, "lower", caj.id, 1, 1.0, cfg)).toBe(true);
    expect(plan.tramos[0].lower.some((m: any) => m.id === caj.id)).toBe(false);
    expect(plan.tramos[1].lower.some((m: any) => m.id === caj.id)).toBe(true);
    expect(rowItems(plan, 1, "lower", cfg).find((i) => i.mod?.id === caj.id)?.start).toBeCloseTo(1.0, 1);
  });

  it("primerHueco: el módulo nuevo cae en el primer espacio libre de la pared elegida, no siempre en la A", () => {
    const cfg = base();
    const plan: any = normalizePlan({ enabled: true, autoUpper: false, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    addModuleToPlan(plan, 0, "lower", "moduloLavaplatos", cfg);
    expect(primerHueco(plan, 0, "lower", 0.7, cfg)).toBeCloseTo(0.7, 2);   // A: después del lavaplatos
    expect(primerHueco(plan, 1, "lower", 0.7, cfg)).toBe(0);              // B: vacía → al inicio
    const m = addModuleToPlan(plan, 1, "lower", "cajoneroTriple", cfg)!;
    expect(plan.tramos[1].lower.some((x: any) => x.id === m.id)).toBe(true);
    expect(plan.tramos[0].lower.some((x: any) => x.id === m.id)).toBe(false);
  });

  it("el esquinero va SIEMPRE en la esquina (al final de su pared) aunque falten módulos antes, y la pared vecina lo continúa", () => {
    const cfg = base();
    const plan: any = normalizePlan({ enabled: true, autoUpper: false, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    addModuleToPlan(plan, 0, "lower", "moduloLavaplatos", cfg);
    const esq = addModuleToPlan(plan, 0, "lower", "esquinero1x1", cfg)!;
    const a = rowItems(plan, 0, "lower", cfg).find((i) => i.mod?.id === esq.id)!;
    expect(a.start).toBeCloseTo(2.6, 2);                 // 3,60 − 1,00: pegado a la esquina, no detrás del lavaplatos (0,70)
    expect(a.width).toBe(1);
    const b = rowItems(plan, 1, "lower", cfg).find((i) => i.fromPrev && i.key === "esquinero1x1")!;
    expect(b.start).toBe(0);                             // en la pared B arranca en la esquina
    const sup = addModuleToPlan(plan, 0, "upper", "esquineroSuperior", cfg)!;
    expect(rowItems(plan, 0, "upper", cfg).find((i) => i.mod?.id === sup.id)).toMatchObject({ start: 3.0, width: 0.6 });   // superior 60×60 en la esquina
  });
  it("cocina en U: dos esquinas (A–B y B–C) y el esquinero se gira de una a la otra; en L solo hay una y no gira", () => {
    expect(esquinasDeLayout("L")).toEqual([0]);
    expect(esquinasDeLayout("U")).toEqual([0, 1]);
    expect(esquinasDeLayout("lineal")).toEqual([]);
    const cfg = base({ layout: "U" });
    const plan: any = normalizePlan({ enabled: true, autoUpper: false, tramos: [{ name: "Pared A", length: 2.8, upper: [], lower: [] }, { name: "Pared B", length: 3.6, upper: [], lower: [] }, { name: "Pared C", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    const esq = addModuleToPlan(plan, 0, "lower", "esquinero1x1", cfg)!;          // esquina A–B
    expect(esq.alsoTramo).toBe(1);
    expect(girarEsquinero(plan, 0, "lower", esq.id, [0, 1], cfg)).toBe(true);     // → esquina B–C
    expect(plan.tramos[0].lower).toHaveLength(0);
    expect(plan.tramos[1].lower[0]).toMatchObject({ id: esq.id, alsoTramo: 2 });
    expect(rowItems(plan, 2, "lower", cfg).some((i) => i.fromPrev && i.key === "esquinero1x1")).toBe(true);   // la pared C lo continúa
    expect(girarEsquinero(plan, 1, "lower", esq.id, [0, 1], cfg)).toBe(true);     // y de vuelta a A–B
    expect(plan.tramos[0].lower[0].id).toBe(esq.id);
    const planL: any = normalizePlan({ enabled: true, autoUpper: false, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, base());
    const e2 = addModuleToPlan(planL, 0, "lower", "esquinero1x1", base())!;
    expect(girarEsquinero(planL, 0, "lower", e2.id, [0], base())).toBe(false);    // en L solo hay una esquina
  });
});

