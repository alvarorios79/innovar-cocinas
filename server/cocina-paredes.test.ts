import { describe, it, expect } from "vitest";
import { buildKitchenQuoteDescription } from "./kitchen-description";
import { ventanasSuperioresCm, descuentoMesonCm, mueblesSugeridos, aplicarMueblesAutomaticos, descuentosEsquinas, paredGanadoraEsquina, anchoMuroCm, imantarDesde, estadoIman, geometriaParedes, ajustarAbertura, nombresParedes, normalizarParedes, setInferior, setSuperior, totalesParedes, cocinaDeLevantamiento } from "../shared/cocinaParedes";

describe("Paredes de la cocina (levantamiento)", () => {
  it("cada forma pide sus paredes: línea 1, L 2, U 3, paralela 2", () => {
    expect(nombresParedes("Lineal")).toEqual(["A"]);
    expect(nombresParedes("L")).toEqual(["A", "B"]);
    expect(nombresParedes("U")).toEqual(["A", "B", "C"]);
    expect(nombresParedes("Paralela")).toEqual(["A", "B"]);
    expect(normalizarParedes("U", [{ inf: 300 }])).toHaveLength(3);
  });
  it("lo escrito a mano queda fijo (marca de manual)", () => {
    const p = setInferior({}, 300);
    expect(p).toMatchObject({ inf: 300, infManual: true });
    expect(setSuperior(p, 240)).toMatchObject({ sup: 240, supManual: true });
  });
  it("suma inferiores y superiores por separado en metros", () => {
    const t = totalesParedes([{ inf: 300, sup: 300 }, { inf: 240, sup: 180 }]);
    expect(t).toEqual({ infM: 5.4, supM: 4.8 });
  });
  it("del levantamiento sale forma, paredes y metros inferiores/superiores", () => {
    const c = cocinaDeLevantamiento({ _cocina_forma: "L", _cocina_paredes: [{ inf: 300, sup: 300 }, { inf: 240, sup: 180 }], _cocina_isla: 150, _cocina_alto: 240, _cocina_profundo: 60 })!;
    expect(c.layout).toBe("L");
    expect(c.lowerMeters).toBe(5.4);
    expect(c.upperMeters).toBe(4.8);
    expect(c.islaM).toBe(1.5);
    expect(c.aproximado).toBe(false);
  });
  it("un levantamiento antiguo (solo ancho) se lee como aproximado", () => {
    const c = cocinaDeLevantamiento({ _cocina_forma: "Lineal", _cocina_ancho: 420 })!;
    expect(c.lowerMeters).toBe(4.2);
    expect(c.aproximado).toBe(true);
    expect(cocinaDeLevantamiento({})).toBeNull();
  });

  it("geometría 3D: cada forma coloca sus paredes", () => {
    const ps = [{ inf: 300 }, { inf: 240 }, { inf: 250 }];
    expect(geometriaParedes("Lineal", ps)).toHaveLength(1);
    const L = geometriaParedes("L", ps);
    expect(L.map((w) => w.largo)).toEqual([3, 2.4]);
    expect([L[1].x1, L[1].z1]).toEqual([3, 0]); // B arranca donde termina A
    const U = geometriaParedes("U", ps);
    expect(U).toHaveLength(3);
    const P = geometriaParedes("Paralela", ps, 260);
    expect(P[1].z1).toBe(2.6); // la segunda pared queda a la distancia indicada
  });
  it("una ventana o puerta se ajusta para que quepa dentro de su pared", () => {
    const a = ajustarAbertura({ id: "x", tipo: "ventana", pared: 0, desde: 280, ancho: 120, alto: 200, antepecho: 100 }, 300, 240);
    expect(a.desde + a.ancho).toBeLessThanOrEqual(300);
    expect(a.antepecho + a.alto).toBeLessThanOrEqual(240);
  });

  it("imán: cerca del inicio o del final del muro se pega; lejos se queda donde está", () => {
    const v = { id: "v", tipo: "ventana" as const, pared: 0, desde: 8, ancho: 120, alto: 120, antepecho: 100 };
    expect(imantarDesde(v, 8, 300, [])).toBe(0);     // a 8 cm del inicio → pegada al inicio
    expect(imantarDesde(v, 100, 300, [])).toBe(100); // lejos de los dos extremos → se queda
    expect(imantarDesde(v, 170, 300, [])).toBe(180); // a 10 cm del final posible (180) → pegada al final
    expect(imantarDesde(v, 150, 280, [])).toBe(160); // pared de 280: el final posible es 160
  });
  it("imán: se pega junto a otra abertura de la misma pared", () => {
    const otra = { id: "o", tipo: "puerta" as const, pared: 0, desde: 0, ancho: 90, alto: 210, antepecho: 0 };
    const v = { id: "v", tipo: "ventana" as const, pared: 0, desde: 96, ancho: 100, alto: 120, antepecho: 100 };
    expect(imantarDesde(v, 96, 400, [otra])).toBe(90);      // queda justo después de la puerta
    expect(estadoIman({ ...v, desde: 90 }, 400, [otra])).toBe("vecina");
    expect(estadoIman({ ...v, desde: 0 }, 400, [])).toBe("inicio");
    expect(estadoIman({ ...v, desde: 300 }, 400, [])).toBe("final");
  });

  it("isla y barra del levantamiento: ancho, profundidad y altura", () => {
    const c = cocinaDeLevantamiento({
      _cocina_forma: "L", _cocina_paredes: [{ inf: 300, sup: 300 }, { inf: 240, sup: 240 }],
      _cocina_isla: 200, _cocina_isla_profundo: 90, _cocina_isla_alto: 90,
      _cocina_barra: 150, _cocina_barra_profundo: 40, _cocina_barra_alto: 100,
    })!;
    expect(c.isla).toEqual({ anchoCm: 200, profundoCm: 90, altoCm: 90 });
    expect(c.barra).toEqual({ anchoCm: 150, profundoCm: 40, altoCm: 100 });
    expect(cocinaDeLevantamiento({ _cocina_forma: "L", _cocina_paredes: [{ inf: 300 }] })!.isla).toBeNull();
  });

  it("el ancho de la pared es aparte de los muebles: el muro manda en el dibujo", () => {
    expect(anchoMuroCm({ ancho: 360, inf: 300, sup: 300 })).toBe(360);
    expect(anchoMuroCm({ inf: 300, sup: 280 })).toBe(300); // sin ancho escrito, se usa el mayor de los muebles
    const L = geometriaParedes("L", [{ ancho: 360, alto: 250, inf: 300 }, { ancho: 240, inf: 200 }]);
    expect(L.map((w) => w.largo)).toEqual([3.6, 2.4]);
    expect(L[0].altoM).toBe(2.5);
    expect(L[1].altoM).toBeUndefined();                      // sin alto propio usa el alto general
  });
  it("del levantamiento salen el ancho y el alto de cada pared y los muebles aparte", () => {
    const c = cocinaDeLevantamiento({ _cocina_forma: "L", _cocina_paredes: [{ ancho: 360, alto: 250, inf: 300, sup: 280 }, { ancho: 240, inf: 200, sup: 200 }] })!;
    expect(c.paredesM[0]).toMatchObject({ ancho: 3.6, alto: 2.5, inf: 3, sup: 2.8 });
    expect(c.lowerMeters).toBe(5);
    expect(c.upperMeters).toBe(4.8);
  });

  it("la madera se cobra plena: inferiores y superiores = ancho completo de cada pared (L)", () => {
    const ps = [{ ancho: 360 }, { ancho: 280 }];
    expect(mueblesSugeridos("L", ps)).toEqual([{ inf: 360, sup: 360 }, { inf: 280, sup: 280 }]);
  });
  it("L: el descuento de esquina es SOLO del mesón: la pared más ancha llega y la otra se acorta 0,60", () => {
    const ps = [{ ancho: 360 }, { ancho: 280 }];
    expect(paredGanadoraEsquina("L", ps)).toEqual([0]);
    expect(descuentoMesonCm("L", ps)).toEqual({ porPared: [0, 60], totalCm: 60 });
    const d = descuentosEsquinas("L", ps);
    expect(d[1]).toMatchObject({ infIni: 60, supIni: 0, supFin: 0 });   // los superiores nunca se descuentan solos
  });
  it("L: se puede elegir cuál pared llega a la esquina", () => {
    const ps = [{ ancho: 360 }, { ancho: 280 }];
    expect(descuentoMesonCm("L", ps, 60, [1])).toEqual({ porPared: [60, 0], totalCm: 60 });
  });
  it("U: el fondo (B) llega a las dos esquinas y los lados (A y C) pierden 0,60 de mesón cada uno", () => {
    const ps = [{ ancho: 280 }, { ancho: 360 }, { ancho: 280 }];
    expect(descuentoMesonCm("U", ps)).toEqual({ porPared: [60, 0, 60], totalCm: 120 });
    expect(mueblesSugeridos("U", ps).map((m) => m.inf)).toEqual([280, 360, 280]);   // madera plena
  });
  it("lo calculado solo se actualiza; lo escrito a mano no se toca", () => {
    const ps = aplicarMueblesAutomaticos("L", [{ ancho: 360 }, { ancho: 280, inf: 200, infManual: true }]);
    expect(ps[0].inf).toBe(360);
    expect(ps[1].inf).toBe(200);        // manual: queda
    expect(ps[1].sup).toBe(280);        // automático y pleno
    const cambio = aplicarMueblesAutomaticos("L", [{ ...ps[0], ancho: 400 }, ps[1]]);
    expect(cambio[0].inf).toBe(400);
  });
  it("el levantamiento entrega madera plena y el descuento del mesón aparte", () => {
    const c = cocinaDeLevantamiento({ _cocina_forma: "L", _cocina_paredes: [{ ancho: 360, inf: 360, sup: 360 }, { ancho: 280, inf: 280, sup: 280 }] });
    expect(c?.lowerMeters).toBe(6.4);
    expect(c?.upperMeters).toBe(6.4);
    expect(c?.descMesonM).toBe(0.6);
  });
  it("sin esquinas (línea y paralela) no hay descuento", () => {
    expect(mueblesSugeridos("Lineal", [{ ancho: 360 }])[0]).toEqual({ inf: 360, sup: 360 });
    expect(mueblesSugeridos("Paralela", [{ ancho: 300 }, { ancho: 300 }]).map((m) => m.inf)).toEqual([300, 300]);
  });

  it("la descripción: madera plena (6,40) y mesón con el descuento de esquina (5,80)", () => {
    const cfg: any = { shape: "premium", layout: "L", independentMeters: true, lowerMeters: 6.4, upperMeters: 6.4, totalMeters: 12.8, cornerDiscountMeters: 0.6, mlPriceCode: "COCINA_ML_PREMIUM",
      specialModules: {}, countertop: { type: "granito" }, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: false } };
    const txt = buildKitchenQuoteDescription(cfg, "");
    expect(txt).toMatch(/Muebles inferiores: 6[.,]40/);
    expect(txt).toMatch(/Mesón en [^\n]*5[.,]80/);
    cfg.cornerDiscountMeters = 0;
    expect(buildKitchenQuoteDescription(cfg, "")).toMatch(/Mesón en [^\n]*6[.,]40/);
  });

  it("con módulos altos la operación cambia: se restan de inferiores, superiores y mesón (si el superior viene del levantamiento)", () => {
    const base: any = { shape: "premium", layout: "L", independentMeters: true, lowerMeters: 6.4, upperMeters: 6.4, totalMeters: 12.8, cornerDiscountMeters: 0.6, mlPriceCode: "COCINA_ML_PREMIUM",
      specialModules: { nichoNevera: true }, countertop: { type: "granito" }, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: false } };
    const conBandera = buildKitchenQuoteDescription({ ...base, upperPlena: true }, "");
    expect(conBandera).toMatch(/Muebles inferiores: 5[.,]65/);   // 6,40 − 0,75
    expect(conBandera).toMatch(/Muebles superiores: 5[.,]65/);   // 6,40 − 0,75
    expect(conBandera).toMatch(/Mesón en [^\n]*5[.,]05/);        // 6,40 − 0,75 − 0,60
    // cotización con superiores escritos a mano (sin bandera): no se toca
    expect(buildKitchenQuoteDescription(base, "")).toMatch(/Muebles superiores: 6[.,]40/);
  });

  it("cocina lineal de 5 m con nicho nevecón y alacena, sin ventanas: inferiores 3,50 y superiores 3,50", () => {
    const c = cocinaDeLevantamiento({ _cocina_forma: "Lineal", _cocina_paredes: [{ ancho: 500, inf: 500, sup: 500 }] })!;
    expect(c.lowerMeters).toBe(5);
    expect(c.upperMeters).toBe(5);
    expect(c.descMesonM).toBe(0);   // lineal: sin esquinas
    const cfg: any = { shape: "premium", layout: "lineal", independentMeters: true, lowerMeters: c.lowerMeters, upperMeters: c.upperMeters, upperPlena: true, totalMeters: 10,
      cornerDiscountMeters: 0, mlPriceCode: "COCINA_ML_PREMIUM", specialModules: { nichoNevecon: true, alacenaEntrepanos: true },
      countertop: { type: "granito" }, island: { enabled: false, meters: 0 }, bar: { enabled: false, meters: 0 }, paintedDoors: { enabled: false } };
    const txt = buildKitchenQuoteDescription(cfg, "");
    expect(txt).toMatch(/Muebles inferiores: 3[.,]50/);
    expect(txt).toMatch(/Muebles superiores: 3[.,]50/);
    expect(txt).toMatch(/Mesón en [^\n]*3[.,]50/);
  });

  it("muro de 3 m con ventana de 1,20 a 0,50 m: superiores 0,50 + 1,30 = 1,80 (donde va ventana no va mueble)", () => {
    const m: any = { _cocina_forma: "Lineal", _cocina_paredes: [{ ancho: 300, inf: 300, sup: 300 }],
      _cocina_aberturas: [{ id: "v", tipo: "ventana", pared: 0, desde: 50, ancho: 120, alto: 120, antepecho: 100 }] };
    expect(ventanasSuperioresCm("Lineal", m._cocina_paredes, m._cocina_aberturas)).toEqual([120]);
    const c = cocinaDeLevantamiento(m)!;
    expect(c.lowerMeters).toBe(3);        // los inferiores no cambian
    expect(c.upperMeters).toBe(1.8);
    expect(c.ventanasSupM).toBe(1.2);
  });
  it("una ventana baja (en el salpicadero, hasta 1,50 m) y las puertas no restan de los superiores", () => {
    const m: any = { _cocina_forma: "Lineal", _cocina_paredes: [{ ancho: 300, inf: 300, sup: 300 }],
      _cocina_aberturas: [{ id: "v", tipo: "ventana", pared: 0, desde: 50, ancho: 80, alto: 60, antepecho: 90 }, { id: "p", tipo: "puerta", pared: 0, desde: 200, ancho: 90, alto: 210, antepecho: 0 }] };
    expect(cocinaDeLevantamiento(m)!.upperMeters).toBe(3);
  });
});

