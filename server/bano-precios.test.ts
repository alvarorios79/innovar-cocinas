import { describe, it, expect } from "vitest";
import { conservarDescripcionBano, precioMuebleBano, precioMesonBano, precioExcavadoBano, factorFondoMueble } from "../shared/banoPrecios";

describe("Mueble de baño: precio proporcional", () => {
  it("la medida de referencia (60 × 45) cuesta el precio base", () => {
    expect(precioMuebleBano(750000, 60, 45)).toBe(750000);
  });
  it("sube proporcional al ancho, sin saltos", () => {
    expect(precioMuebleBano(750000, 90, 45)).toBe(1130000); // 1,125 M redondeado a $10.000
    expect(precioMuebleBano(750000, 61, 45)).toBeGreaterThan(precioMuebleBano(750000, 60, 45));
    expect(precioMuebleBano(750000, 61, 45) - precioMuebleBano(750000, 60, 45)).toBeLessThan(30000);
    expect(precioMuebleBano(750000, 120, 45)).toBe(1500000);
  });
  it("el fondo cobra proporcional hasta 60 cm, +30 % hasta 90 y ×2 después", () => {
    expect(factorFondoMueble(45)).toBe(1);
    expect(factorFondoMueble(60)).toBeCloseTo(60 / 45, 5);
    expect(factorFondoMueble(80)).toBeCloseTo((60 / 45) * 1.3, 5);
    expect(factorFondoMueble(100)).toBeCloseTo((60 / 45) * 2, 5);
    expect(precioMuebleBano(750000, 60, 60)).toBe(1000000);
  });
  it("mesón de piedra: por ml con el precio de los mesones de cocina", () => {
    expect(precioMesonBano("granito", 100, 55)).toBe(750000);
    expect(precioMesonBano("granito", 100, 80)).toBe(975000); // +30 %
  });
  it("excavado desde 1,30 m puede llevar 2 pocetas: la segunda cobra un valor fijo ($400.000)", () => {
    const uno = precioExcavadoBano(1500000, 255, 55, 1);
    const dos = precioExcavadoBano(1500000, 255, 55, 2);
    expect(dos.uno).toBe(uno.uno);
    expect(dos.segunda).toBe(400000);
    expect(dos.total).toBe(uno.total + 400000);
    expect(precioExcavadoBano(1500000, 100, 55, 2).segunda).toBe(0); // menos de 1,30 m: una sola poceta
    expect(precioExcavadoBano(1500000, 255, 55, 2, 450000).segunda).toBe(450000); // el valor sale del Motor
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
