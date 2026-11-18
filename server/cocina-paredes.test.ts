import { describe, it, expect } from "vitest";
import { imantarDesde, estadoIman, geometriaParedes, ajustarAbertura, nombresParedes, normalizarParedes, setInferior, setSuperior, totalesParedes, cocinaDeLevantamiento } from "../shared/cocinaParedes";

describe("Paredes de la cocina (levantamiento)", () => {
  it("cada forma pide sus paredes: línea 1, L 2, U 3, paralela 2", () => {
    expect(nombresParedes("Lineal")).toEqual(["A"]);
    expect(nombresParedes("L")).toEqual(["A", "B"]);
    expect(nombresParedes("U")).toEqual(["A", "B", "C"]);
    expect(nombresParedes("Paralela")).toEqual(["A", "B"]);
    expect(normalizarParedes("U", [{ inf: 300 }])).toHaveLength(3);
  });
  it("el superior sigue al inferior hasta que se escribe aparte", () => {
    let p = setInferior({}, 300);
    expect(p.sup).toBe(300);
    p = setSuperior(p, 240);          // el superior es menor
    p = setInferior(p, 320);          // cambia el inferior: el superior ya no lo sigue
    expect(p.inf).toBe(320);
    expect(p.sup).toBe(240);
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
});
