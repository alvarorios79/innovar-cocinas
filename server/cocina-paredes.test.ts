import { describe, it, expect } from "vitest";
import { nombresParedes, normalizarParedes, setInferior, setSuperior, totalesParedes, cocinaDeLevantamiento } from "../shared/cocinaParedes";

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
});
