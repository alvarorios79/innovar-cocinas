import { describe, it, expect } from "vitest";
import { lineasCloset } from "../shared/closetTexto";
import { componentesMarcados } from "../shared/closetComponentes";

describe("Closet: componentes, cantidades y concepto abierto", () => {
  it("escribe cantidades en plural y el concepto abierto", () => {
    const lineas = lineasCloset({ type: "estandar", width: 3.15, height: 2.4, squareMeters: 7.56, doorType: "abierto",
      accessories: { cajoneroTriple: true, cajonero4: true, esquineroCuadrado: true, dobleColgadero: true }, cantidades: { cajoneroTriple: 2 } });
    const t = lineas.join("\n");
    expect(t).toContain("Concepto abierto: sin puertas, con regrueso en los cantos");
    expect(t).toContain("• 2 cajoneros triples");
    expect(t).toContain("• Cajonero de 4 cajones");
    expect(t).toContain("• Estantería esquinera cuadrada");
  });
  it("las cotizaciones antiguas (sin casillas nuevas) siguen igual", () => {
    expect(componentesMarcados({ maletero: true, zapatero: true })).toEqual(["Zapatero", "Maletero"]);
    const viejo = lineasCloset({ type: "premium", width: 2, height: 2.4, squareMeters: 4.8, doorType: "corredizas", accessories: {} }).join("\n");
    expect(viejo).toContain("• Maletero");
    expect(viejo).toContain("• Doble cajonero");
  });
});
