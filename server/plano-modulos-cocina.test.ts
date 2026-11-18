import { describe, it, expect } from "vitest";
import { normalizePlan, addModuleToPlan, computePlan } from "../shared/kitchenModulePlan";
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
});
