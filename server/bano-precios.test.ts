import { describe, it, expect } from "vitest";
import { conservarDescripcionBano, precioMuebleBano, precioMesonBano, precioExcavadoBano, factorFondoMueble } from "../shared/banoPrecios";

const FIJO = 240000, ML = 850000;
describe("Mueble de baño: valor fijo + por metro", () => {
  it("la medida de referencia (0,60 × 0,45 m) cuesta $750.000", () => {
    expect(precioMuebleBano(FIJO, ML, 60, 45)).toBe(750000);
  });
  it("sube con el ancho pero cada metro extra cuesta menos que el primero (sin saltos)", () => {
    expect(precioMuebleBano(FIJO, ML, 80, 45)).toBe(920000);
    expect(precioMuebleBano(FIJO, ML, 100, 45)).toBe(1090000);
    expect(precioMuebleBano(FIJO, ML, 255, 45)).toBe(2410000);
    expect(precioMuebleBano(FIJO, ML, 61, 45) - precioMuebleBano(FIJO, ML, 60, 45)).toBeLessThan(20000);
  });
  it("el caso de 2,55 × 0,52 m queda cerca de $2,8 millones", () => {
    expect(precioMuebleBano(FIJO, ML, 255, 52)).toBe(2780000);
  });
  it("el fondo cobra proporcional hasta 60 cm, +30 % hasta 90 y ×2 después", () => {
    expect(factorFondoMueble(45)).toBe(1);
    expect(factorFondoMueble(60)).toBeCloseTo(60 / 45, 5);
    expect(factorFondoMueble(80)).toBeCloseTo((60 / 45) * 1.3, 5);
    expect(factorFondoMueble(100)).toBeCloseTo((60 / 45) * 2, 5);
  });
  it("mesón de piedra: por ml con el precio de los mesones de cocina", () => {
    expect(precioMesonBano("granito", 100, 55)).toBe(750000);
    expect(precioMesonBano("granito", 100, 80)).toBe(975000); // +30 %
  });
  it("excavado = piedra + poceta: a 0,60 m en cuarzo cuesta $950.000", () => {
    const e = precioExcavadoBano("cuarzo", 60, 45, 1);
    expect(e.piedra).toBe(510000);
    expect(e.uno).toBe(950000);
    expect(e.total).toBe(950000);
  });
  it("excavado de 2,55 m con 2 pocetas: piedra + 1.ª poceta + 2.ª poceta ($400.000)", () => {
    const e = precioExcavadoBano("cuarzo", 255, 52, 2);
    expect(e.piedra).toBe(2167500);
    expect(e.segunda).toBe(400000);
    expect(e.total).toBe(2167500 + 440000 + 400000);
    expect(precioExcavadoBano("cuarzo", 100, 55, 2).segunda).toBe(0); // menos de 1,30 m: una sola poceta
    expect(precioExcavadoBano("cuarzo", 255, 52, 2, 440000, 450000).segunda).toBe(450000); // el valor sale del Motor
  });
  it("la descripción se regenera sola salvo que se haya editado a mano", () => {
    expect(conservarDescripcionBano("", undefined)).toBe(false);
    expect(conservarDescripcionBano("Mueble de Baño Flotante — 2,55 m… Para lavamanos de excavado.", undefined)).toBe(false); // guardada antes, parte del texto automático
    expect(conservarDescripcionBano("2 unidades — Mueble de Baño Flotante — …", undefined)).toBe(false);
    expect(conservarDescripcionBano("Texto propio del vendedor", undefined)).toBe(true);
    expect(conservarDescripcionBano("Mueble de Baño Flotante — editado", true)).toBe(true);   // marcada como manual
    expect(conservarDescripcionBano("Mueble de Baño Flotante — …", false)).toBe(false);       // se pidió regenerar
  });
});
