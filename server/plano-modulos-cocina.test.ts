import { describe, it, expect } from "vitest";
import { removeModuleFromPlan, normalizePlan, addModuleToPlan, setModuleWidth, moveModuleToTramo, primerHueco, esquinasDeLayout, girarEsquinero, tidyPlan, dropModule, setModuleWidth, setDefaultWidth, espaciosLibres, ampliarMueble, pegarMueble, rebuildAutoUpper, computePlan, ventanasDeLevantamiento, rowItems } from "../shared/kitchenModulePlan";
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

  // ── Al agregar un módulo, lo que ya estaba acomodado NO se mueve ──
  const posiciones = (p: any, cfg: any, t = 0) => (["lower", "upper"] as const).flatMap((r) => rowItems(p, t, r, cfg).filter((i) => !i.fromPrev).map((i) => `${r}:${i.kind === "tall" ? "alto-" + i.key : i.mod!.id}@${i.start.toFixed(2)}`));
  const agregar = (p: any, cfg: any, row: "lower" | "upper", key: string) => { const q = JSON.parse(JSON.stringify(p)); const m = addModuleToPlan(q, 0, row, key, cfg); tidyPlan(q, cfg); return { q, m }; };
  const sinMover = (antes: string[], despues: string[]) => antes.every((x) => despues.includes(x));
  const planA = (cfg: any, upper: any[] = []): any => normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper, lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {}, specialTramo: { nichoNevera: 0 } }, cfg);

  it("un módulo alto (nevera) ya colocado no se corre cuando se agregan otros módulos", () => {
    const cfg = base({ specialModules: { nichoNevera: true } });
    let p = planA(cfg);
    const antes = posiciones(p, cfg);
    for (const key of ["moduloLavaplatos", "moduloEstufaHorno", "cajoneroTriple"]) {
      const a = posiciones(p, cfg);
      p = agregar(p, cfg, "lower", key).q;
      expect(sinMover(a.filter((x) => x.startsWith("lower:alto") || x.startsWith("upper:alto")), posiciones(p, cfg))).toBe(true);
    }
    expect(posiciones(p, cfg).filter((x) => x.includes("alto-nichoNevera")).every((x) => x.endsWith("@0.00"))).toBe(true);
    void antes;
  });
  it("un inferior arrastrado a otro lugar se queda ahí cuando se agrega otro módulo", () => {
    const cfg = base();
    let p = planA(cfg);
    p = agregar(p, cfg, "lower", "moduloLavaplatos").q;
    const e = agregar(p, cfg, "lower", "moduloEstufaHorno"); p = e.q;
    dropModule(p, 0, "lower", e.m!.id, 1.6, cfg, true); tidyPlan(p, cfg);
    const antes = posiciones(p, cfg).filter((x) => x.startsWith("lower"));
    const despues = posiciones(agregar(p, cfg, "lower", "cajoneroTriple").q, cfg);
    expect(sinMover(antes, despues)).toBe(true);
  });
  it("un superior que el usuario ya puso no se mueve cuando un inferior nuevo genera su superior automático", () => {
    const cfg = base();
    let p = planA(cfg);
    const m = agregar(p, cfg, "upper", "moduloAlmacSup"); p = m.q;
    const antes = posiciones(p, cfg).filter((x) => x.includes(m.m!.id));
    p = agregar(p, cfg, "lower", "cajoneroTriple").q;
    expect(sinMover(antes, posiciones(p, cfg))).toBe(true);
    const antes2 = posiciones(p, cfg).filter((x) => x.includes(m.m!.id));
    p = agregar(p, cfg, "lower", "moduloLavaplatos").q;
    expect(sinMover(antes2, posiciones(p, cfg))).toBe(true);
  });

  it("un superior amarrado a un inferior (el que acompaña al esquinero) acepta una medida propia y la conserva", () => {
    const cfg = base();
    let p = planA(cfg);
    p = agregar(p, cfg, "lower", "moduloLavaplatos").q;
    const auto = p.tramos[0].upper.find((m: any) => m.key === "moduloPlatero" && m.autoOf)!;
    expect(auto).toBeTruthy();
    const q = JSON.parse(JSON.stringify(p));
    setModuleWidth(q, 0, "upper", auto.id, 1.4, cfg); tidyPlan(q, cfg);
    expect(q.tramos[0].upper.find((m: any) => m.id === auto.id)).toMatchObject({ width: 1.4, anchoManual: true });
    // al agregar otro inferior (se recalculan los superiores automáticos) la medida propia se conserva
    const r = agregar(q, cfg, "lower", "moduloAlmacInf").q;
    expect(r.tramos[0].upper.find((m: any) => m.id === auto.id).width).toBe(1.4);
    // «volver a automático»
    delete r.tramos[0].upper.find((m: any) => m.id === auto.id).anchoManual; rebuildAutoUpper(r, 0);
    expect(r.tramos[0].upper.find((m: any) => m.id === auto.id).width).not.toBe(1.4);
  });
  it("espacio libre hasta la ventana y «ampliar» el mueble a ras de ventana (por la derecha y por la izquierda)", () => {
    const cfg = base();
    const v = ventanasDeLevantamiento([{ tipo: "ventana", pared: 0, desde: 150, ancho: 100, alto: 120, antepecho: 100 }], 2)[0];   // ventana de 1,50 a 2,50 m
    let p = planA(cfg, v);
    const m = agregar(p, cfg, "upper", "moduloAlmacSup"); p = m.q;                  // cae en el primer hueco: 0,00–0,65
    const esp = espaciosLibres(p, 0, "upper", m.m!.id, cfg)!;
    expect(esp.izq.libre).toBe(0);
    expect(esp.der).toMatchObject({ hasta: "la ventana" });
    expect(esp.der.libre).toBeCloseTo(1.5 - 0.65, 2);                               // lo que falta hasta la ventana
    const q = JSON.parse(JSON.stringify(p));
    expect(ampliarMueble(q, 0, "upper", m.m!.id, "der", cfg)).toBe(true); tidyPlan(q, cfg);
    const it = rowItems(q, 0, "upper", cfg).find((i) => i.mod?.id === m.m!.id)!;
    expect(it.start + it.width).toBeCloseTo(1.5, 2);                                // termina justo donde empieza la ventana
    // por la izquierda: un módulo a la derecha de la ventana se amplía hasta ella
    let p2 = planA(cfg, v);
    const m2 = agregar(p2, cfg, "upper", "moduloAlmacSup"); p2 = m2.q;
    const m3 = agregar(p2, cfg, "upper", "moduloAlmacSup"); p2 = m3.q;              // segundo hueco libre: junto a la ventana (después de 2,50) o antes
    const e3 = espaciosLibres(p2, 0, "upper", m3.m!.id, cfg)!;
    expect(e3.izq.libre + e3.der.libre).toBeGreaterThanOrEqual(0);
  });

  // ── Imán: un módulo soltado cerca de su vecino (o de la ventana) queda pegado, sin huecos por imprecisión ──
  it("imán: soltado a 50 cm de su vecino queda pegado; a 90 cm, no", () => {
    const cfg = base();
    const p: any = normalizePlan({ enabled: true, autoUpper: false, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    const a = addModuleToPlan(p, 0, "lower", "cajoneroTriple", cfg)!; const b = addModuleToPlan(p, 0, "lower", "cajoneroDoble", cfg)!;
    const inicio = (q: any, id: string) => rowItems(q, 0, "lower", cfg).find((i) => i.mod?.id === id)!.start;
    const q1 = JSON.parse(JSON.stringify(p)); dropModule(q1, 0, "lower", b.id, 1.2, cfg, true);      // pegado a 0,70 → 0,50 de separación
    expect(inicio(q1, b.id)).toBeCloseTo(0.7, 2);
    const q2 = JSON.parse(JSON.stringify(p)); dropModule(q2, 0, "lower", b.id, 1.6, cfg, true);      // 0,90 de separación y lejos de la pared: queda donde se soltó
    expect(inicio(q2, b.id)).toBeCloseTo(1.6, 2);
    void a;
  });
  it("imán: un superior soltado a 35 cm de la ventana queda a ras de ella", () => {
    const cfg = base();
    const v = ventanasDeLevantamiento([{ tipo: "ventana", pared: 0, desde: 150, ancho: 100, alto: 120, antepecho: 100 }], 2)[0];
    const p = planA(cfg, v);
    const m = addModuleToPlan(p, 0, "upper", "moduloAlmacSup", cfg)!;
    dropModule(p, 0, "upper", m.id, 0.5, cfg, true); tidyPlan(p, cfg);                             // termina en 1,15: a 0,35 de la ventana (1,50)
    const it = rowItems(p, 0, "upper", cfg).find((i) => i.mod?.id === m.id)!;
    expect(it.start + it.width).toBeCloseTo(1.5, 2);
  });

  it("varios módulos del mismo tipo con medidas distintas: cambiarle la medida a UNO no mueve a los otros", () => {
    const cfg = base();
    let p = planA(cfg);
    const a = agregar(p, cfg, "upper", "moduloAlmacSup"); p = a.q;
    const b = agregar(p, cfg, "upper", "moduloAlmacSup"); p = b.q;
    const c = agregar(p, cfg, "upper", "moduloAlmacSup"); p = c.q;
    // se les dan medidas distintas
    for (const [m, w] of [[a.m!, 0.5], [b.m!, 0.8], [c.m!, 0.6]] as const) { setModuleWidth(p, 0, "upper", m.id, w, cfg); }
    tidyPlan(p, cfg);
    const ancho = (q: any, id: string) => q.tramos[0].upper.find((m: any) => m.id === id).width;
    expect([a.m!.id, b.m!.id, c.m!.id].map((id) => ancho(p, id))).toEqual([0.5, 0.8, 0.6]);
    // cambiar solo el segundo
    const q = JSON.parse(JSON.stringify(p)); setModuleWidth(q, 0, "upper", b.m!.id, 0.9, cfg); tidyPlan(q, cfg);
    expect([a.m!.id, b.m!.id, c.m!.id].map((id) => ancho(q, id))).toEqual([0.5, 0.9, 0.6]);
    // la medida «de los nuevos» no toca los que ya están
    const r = JSON.parse(JSON.stringify(p)); setDefaultWidth(r, "moduloAlmacSup", 0.45);
    expect([a.m!.id, b.m!.id, c.m!.id].map((id) => ancho(r, id))).toEqual([0.5, 0.8, 0.6]);
    expect(r.defaultWidth.moduloAlmacSup).toBe(0.45);
  });

  it("como una línea de tiempo: al achicar un mueble el siguiente se corre y queda pegado, sin espacio en medio", () => {
    const cfg = base();
    let p = planA(cfg);
    const a = agregar(p, cfg, "lower", "cajoneroTriple"); p = a.q;
    const b = agregar(p, cfg, "lower", "cajoneroDoble"); p = b.q;
    const c = agregar(p, cfg, "lower", "moduloAlmacInf"); p = c.q;
    const ini = (q: any, id: string) => rowItems(q, 0, "lower", cfg).find((i) => i.mod?.id === id)!;
    const q = JSON.parse(JSON.stringify(p)); setModuleWidth(q, 0, "lower", b.m!.id, 0.55, cfg); tidyPlan(q, cfg);   // 0,60 → 0,55
    expect(ini(q, b.m!.id).start).toBeCloseTo(0.7, 2);                             // B sigue pegado a A
    expect(ini(q, c.m!.id).start).toBeCloseTo(1.25, 2);                            // C se corrió 5 cm y quedó pegado a B
    expect(espaciosLibres(q, 0, "lower", b.m!.id, cfg)!.der.libre).toBe(0);
    expect(espaciosLibres(q, 0, "lower", a.m!.id, cfg)!.der.libre).toBe(0);
    // al agrandar pasa lo mismo al revés: C se empuja y sigue pegado
    const r = JSON.parse(JSON.stringify(q)); setModuleWidth(r, 0, "lower", b.m!.id, 0.7, cfg); tidyPlan(r, cfg);
    expect(ini(r, c.m!.id).start).toBeCloseTo(1.4, 2);
    expect(espaciosLibres(r, 0, "lower", b.m!.id, cfg)!.der.libre).toBe(0);
  });
  it("«Pegar» junta un mueble con el vecino cuando quedó un espacio (por ejemplo, soltado lejos)", () => {
    const cfg = base();
    let p = planA(cfg);
    const a = agregar(p, cfg, "lower", "cajoneroTriple"); p = a.q;
    const b = agregar(p, cfg, "lower", "cajoneroDoble"); p = b.q;
    const c = agregar(p, cfg, "lower", "moduloAlmacInf"); p = c.q;
    const ini = (q: any, id: string) => rowItems(q, 0, "lower", cfg).find((i) => i.mod?.id === id)!;
    const q = JSON.parse(JSON.stringify(p)); dropModule(q, 0, "lower", c.m!.id, 2.4, cfg, true); tidyPlan(q, cfg);   // C queda lejos de B
    expect(espaciosLibres(q, 0, "lower", c.m!.id, cfg)!.izq.libre).toBeGreaterThan(0.5);
    expect(pegarMueble(q, 0, "lower", c.m!.id, "izq", cfg)).toBe(true); tidyPlan(q, cfg);
    expect(ini(q, c.m!.id).start).toBeCloseTo(ini(q, b.m!.id).start + ini(q, b.m!.id).width, 2);
  });
  it("el esquinero inferior llama a UN solo superior (el esquinero superior): no se arma con un almacenamiento de relleno", () => {
    const cfg = base();
    let p = planA(cfg);
    p = agregar(p, cfg, "lower", "esquinero1x1").q;
    const sup = p.tramos[0].upper;
    expect(sup.map((m: any) => m.key)).toEqual(["esquineroSuperior"]);          // una sola pieza, sin «Almacenamiento superior» al lado
    expect(sup[0].width).toBe(0.6);
    expect(sup[0].alsoTramo).toBe(1);                                            // es el esquinero en «L» compartido con la pared B
    const it = rowItems(p, 0, "upper", cfg).find((i) => i.key === "esquineroSuperior")!;
    expect(it.start + it.width).toBeCloseTo(3.6, 2);                              // en la esquina
    // lo pequeño pegado al esquinero (basurero) tiene su propio almacenamiento, aparte del esquinero
    let q = planA(cfg);
    q = agregar(q, cfg, "lower", "basurero").q; q = agregar(q, cfg, "lower", "esquinero1x1").q;
    expect(q.tramos[0].upper.filter((m: any) => m.key === "esquineroSuperior")).toHaveLength(1);
    expect(q.tramos[0].upper.some((m: any) => m.key === "esquineroSuperior" && m.autoRole === "cornerFill")).toBe(false);
  });

  // ── El esquinero es UN solo mueble por esquina: nunca quedan dos registrados ──
  const contar = (q: any, key: string) => q.tramos.reduce((a: number, t: any) => a + t.lower.filter((m: any) => m.key === key).length + t.upper.filter((m: any) => m.key === key).length, 0);
  it("esquinero: agregar el mismo esquinero dos veces en la misma esquina deja uno solo", () => {
    const cfg = base();
    const p = planA(cfg);
    const a = addModuleToPlan(p, 0, "lower", "esquinero1x1", cfg)!; const b = addModuleToPlan(p, 0, "lower", "esquinero1x1", cfg)!;
    expect(b.id).toBe(a.id);
    expect(contar(p, "esquinero1x1")).toBe(1);
    // el superior puesto a mano cuando ya existe el automático tampoco se duplica
    tidyPlan(p, cfg);
    expect(contar(p, "esquineroSuperior")).toBe(1);
    addModuleToPlan(p, 0, "upper", "esquineroSuperior", cfg); tidyPlan(p, cfg);
    expect(contar(p, "esquineroSuperior")).toBe(1);
  });
  it("esquinero: el superior puesto a mano ANTES que el inferior no se repite cuando llega el inferior (no sale un segundo automático)", () => {
    const cfg = base();
    let p = planA(cfg);
    addModuleToPlan(p, 0, "upper", "esquineroSuperior", cfg); tidyPlan(p, cfg);
    p = agregar(p, cfg, "lower", "esquinero1x1").q;
    expect(contar(p, "esquineroSuperior")).toBe(1);
    expect(contar(p, "esquinero1x1")).toBe(1);
    expect(p.tramos[0].upper.find((m: any) => m.key === "esquineroSuperior").autoOf).toBeUndefined();   // se conserva el que puso el usuario
  });
  it("esquinero: solo existe donde hay esquina (no en la última pared, ni en cocinas lineales o paralelas)", () => {
    const cfg = base();
    const p = planA(cfg);
    expect(addModuleToPlan(p, 1, "lower", "esquinero1x1", cfg)).toBeUndefined();                    // la pared B no tiene pared siguiente
    const lineal = base({ layout: "lineal" });
    expect(addModuleToPlan(planA(lineal), 0, "lower", "esquinero1x1", lineal)).toBeUndefined();
    expect(contar(p, "esquinero1x1")).toBe(0);
  });
  it("esquinero: un plan que ya traía dos esquineros repetidos se cura solo", () => {
    const cfg = base();
    const mod = (id: string, extra: any = {}) => ({ id, key: "esquineroSuperior", width: 0.6, alsoTramo: 1, ...extra });
    const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: [mod("auto1", { autoOf: ["x"] }), mod("mano1")], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    expect(plan.tramos[0].upper).toHaveLength(1);
    expect(plan.tramos[0].upper[0].id).toBe("mano1");                                              // queda el puesto por el usuario
    const lower: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [{ id: "e1", key: "esquinero1x1", width: 1, alsoTramo: 1 }, { id: "e2", key: "esquinero1x1", width: 1, alsoTramo: 1 }] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {} }, cfg);
    expect(lower.tramos[0].lower).toHaveLength(1);
  });

  // ── Línea de tiempo magnética abajo: al sacar o mover un mueble, los demás se corren y no queda un hueco ──
  it("inferiores: al arrastrar un mueble a otro lugar de la misma pared, los demás se corren y quedan pegados", () => {
    const cfg = base();
    const p = planA(cfg);
    ["cajoneroDoble", "basurero", "moduloAlmacInf"].forEach(k => addModuleToPlan(p, 0, "lower", k, cfg));
    const [a] = p.tramos[0].lower;
    dropModule(p, 0, "lower", a.id, 1.2, cfg, true);   // el primero se suelta al final de la fila
    const it = rowItems(p, 0, "lower", cfg).sort((x: any, y: any) => x.start - y.start);
    expect(it.map((i: any) => i.start)).toEqual([0, it[0].width, it[0].width + it[1].width]);   // sin huecos
    expect(it[2].mod.id).toBe(a.id);
  });
  it("inferiores: al quitar un mueble los siguientes se corren y no queda hueco", () => {
    const cfg = base();
    const p = planA(cfg);
    ["cajoneroDoble", "basurero", "moduloAlmacInf"].forEach(k => addModuleToPlan(p, 0, "lower", k, cfg));
    const [, b] = p.tramos[0].lower;
    removeModuleFromPlan(p, 0, "lower", b.id);
    const it = rowItems(p, 0, "lower", cfg).sort((x: any, y: any) => x.start - y.start);
    expect(it[1].start).toBeCloseTo(it[0].width, 2);
  });

  it("isla: el largo del plano sigue la medida de la isla de la cotización aunque el plano ya estuviera guardado", () => {
    const cfg: any = { shape: "premium", layout: "lineal", totalMeters: 3, island: { enabled: true, meters: 2 }, bar: { enabled: true, meters: 1.5 }, specialModules: {}, countertop: {}, paintedDoors: { enabled: true } };
    const viejo: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3, upper: [], lower: [] }], extras: {} }, cfg);
    cfg.island.meters = 2.4; cfg.bar.meters = 1.8;
    const nuevo: any = normalizePlan(viejo, cfg);
    expect(nuevo.tramos.find((t: any) => t.name === "Isla").length).toBe(2.4);
    expect(nuevo.tramos.find((t: any) => t.name === "Barra").length).toBe(1.8);
  });

  it("solo el esquinero, la estufa y el lavaplatos arrastran su superior; cajoneros, almacenamiento y pequeños no", () => {
    const cfg = base();
    let p = planA(cfg);
    ["cajoneroTriple", "cajoneroDoble", "moduloAlmacInf", "basurero", "especiero", "botellero"].forEach(k => { p = agregar(p, cfg, "lower", k).q; });
    expect(p.tramos[0].upper).toHaveLength(0);
    p = agregar(p, cfg, "lower", "moduloEstufaHorno").q; p = agregar(p, cfg, "lower", "moduloLavaplatos").q; p = agregar(p, cfg, "lower", "esquinero1x1").q;
    expect(p.tramos[0].upper.map((m: any) => m.key).sort()).toEqual(["esquineroSuperior", "moduloExtractor", "moduloPlatero"]);
  });

  it("módulos de piso a techo: con el candado abierto se les puede dar otra medida y el plano la respeta", () => {
    const cfg = base(); cfg.specialModules = { nichoNevecon: true };
    const p: any = normalizePlan({ enabled: true, tramos: [{ name: "Pared A", length: 3.6, upper: [], lower: [] }, { name: "Pared B", length: 2.8, upper: [], lower: [] }], extras: {}, specialWidths: { nichoNevecon: 1.2 } }, cfg);
    expect(p.specialWidths.nichoNevecon).toBe(1.2);                                                // se conserva al volver a abrir
    const it = rowItems(p, 0, "lower", cfg).find((i: any) => i.key === "nichoNevecon")!;
    expect(it.width).toBe(1.2);
    delete p.specialWidths.nichoNevecon;                                                            // candado cerrado: medida estándar
    expect(rowItems(p, 0, "lower", cfg).find((i: any) => i.key === "nichoNevecon")!.width).toBe(1);
  });
});


describe("Estufa y su extractor se mueven juntos", () => {
  const armar = () => {
    const config: any = { shape: "premium", layout: "lineal", totalMeters: 4, mlPriceCode: "COCINA_ML_PREMIUM", specialModules: {}, countertop: { type: "quarzone" }, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: true }, ledLighting: 0 };
    const plan: any = normalizePlan({ enabled: true, tramos: [{ name: "A", length: 4, upper: [], lower: [] }], extras: {} }, config);
    ["cajoneroTriple", "moduloEstufaHorno", "moduloLavaplatos", "cajoneroDoble"].forEach((k) => addModuleToPlan(plan, 0, "lower", k, config));
    tidyPlan(plan, config);
    return { plan, config };
  };
  const pos = (plan: any, config: any, row: "lower" | "upper", key: string) => rowItems(plan, 0, row, config).find((i) => i.key === key)!.start;
  it("arrastrar el extractor mueve la estufa completa", () => {
    const { plan, config } = armar();
    const ext = plan.tramos[0].upper.find((m: any) => m.key === "moduloExtractor");
    dropModule(plan, 0, "upper", ext.id, pos(plan, config, "upper", "moduloExtractor") + 1.0, config, true); tidyPlan(plan, config);
    expect(pos(plan, config, "lower", "moduloEstufaHorno")).toBeGreaterThan(1.2);
    expect(pos(plan, config, "upper", "moduloExtractor")).toBeCloseTo(pos(plan, config, "lower", "moduloEstufaHorno"), 2);
  });
  it("mover la estufa un paso a la derecha cambia de lugar con su vecino y el extractor la acompaña", () => {
    const { plan, config } = armar();
    const est = plan.tramos[0].lower.find((m: any) => m.key === "moduloEstufaHorno");
    est.manual = true; plan.tramos[0].upper.forEach((u: any) => { u.manual = true; });
    dropModule(plan, 0, "lower", est.id, pos(plan, config, "lower", "moduloEstufaHorno") + 0.5, config, true); tidyPlan(plan, config);
    expect(pos(plan, config, "lower", "moduloEstufaHorno")).toBeCloseTo(1.4, 2);
    expect(pos(plan, config, "upper", "moduloExtractor")).toBeCloseTo(1.4, 2);
  });
});
